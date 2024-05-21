"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRenderer = exports.safeEval = exports.makeEvalFunction = exports.isRelativePath = exports.dirname = exports.traverse = void 0;
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
function makeEvalFunction(code, args = []) {
    return new Function(...args, `with (this) { return (async () => (${code}))(); }`);
}
exports.makeEvalFunction = makeEvalFunction;
function safeEval(context, code, args = {}) {
    const inner = `with (this) { return (async () => (${code}))(); }`;
    return new Function(...Object.keys(args), inner).call(context, ...Object.values(args));
}
exports.safeEval = safeEval;
class IRenderer extends reactive_1.ReactiveProxyStore {
    debugging = false;
    dirpath = "";
    evalkeys = ["$elem", "$event"];
    expressionCache = new Map();
    evalCallbacks = new Map();
    skipNodes = new Set();
    debug(flag) {
        this.debugging = flag;
        return this;
    }
    async fetchRemote(fpath, params) {
        return fetch(fpath, { cache: params?.cache ?? "default" }).then((res) => res.text());
    }
    async fetchLocal(fpath, params) {
        return this.fetchRemote(fpath, params);
    }
    async preprocessString(content, params) {
        this.log("Preprocessing string content with params:\n", params);
        const fragment = this.parseHTML(content, params);
        await this.preprocessNode(fragment, params);
        return fragment;
    }
    async preprocessLocal(fpath, params) {
        const content = await this.fetchLocal(fpath, params);
        return this.preprocessString(content, {
            ...params,
            dirpath: dirname(fpath),
            root: params?.root ?? !fpath.endsWith(".tpl.html"),
        });
    }
    async preprocessRemote(fpath, params) {
        const cache = params?.cache || "default";
        const content = await fetch(fpath, { cache }).then((res) => res.text());
        return this.preprocessString(content, {
            ...params,
            dirpath: dirname(fpath),
            root: params?.root ?? !fpath.endsWith(".tpl.html"),
        });
    }
    clone() {
        return new this.constructor(Object.fromEntries(this.store.entries()));
    }
    log(...args) {
        if (this.debugging)
            console.debug(...args);
    }
    cachedExpressionFunction(expr) {
        if (!this.expressionCache.has(expr)) {
            this.expressionCache.set(expr, makeEvalFunction(expr, this.evalkeys));
        }
        return this.expressionCache.get(expr);
    }
    async eval(expr, args = {}) {
        const fn = this.cachedExpressionFunction(expr);
        const vals = this.evalkeys.map((key) => args[key]);
        if (Object.keys(args).some((key) => !this.evalkeys.includes(key))) {
            throw new Error(`Invalid argument key, must be one of: ${this.evalkeys.join(", ")}`);
        }
        const [result, dependencies] = await this.trace(async function () {
            return fn.call(this, ...vals);
        });
        this.log(`eval \`${expr}\` => `, result, `[ ${dependencies.join(", ")} ]`);
        return [result, dependencies];
    }
    async watchExpr(expr, args, callback) {
        // Early exit: this eval has already been registered, we just need to add our callback.
        if (this.evalCallbacks.has(expr)) {
            this.evalCallbacks.get(expr)?.push(callback);
            // Trigger the eval manually upon registration, to ensure the callback is called immediately.
            return this.eval(expr, args).then(([result, dependencies]) => callback(result, dependencies));
        }
        // Otherwise, register the callback provided.
        this.evalCallbacks.set(expr, [callback]);
        // Keep track of dependencies each evaluation.
        const prevdeps = [];
        const inner = async () => {
            // Evaluate the expression first.
            const [result, dependencies] = await this.eval(expr, args);
            // Trigger all registered callbacks.
            const callbacks = this.evalCallbacks.get(expr) || [];
            await Promise.all(callbacks.map((x) => x(result, dependencies)));
            // Watch the dependencies for changes.
            if (prevdeps.length > 0)
                this.unwatch(prevdeps, inner);
            prevdeps.splice(0, prevdeps.length, ...dependencies);
            this.watch(dependencies, inner);
        };
        return inner();
    }
    async preprocessNode(root, params) {
        params = Object.assign({ dirpath: this.dirpath, maxdepth: 10 }, params);
        const promises = new iterator_1.Iterator(traverse(root, this.skipNodes)).map(async (node) => {
            this.log("Preprocessing node:\n", node);
            // Resolve all the includes in the node.
            await plugins_1.RendererPlugins.resolveIncludes.call(this, node, params);
            // Resolve all the relative paths in the node.
            await plugins_1.RendererPlugins.rebaseRelativePaths.call(this, node, params);
        });
        // Wait for all the rendering operations to complete.
        await Promise.all(promises.generator());
    }
    async renderNode(root, params) {
        // Iterate over all the nodes and apply appropriate handlers.
        // Do these steps one at a time to avoid any potential race conditions.
        for (const node of traverse(root, this.skipNodes)) {
            this.log("Rendering node:\n", node);
            // Resolve the :data attribute in the node.
            await plugins_1.RendererPlugins.resolveDataAttribute.call(this, node, params);
            // Resolve the :for attribute in the node.
            await plugins_1.RendererPlugins.resolveForAttribute.call(this, node, params);
            // Resolve the $html attribute in the node.
            await plugins_1.RendererPlugins.resolveHtmlAttribute.call(this, node, params);
            // Resolve the :show attribute in the node.
            await plugins_1.RendererPlugins.resolveShowAttribute.call(this, node, params);
            // Resolve the @watch attribute in the node.
            await plugins_1.RendererPlugins.resolveWatchAttribute.call(this, node, params);
            // Resolve the :bind attribute in the node.
            await plugins_1.RendererPlugins.resolveBindAttribute.call(this, node, params);
            // Resolve all $attributes in the node.
            await plugins_1.RendererPlugins.resolvePropAttributes.call(this, node, params);
            // Resolve all :attributes in the node.
            await plugins_1.RendererPlugins.resolveAttrAttributes.call(this, node, params);
            // Resolve all @attributes in the node.
            await plugins_1.RendererPlugins.resolveEventAttributes.call(this, node, params);
            // Replace all the {{ variables }} in the text.
            await plugins_1.RendererPlugins.resolveTextNodeExpressions.call(this, node, params);
        }
    }
    async mount(root, params) {
        // Preprocess all the elements recursively first.
        await this.preprocessNode(root, params);
        // Now that the DOM is complete, render all the nodes.
        await this.renderNode(root, params);
    }
}
exports.IRenderer = IRenderer;
