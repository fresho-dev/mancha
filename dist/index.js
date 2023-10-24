"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mancha = void 0;
const fs = require("fs");
const parse5 = require("parse5");
const path = require("path");
var Mancha;
(function (Mancha) {
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
        return new Promise((resolve) => {
            const explored = [];
            const frontier = Array.isArray(tree) ? tree : [tree];
            while (frontier.length) {
                const node = frontier.pop();
                explored.push(node);
                if (node.childNodes) {
                    node.childNodes.forEach((node) => frontier.push(node));
                }
            }
            resolve(explored);
        });
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
    Mancha.encodeHtmlAttrib = encodeHtmlAttrib;
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
    Mancha.decodeHtmlAttrib = decodeHtmlAttrib;
    function preprocess(content, vars, wwwroot) {
        // Add the root relative to this file as a variable
        const newvars = Object.assign({ wwwroot: wwwroot }, vars);
        // Replace all {{variables}}
        Object.keys(newvars).forEach((key) => {
            content = content.replace(new RegExp(`{{${key}}}`, "g"), newvars[key]);
        });
        return content;
    }
    Mancha.preprocess = preprocess;
    function renderContent(content, vars = {}, root = ".", wwwroot = ".", encoding = "utf8") {
        return new Promise((resolve, reject) => {
            const preprocessed = preprocess(content, vars, wwwroot);
            const document = parseDocument(preprocessed);
            traverse(document.childNodes.map((node) => node))
                .then((nodes) => {
                const promises = nodes.map((node) => {
                    return new Promise((resolve, reject) => {
                        if (node.nodeName === "include") {
                            const attribs = node.attrs.reduce((dict, attr) => {
                                dict[attr.name] = attr.value;
                                return dict;
                            }, {});
                            // If the node has a vars attribute, it overrides our current vars
                            // NOTE: this will propagate to all subsequent calls to render,
                            //  including nested calls
                            if (attribs.hasOwnProperty("data-vars")) {
                                vars = Object.assign({}, vars, JSON.parse(decodeHtmlAttrib(attribs["data-vars"])));
                            }
                            // Case 1: we render the fragment by including another file
                            if (attribs["src"]) {
                                const fname = path.join(root, attribs["src"]);
                                const newroot = path.dirname(fname);
                                const contents = fs.readFileSync(fname, encoding);
                                renderContent(contents, vars, newroot, wwwroot, encoding)
                                    .then((content) => {
                                    const docfragment = parse5.parseFragment(content);
                                    replaceNodeWith(node, docfragment.childNodes);
                                    resolve();
                                })
                                    .catch((err) => reject(err));
                            }
                            else {
                                reject(new Error(`"src" attribute missing from ${JSON.stringify(node)}`));
                            }
                        }
                        else {
                            resolve();
                        }
                    });
                });
                return Promise.all(promises);
            })
                .then(() => {
                const result = parse5.serialize(document);
                // Render until there are no changes
                if (result === preprocessed) {
                    resolve(parse5.serialize(document));
                }
                else {
                    renderContent(result, vars, root, wwwroot, encoding).then(resolve).catch(reject);
                }
            })
                .catch(reject);
        });
    }
    Mancha.renderContent = renderContent;
})(Mancha || (exports.Mancha = Mancha = {}));
