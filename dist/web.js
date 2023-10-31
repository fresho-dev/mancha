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
exports.renderRemotePath = exports.renderLocalPath = exports.renderContent = exports.preprocess = exports.decodeHtmlAttrib = exports.encodeHtmlAttrib = void 0;
const parse5 = require("parse5");
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
function isDocument(content) {
    return /^[\n\r\s]*<(!doctype|html|head|body)\b/i.test(content);
}
function parseDocument(content) {
    return isDocument(content)
        ? parse5.parse(content)
        : parse5.parseFragment(content);
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
        content = content.replace(new RegExp(`{{${key}}}`, "g"), vars[key]);
    });
    return content;
}
exports.preprocess = preprocess;
function renderContent(content, vars = {}, fsroot = ".", maxdepth = 10, _renderLocalPathFunc = renderLocalPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const preprocessed = preprocess(content, vars);
        const document = parseDocument(preprocessed);
        const renderings = traverse(document.childNodes.map((node) => node))
            .filter((node) => node.nodeName === "include")
            .map((node) => __awaiter(this, void 0, void 0, function* () {
            const attribs = node.attrs.reduce((dict, attr) => {
                dict[attr.name] = attr.value;
                return dict;
            }, {});
            // If the node has a vars attribute, it overrides our current vars.
            // NOTE: this will propagate to all subsequent render calls, including nested calls.
            if (attribs.hasOwnProperty("data-vars")) {
                vars = Object.assign({}, vars, JSON.parse(decodeHtmlAttrib(attribs["data-vars"])));
            }
            // Early exit: <include> tags must have a src attribute.
            if (!attribs["src"]) {
                throw new Error(`"src" attribute missing from ${JSON.stringify(node)}`);
            }
            // The included file will replace this tag.
            const handler = (content) => {
                const docfragment = parse5.parseFragment(content);
                replaceNodeWith(node, docfragment.childNodes);
            };
            // Case 1: Absolute remote path.
            if (attribs["src"].indexOf("://") !== -1) {
                yield renderRemotePath(attribs["src"], vars).then(handler);
                // Case 2: Relative remote path.
            }
            else if (fsroot.indexOf("://") !== -1) {
                const relpath = `${fsroot}/${attribs["src"]}`;
                yield renderRemotePath(relpath, vars).then(handler);
                // Case 3: Local absolute path.
            }
            else if (attribs["src"].charAt(0) === "/") {
                yield _renderLocalPathFunc(attribs["src"], vars).then(handler);
                // Case 4: Local relative path.
            }
            else {
                const relpath = path.join(fsroot, attribs["src"]);
                yield _renderLocalPathFunc(relpath, vars).then(handler);
            }
        }));
        // Wait for all the rendering operations to complete.
        yield Promise.all(renderings);
        // The document has now been modified and can be re-serialized.
        const result = parse5.serialize(document);
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
        return renderContent(content, vars, path.dirname(fpath));
    });
}
exports.renderRemotePath = renderRemotePath;
