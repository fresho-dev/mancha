"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePath = exports.folderPath = exports.renderRemotePath = exports.renderLocalPath = exports.renderContent = exports.datasetAttributes = exports.preprocess = exports.decodeHtmlAttrib = exports.encodeHtmlAttrib = void 0;
const dom_serializer_1 = require("dom-serializer");
const htmlparser2 = require("htmlparser2");
const path = require("path-browserify");
function replaceNodeWith(original, replacement) {
    const elem = original;
    const parent = elem.parentNode;
    const index = parent.childNodes.indexOf(elem);
    replacement.forEach((elem) => (elem.parentNode = parent));
    parent.childNodes = []
        .concat(parent.childNodes.slice(0, index))
        .concat(replacement)
        .concat(parent.childNodes.slice(index + 1));
}
function parseDocument(content) {
    return htmlparser2.parseDocument(content);
}
function traverse(tree) {
    const explored = [];
    const frontier = Array.isArray(tree) ? tree : [tree];
    while (frontier.length) {
        const node = frontier.pop();
        explored.push(node);
        if (node.childNodes) {
            node.childNodes.forEach((node) => frontier.push(node));
        }
    }
    return explored;
}
function getElementAttribute(elem, key) {
    for (const attr of elem.attributes) {
        if (attr.name === key)
            return attr.value;
    }
    return null;
}
/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
function encodeHtmlAttrib(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&apos;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r\n/g, "&#13;")
        .replace(/[\r\n]/g, "&#13;");
}
exports.encodeHtmlAttrib = encodeHtmlAttrib;
/** Inverse the operation of [encodeHtmlAttrib] */
function decodeHtmlAttrib(value) {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#13;/g, "\n");
}
exports.decodeHtmlAttrib = decodeHtmlAttrib;
function preprocess(content, vars) {
    // Replace all {{variables}}.
    Object.keys(vars).forEach((key) => {
        content = content.replace(new RegExp(`{{\\s?${key}\\s?}}`, "g"), vars[key]);
    });
    return content;
}
exports.preprocess = preprocess;
function datasetAttributes(attributes) {
    return Array.from(attributes)
        .filter((attr) => attr.name.startsWith("data-"))
        .reduce((dict, attr) => {
        dict[attr.name.substring("data-".length)] = attr.value;
        return dict;
    }, {});
}
exports.datasetAttributes = datasetAttributes;
function renderContent(content, vars = {}, fsroot = null, maxdepth = 10, _renderLocalPathFunc = renderLocalPath) {
    return __awaiter(this, void 0, void 0, function* () {
        fsroot = fsroot || folderPath(self.location.href);
        const preprocessed = preprocess(content, vars);
        const document = parseDocument(preprocessed);
        const childNodes = Array.from(document.childNodes);
        const renderings = traverse(childNodes.map((node) => node))
            .filter((node) => node.name === "include")
            .map((node) => __awaiter(this, void 0, void 0, function* () {
            const src = getElementAttribute(node, "src");
            const dataset = datasetAttributes(node.attributes);
            // Add all the data-* attributes as properties to current vars.
            // NOTE: this will propagate to all subsequent render calls, including nested calls.
            Object.keys(dataset).forEach((key) => (vars[key] = decodeHtmlAttrib(dataset[key])));
            // Early exit: <include> tags must have a src attribute.
            if (!src) {
                throw new Error(`"src" attribute missing from ${node}.`);
            }
            // The included file will replace this tag.
            const handler = (content) => {
                replaceNodeWith(node, parseDocument(content).childNodes);
            };
            // Case 1: Absolute remote path.
            if (src.indexOf("://") !== -1) {
                yield renderRemotePath(src, vars).then(handler);
                // Case 2: Relative remote path.
            }
            else if ((fsroot === null || fsroot === void 0 ? void 0 : fsroot.indexOf("://")) !== -1) {
                const relpath = `${fsroot}/${src}`;
                yield renderRemotePath(relpath, vars).then(handler);
                // Case 3: Local absolute path.
            }
            else if (src.charAt(0) === "/") {
                yield _renderLocalPathFunc(src, vars).then(handler);
                // Case 4: Local relative path.
            }
            else {
                const relpath = path.join(fsroot, src);
                yield _renderLocalPathFunc(relpath, vars).then(handler);
            }
        }));
        // Wait for all the rendering operations to complete.
        yield Promise.all(renderings);
        // The document has now been modified and can be re-serialized.
        const result = (0, dom_serializer_1.render)(document);
        // Re-render until no changes are made.
        if (renderings.length === 0) {
            return result;
        }
        else if (maxdepth === 0) {
            throw new Error("Maximum recursion depth reached.");
        }
        else {
            return renderContent(result, vars, fsroot, maxdepth--);
        }
    });
}
exports.renderContent = renderContent;
function renderLocalPath(fpath, vars = {}, encoding = "utf8") {
    return __awaiter(this, void 0, void 0, function* () {
        throw new Error("renderLocalPath() not supported on web.");
    });
}
exports.renderLocalPath = renderLocalPath;
function renderRemotePath(fpath, vars = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield fetch(fpath).then((res) => res.text());
        return renderContent(content, vars, folderPath(fpath));
    });
}
exports.renderRemotePath = renderRemotePath;
function folderPath(fpath) {
    if (fpath.endsWith("/")) {
        return fpath.slice(0, -1);
    }
    else {
        return path.dirname(fpath);
    }
}
exports.folderPath = folderPath;
function resolvePath(fpath) {
    if (fpath.includes("://")) {
        const [scheme, remotePath] = fpath.split("://", 2);
        return `${scheme}://${resolvePath("/" + remotePath).substring(1)}`;
    }
    else {
        return path.resolve(fpath);
    }
}
exports.resolvePath = resolvePath;
