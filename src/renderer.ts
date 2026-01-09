import { dirname, nodeToString, setProperty, traverse } from "./dome.js";
import type { ParserParams, RenderParams } from "./interfaces.js";
import { Iterator } from "./iterator.js";
import { RendererPlugins } from "./plugins.js";
import { setupQueryParamBindings } from "./query.js";
import type { StoreState } from "./store.js";
import { SignalStore } from "./store.js";

export type EvalListener = (result: unknown, dependencies: string[]) => unknown;

/**
 * Represents an abstract class for rendering and manipulating HTML content.
 * Extends the `ReactiveProxyStore` class.
 *
 * @template T - The type of the store state. Defaults to `StoreState`.
 */
export abstract class IRenderer<T extends StoreState = StoreState> extends SignalStore<T> {
	abstract readonly impl: string;
	protected debugging: boolean = false;
	protected readonly dirpath: string = "";
	readonly _skipNodes: Set<Node> = new Set();
	readonly _customElements: Map<string, Node> = new Map();

	/**
	 * Queue for retrying failed element.value assignments.
	 *
	 * Some DOM elements (notably <select>) silently fail when setting .value if
	 * the required child elements don't exist yet. For example, setting
	 * select.value = "banana" does nothing if no <option value="banana"> exists.
	 *
	 * This happens when :bind on a parent element runs before :for on child
	 * elements creates those children (due to BFS traversal order).
	 *
	 * The fix: after setting .value, check if it actually worked. If not, queue
	 * a retry callback. These callbacks are executed at the end of renderNode()
	 * after all child elements have been created.
	 */
	readonly _pendingValueRetries: Array<() => void> = [];
	abstract parseHTML(content: string, params?: ParserParams): Document | DocumentFragment;
	abstract serializeHTML(root: DocumentFragment | Node): string;
	abstract createElement(tag: string, owner?: Document | null): Element;
	abstract createComment(content: string, owner?: Document | null): Node;
	abstract textContent(node: Node, tag: string): void;

	/**
	 * Sets the debugging flag for the current instance.
	 *
	 * @param flag - The flag indicating whether debugging is enabled or disabled.
	 * @returns The current instance of the class.
	 */
	debug(flag: boolean): this {
		this.debugging = flag;
		return this;
	}

	/**
	 * Fetches the remote file at the specified path and returns its content as a string.
	 * @param fpath - The path of the remote file to fetch.
	 * @param params - Optional parameters for the fetch operation.
	 * @returns A promise that resolves to the content of the remote file as a string.
	 */
	async fetchRemote(fpath: string, params?: RenderParams): Promise<string> {
		return fetch(fpath, { cache: params?.cache ?? "default" }).then((res) => res.text());
	}

	/**
	 * Fetches a local path and returns its content as a string.
	 *
	 * @param fpath - The file path of the resource.
	 * @param params - Optional render parameters.
	 * @returns A promise that resolves to the fetched resource as a string.
	 */
	async fetchLocal(fpath: string, params?: RenderParams): Promise<string> {
		return this.fetchRemote(fpath, params);
	}

