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
exports.IRenderer = exports.safeEval = exports.isRelativePath = exports.dirname = exports.traverse = void 0;
const reactive_1 = require("./reactive");
const iterator_1 = require("./iterator");
const plugins_1 = require("./plugins");
function* traverse(root, skip = new Set()) {
    const explored = new Set();
    const frontier = Array.from(root.childNodes).filter((node) => !skip.has(node));
    // Also yield the root node.
    yield root;
    while (frontier.length) {
        const node = frontier.pop();
        if (!explored.has(node)) {
            explored.add(node);
            yield node;
        }
        if (node.childNodes) {
            Array.from(node.childNodes)
                .filter((node) => !skip.has(node))
                .forEach((node) => frontier.push(node));
        }
    }
}
exports.traverse = traverse;
function dirname(fpath) {
    if (!fpath.includes("/")) {
        return "";
    }
    else {
        return fpath.split("/").slice(0, -1).join("/");
    }
}
exports.dirname = dirname;
function isRelativePath(fpath) {
    return (!fpath.includes("://") &&
        !fpath.startsWith("/") &&
        !fpath.startsWith("#") &&
        !fpath.startsWith("data:"));
}
exports.isRelativePath = isRelativePath;
function safeEval(code, context, args = {}) {
    const inner = `with (this) { return (async () => (${code}))(); }`;
    return new Function(...Object.keys(args), inner).call(context, ...Object.values(args));
}
exports.safeEval = safeEval;
class IRenderer extends reactive_1.ReactiveProxyStore {
    constructor() {
        super(...arguments);
        this.debugging = false;
        this.dirpath = "";
        this.skipNodes = new Set();
    }
    debug(flag) {
        this.debugging = flag;
        return this;
    }
    fetchRemote(fpath, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return fetch(fpath, { cache: (_a = params === null || params === void 0 ? void 0 : params.cache) !== null && _a !== void 0 ? _a : "default" }).then((res) => res.text());
        });
    }
    fetchLocal(fpath, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchRemote(fpath, params);
        });
    }
    preprocessString(content, params) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Preprocessing string content with params:\n", params);
            const fragment = this.parseHTML(content, params);
            yield this.preprocessNode(fragment, params);
            return fragment;
        });
    }
    preprocessLocal(fpath, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const content = yield this.fetchLocal(fpath, params);
            return this.preprocessString(content, Object.assign(Object.assign({}, params), { dirpath: dirname(fpath), root: (_a = params === null || params === void 0 ? void 0 : params.root) !== null && _a !== void 0 ? _a : !fpath.endsWith(".tpl.html") }));
        });
    }
    preprocessRemote(fpath, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const cache = (params === null || params === void 0 ? void 0 : params.cache) || "default";
            const content = yield fetch(fpath, { cache }).then((res) => res.text());
            return this.preprocessString(content, Object.assign(Object.assign({}, params), { dirpath: dirname(fpath), root: (_a = params === null || params === void 0 ? void 0 : params.root) !== null && _a !== void 0 ? _a : !fpath.endsWith(".tpl.html") }));
        });
    }
    clone() {
        return new this.constructor(Object.fromEntries(this.store.entries()));
    }
    log(...args) {
        if (this.debugging)
            console.debug(...args);
    }
    eval(expr_1) {
        return __awaiter(this, arguments, void 0, function* (expr, args = {}, callback) {
            // TODO: Add expression to cache.
            const prevdeps = [];
            const inner = () => __awaiter(this, void 0, void 0, function* () {
                const [result, dependencies] = yield this.trace(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const result = yield safeEval(expr, this, Object.assign({}, args));
                        return result;
                    });
                });
                this.log(`eval \`${expr}\` => `, result, `[ ${dependencies.join(", ")} ]`);
                // Watch all the dependencies for changes when a callback is provided.
                if (callback) {
                    if (prevdeps.length > 0)
                        this.unwatch(prevdeps, inner);
                    prevdeps.splice(0, prevdeps.length, ...dependencies);
                    this.watch(dependencies, inner);
                    yield (callback === null || callback === void 0 ? void 0 : callback(result, dependencies));
                }
                // Return the result and the dependencies directly for convenience.
                return [result, dependencies];
            });
            return inner();
        });
    }
    preprocessNode(root, params) {
        return __awaiter(this, void 0, void 0, function* () {
            params = Object.assign({ dirpath: this.dirpath, maxdepth: 10 }, params);
            const promises = new iterator_1.Iterator(traverse(root, this.skipNodes)).map((node) => __awaiter(this, void 0, void 0, function* () {
                this.log("Preprocessing node:\n", node);
                // Resolve all the includes in the node.
                yield plugins_1.resolveIncludes.call(this, node, params);
                // Resolve all the relative paths in the node.
                yield plugins_1.rebaseRelativePaths.call(this, node, params);
            }));
            // Wait for all the rendering operations to complete.
            yield Promise.all(promises.generator());
        });
    }
    renderNode(root, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // Iterate over all the nodes and apply appropriate handlers.
            // Do these steps one at a time to avoid any potential race conditions.
            for (const node of traverse(root, this.skipNodes)) {
                this.log("Rendering node:\n", node);
                // Resolve the :data attribute in the node.
                yield plugins_1.resolveDataAttribute.call(this, node, params);
                // Resolve the :for attribute in the node.
                yield plugins_1.resolveForAttribute.call(this, node, params);
                // Resolve the $html attribute in the node.
                yield plugins_1.resolveHtmlAttribute.call(this, node, params);
                // Resolve the :show attribute in the node.
                yield plugins_1.resolveShowAttribute.call(this, node, params);
                // Resolve the @watch attribute in the node.
                yield plugins_1.resolveWatchAttribute.call(this, node, params);
                // Resolve the :bind attribute in the node.
                yield plugins_1.resolveBindAttribute.call(this, node, params);
                // Resolve all $attributes in the node.
                yield plugins_1.resolvePropAttributes.call(this, node, params);
                // Resolve all :attributes in the node.
                yield plugins_1.resolveAttrAttributes.call(this, node, params);
                // Resolve all @attributes in the node.
                yield plugins_1.resolveEventAttributes.call(this, node, params);
                // Replace all the {{ variables }} in the text.
                yield plugins_1.resolveTextNodeExpressions.call(this, node, params);
            }
        });
    }
    mount(root, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // Preprocess all the elements recursively first.
            yield this.preprocessNode(root, params);
            // Now that the DOM is complete, render all the nodes.
            yield this.renderNode(root, params);
        });
    }
}
exports.IRenderer = IRenderer;
