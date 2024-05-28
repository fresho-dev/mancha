import { ReactiveProxyStore } from "./reactive.js";
import { Iterator } from "./iterator.js";
import { RendererPlugins } from "./plugins.js";
export function* traverse(root, skip = new Set()) {
    const explored = new Set();
    const frontier = Array.from(root.childNodes).filter((node) => !skip.has(node));
    // Also yield the root node.
    yield root;
    while (frontier.length) {
        const node = frontier.shift();
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
export function dirname(fpath) {
    if (!fpath.includes("/")) {
        return "";
    }
    else {
        return fpath.split("/").slice(0, -1).join("/");
    }
}
export function isRelativePath(fpath) {
    return (!fpath.includes("://") &&
        !fpath.startsWith("/") &&
        !fpath.startsWith("#") &&
        !fpath.startsWith("data:"));
}
export function makeEvalFunction(code, args = []) {
    return new Function(...args, `with (this) { return (async () => (${code}))(); }`);
}
export class IRenderer extends ReactiveProxyStore {
    debugging = false;
    dirpath = "";
    evalkeys = ["$elem", "$event"];
    expressionCache = new Map();
    evalCallbacks = new Map();
    _skipNodes = new Set();
    _customElements = new Map();
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
        const fetchOptions = {};
        if (params?.cache)
            fetchOptions.cache = params.cache;
        const content = await fetch(fpath, fetchOptions).then((res) => res.text());
        return this.preprocessString(content, {
            ...params,
            dirpath: dirname(fpath),
            root: params?.root ?? !fpath.endsWith(".tpl.html"),
        });
    }
    clone() {
        const instance = new this.constructor(Object.fromEntries(this.store.entries()));
        // Custom elements are shared across all instances.
        instance._customElements = this._customElements;
        return instance.debug(this.debugging);
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
        if (this.store.has(expr)) {
            // Shortcut: if the expression is just an item from the value store, use that directly.
            const result = this.get(expr);
            return [result, [expr]];
        }
        else {
            // Otherwise, perform the expression evaluation.
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
    }
    watchExpr(expr, args, callback) {
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
        const promises = new Iterator(traverse(root, this._skipNodes)).map(async (node) => {
            this.log("Preprocessing node:\n", node);
            // Resolve all the includes in the node.
            await RendererPlugins.resolveIncludes.call(this, node, params);
            // Resolve all the relative paths in the node.
            await RendererPlugins.rebaseRelativePaths.call(this, node, params);
            // Register all the custom elements in the node.
            await RendererPlugins.registerCustomElements.call(this, node, params);
            // Resolve all the custom elements in the node.
            await RendererPlugins.resolveCustomElements.call(this, node, params);
        });
        // Wait for all the rendering operations to complete.
        await Promise.all(promises.generator());
        // Return the input node, which should now be fully preprocessed.
        return root;
    }
    async renderNode(root, params) {
        // Iterate over all the nodes and apply appropriate handlers.
        // Do these steps one at a time to avoid any potential race conditions.
        for (const node of traverse(root, this._skipNodes)) {
            this.log("Rendering node:\n", node);
            // Resolve the :data attribute in the node.
            await RendererPlugins.resolveDataAttribute.call(this, node, params);
            // Resolve the :for attribute in the node.
            await RendererPlugins.resolveForAttribute.call(this, node, params);
            // Resolve the $text attribute in the node.
            await RendererPlugins.resolveTextAttributes.call(this, node, params);
            // Resolve the $html attribute in the node.
            await RendererPlugins.resolveHtmlAttribute.call(this, node, params);
            // Resolve the :show attribute in the node.
            await RendererPlugins.resolveShowAttribute.call(this, node, params);
            // Resolve the @watch attribute in the node.
            await RendererPlugins.resolveWatchAttribute.call(this, node, params);
            // Resolve the :bind attribute in the node.
            await RendererPlugins.resolveBindAttribute.call(this, node, params);
            // Resolve all $attributes in the node.
            await RendererPlugins.resolvePropAttributes.call(this, node, params);
            // Resolve all :attributes in the node.
            await RendererPlugins.resolveAttrAttributes.call(this, node, params);
            // Resolve all @attributes in the node.
            await RendererPlugins.resolveEventAttributes.call(this, node, params);
            // Replace all the {{ variables }} in the text.
            await RendererPlugins.resolveTextNodeExpressions.call(this, node, params);
        }
        // Return the input node, which should now be fully rendered.
        return root;
    }
    async mount(root, params) {
        // Preprocess all the elements recursively first.
        await this.preprocessNode(root, params);
        // Now that the DOM is complete, render all the nodes.
        await this.renderNode(root, params);
    }
}