	/**
	 * Preprocesses a string content with optional rendering and parsing parameters.
	 *
	 * @param content - The string content to preprocess.
	 * @param params - Optional rendering and parsing parameters.
	 * @returns A promise that resolves to a DocumentFragment representing the preprocessed content.
	 */
	async preprocessString(
		content: string,
		params?: RenderParams & ParserParams,
	): Promise<Document | DocumentFragment> {
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
	async preprocessRemote(
		fpath: string,
		params?: RenderParams & ParserParams,
	): Promise<Document | DocumentFragment> {
		const fetchOptions: RequestInit = {};
		if (params?.cache) fetchOptions.cache = params.cache;
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
	async preprocessLocal(
		fpath: string,
		params?: RenderParams & ParserParams,
	): Promise<Document | DocumentFragment> {
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
	subrenderer(): IRenderer {
		const instance = new (this.constructor as new () => IRenderer)().debug(
			this.debugging,
		) as IRenderer;

		// NOTE: Using the store object directly to avoid modifying ancestor values.

		// Attach ourselves as the parent of the new instance.
		instance._store.set("$parent", this);

		// Add a reference to the root renderer, or assume that we are the root renderer.
		instance._store.set("$rootRenderer", this.get("$rootRenderer") ?? this);

		// Custom elements are shared across all instances.
		(instance as unknown as { _customElements: Map<string, Node> })._customElements =
			this._customElements;

		return instance as IRenderer;
	}

	/**
	 * Logs the provided arguments if debugging is enabled.
	 * @param args - The arguments to be logged.
	 */
	log(...args: unknown[]): void {
		if (this.debugging) console.debug(...args);
	}

	/**
	 * Preprocesses a node by applying all the registered preprocessing plugins.
	 *
	 * @template T - The type of the input node.
	 * @param {T} root - The root node to preprocess.
	 * @param {RenderParams} [params] - Optional parameters for preprocessing.
	 * @returns {Promise<T>} - A promise that resolves to the preprocessed node.
	 */
	async preprocessNode<T extends Document | DocumentFragment | Node>(
		root: T,
		params?: RenderParams,
	): Promise<T> {
		params = { dirpath: this.dirpath, maxdepth: 10, ...params };

		const promises = new Iterator(traverse(root, this._skipNodes)).map(async (node) => {
			this.log("Preprocessing node:\n", nodeToString(node, 128));
			// Resolve all the includes in the node.
			await RendererPlugins.resolveIncludes.call(this, node, params);
			// Resolve all the relative paths in the node (including :render).
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
	 * Renders the node and applies all the registered rendering plugins.
	 *
	 * @template T - The type of the root node (Document, DocumentFragment, or Node).
	 * @param {T} root - The root node to render.
	 * @param {RenderParams} [params] - Optional parameters for rendering.
	 * @returns {Promise<T>} - A promise that resolves to the fully rendered root node.
	 */
	async renderNode<T extends Document | DocumentFragment | Node>(
		root: T,
		params?: RenderParams,
	): Promise<T> {
		// Iterate over all the nodes and apply appropriate handlers.
		// Do these steps one at a time to avoid any potential race conditions.
		for (const node of traverse(root, this._skipNodes)) {
			this.log("Rendering node:\n", nodeToString(node, 128));
			// Resolve :for first - creates copies before other plugins modify the template.
			await RendererPlugins.resolveForAttribute.call(this, node, params);
			// Resolve :render - creates subrenderer, mounts, then runs init after descendants.
			await RendererPlugins.resolveRenderAttribute.call(this, node, params);
			// Resolve the :data attribute in the node.
			await RendererPlugins.resolveDataAttribute.call(this, node, params);
			// Resolve the :text attribute in the node.
			await RendererPlugins.resolveTextAttributes.call(this, node, params);
			// Resolve the :html attribute in the node.
			await RendererPlugins.resolveHtmlAttribute.call(this, node, params);
			// Resolve the :if attribute in the node.
			await RendererPlugins.resolveIfAttribute.call(this, node, params);
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
			// Resolve the :attr:{name} attribute in the node.
			await RendererPlugins.resolveCustomAttribute.call(this, node, params);
			// Resolve the :prop:{name} attribute in the node.
			await RendererPlugins.resolveCustomProperty.call(this, node, params);
			// Strip :types and data-types attributes from rendered output.
			await RendererPlugins.stripTypes.call(this, node, params);
		}

		// Retry any .value assignments that failed during rendering.
		// See _pendingValueRetries documentation for why this is needed.
		for (const retry of this._pendingValueRetries.splice(0)) {
			retry();
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
	async mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void> {
		params = { ...params, rootNode: root };

		// Attach ourselves to the HTML node.
		setProperty(root as Element, "renderer", this);

		// Attach the HTML node to the renderer instance.
		// NOTE: Using the store object directly to avoid modifying ancestor values.
		this._store.set("$rootNode", root);

		// Set ourselves as the root renderer if not already set.
		if (!this.has("$rootRenderer")) {
			// NOTE: Using the store object directly to avoid modifying ancestor values.
			this._store.set("$rootRenderer", this);
		}

		// Setup query parameter bindings if we are the root renderer.
		if (this.get("$rootRenderer") === this) {
			await setupQueryParamBindings(this);
		}

		// Preprocess all the elements recursively first.
		await this.preprocessNode(root, params);

		// Now that the DOM is complete, render all the nodes.
		await this.renderNode(root, params);
	}
}
