import { Iterator } from "./iterator.js";
import { RendererPlugins } from "./plugins.js";
import { dirname, nodeToString, traverse } from "./dome.js";
import { SignalStore } from "./store.js";
/**
 * Represents an abstract class for rendering and manipulating HTML content.
 * Extends the `ReactiveProxyStore` class.
 */
export class IRenderer extends SignalStore {
    debugging = false;
    dirpath = "";
    _skipNodes = new Set();
    _customElements = new Map();
    /**
     * Sets the debugging flag for the current instance.
     *
     * @param flag - The flag indicating whether debugging is enabled or disabled.
     * @returns The current instance of the class.
     */
    debug(flag) {
        this.debugging = flag;
        return this;
    }
    /**
     * Fetches the remote file at the specified path and returns its content as a string.
     * @param fpath - The path of the remote file to fetch.
     * @param params - Optional parameters for the fetch operation.
     * @returns A promise that resolves to the content of the remote file as a string.
     */
    async fetchRemote(fpath, params) {
        return fetch(fpath, { cache: params?.cache ?? "default" }).then((res) => res.text());
    }
    /**
     * Fetches a local path and returns its content as a string.
     *
     * @param fpath - The file path of the resource.
     * @param params - Optional render parameters.
     * @returns A promise that resolves to the fetched resource as a string.
     */
    async fetchLocal(fpath, params) {
        return this.fetchRemote(fpath, params);
    }
    /**
     * Preprocesses a string content with optional rendering and parsing parameters.
     *
     * @param content - The string content to preprocess.
     * @param params - Optional rendering and parsing parameters.
     * @returns A promise that resolves to a DocumentFragment representing the preprocessed content.
     */
    async preprocessString(content, params) {
        this.log("Preprocessing string content with params:\n", params);
        const fragment = this.parseHTML(content, params);
        await this.preprocessNode(fragment, params);
        return fragment;
    }
    /**
     * Preprocesses a remote file by fetching its content and applying preprocessing steps.
     * @param fpath - The path to the remote file.
     * @param params - Optional parameters for rendering and parsing.
     * @returns A Promise that resolves to a DocumentFragment representing the preprocessed content.
     */
    async preprocessRemote(fpath, params) {
        const fetchOptions = {};
        if (params?.cache)
            fetchOptions.cache = params.cache;
        const content = await fetch(fpath, fetchOptions).then((res) => res.text());
        return this.preprocessString(content, {
            ...params,
            dirpath: dirname(fpath),
            rootDocument: params?.rootDocument ?? !fpath.endsWith(".tpl.html"),
        });
    }
    /**
     * Preprocesses a local file by fetching its content and applying preprocessing steps.
     * @param fpath - The path to the local file.
     * @param params - Optional parameters for rendering and parsing.
     * @returns A promise that resolves to the preprocessed document fragment.
     */
    async preprocessLocal(fpath, params) {
        const content = await this.fetchLocal(fpath, params);
        return this.preprocessString(content, {
            ...params,
            dirpath: dirname(fpath),
            rootDocument: params?.rootDocument ?? !fpath.endsWith(".tpl.html"),
        });
    }
    /**
     * Creates a subrenderer from the current renderer instance.
     * @returns A new instance of the renderer with the same state as the original.
     */
    subrenderer() {
        const instance = new this.constructor().debug(this.debugging);
        // Attach ourselves as the parent of the new instance.
        instance.set("$parent", this.$);
        // Custom elements are shared across all instances.
        instance._customElements = this._customElements;
        return instance;
    }
    /**
     * Logs the provided arguments if debugging is enabled.
     * @param args - The arguments to be logged.
     */
    log(...args) {
        if (this.debugging)
            console.debug(...args);
    }
    /**
     * Preprocesses a node by applying all the registered preprocessing plugins.
     *
     * @template T - The type of the input node.
     * @param {T} root - The root node to preprocess.
     * @param {RenderParams} [params] - Optional parameters for preprocessing.
     * @returns {Promise<T>} - A promise that resolves to the preprocessed node.
     */
    async preprocessNode(root, params) {
        params = { dirpath: this.dirpath, maxdepth: 10, ...params };
        const promises = new Iterator(traverse(root, this._skipNodes)).map(async (node) => {
            this.log("Preprocessing node:\n", nodeToString(node, 128));
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
    /**
     * Renders the node by applies all the registered rendering plugins.
     *
     * @template T - The type of the root node (Document, DocumentFragment, or Node).
     * @param {T} root - The root node to render.
     * @param {RenderParams} [params] - Optional parameters for rendering.
     * @returns {Promise<T>} - A promise that resolves to the fully rendered root node.
     */
    async renderNode(root, params) {
        // Iterate over all the nodes and apply appropriate handlers.
        // Do these steps one at a time to avoid any potential race conditions.
        for (const node of traverse(root, this._skipNodes)) {
            this.log("Rendering node:\n", nodeToString(node, 128));
            // Resolve the :data attribute in the node.
            await RendererPlugins.resolveDataAttribute.call(this, node, params);
            // Resolve the :for attribute in the node.
            await RendererPlugins.resolveForAttribute.call(this, node, params);
            // Resolve the :text attribute in the node.
            await RendererPlugins.resolveTextAttributes.call(this, node, params);
            // Resolve the :html attribute in the node.
            await RendererPlugins.resolveHtmlAttribute.call(this, node, params);
            // Resolve the :show attribute in the node.
            await RendererPlugins.resolveShowAttribute.call(this, node, params);
            // Resolve the :class attribute in the node.
            await RendererPlugins.resolveClassAttribute.call(this, node, params);
            // Resolve the :bind attribute in the node.
            await RendererPlugins.resolveBindAttribute.call(this, node, params);
            // Resolve all :on:event attributes in the node.
            await RendererPlugins.resolveEventAttributes.call(this, node, params);
            // Replace all the {{ variables }} in the text.
            await RendererPlugins.resolveTextNodeExpressions.call(this, node, params);
            // Resolve the :{attr} attribute in the node.
            await RendererPlugins.resolveCustomAttribute.call(this, node, params);
        }
        // Return the input node, which should now be fully rendered.
        return root;
    }
    /**
     * Mounts the Mancha application to a root element in the DOM.
     *
     * @param root - The root element to mount the application to.
     * @param params - Optional parameters for rendering the application.
     * @returns A promise that resolves when the mounting process is complete.
     */
    async mount(root, params) {
        params = { ...params, rootNode: root };
        // Preprocess all the elements recursively first.
        await this.preprocessNode(root, params);
        // Now that the DOM is complete, render all the nodes.
        await this.renderNode(root, params);
        // Attach ourselves to the HTML node.
        root.renderer = this;
    }
}
