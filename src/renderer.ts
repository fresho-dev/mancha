import { dirname, ellipsize, nodeToString, setProperty, traverse } from "./dome.js";
import type {
	DebugLevel,
	EffectMeta,
	ParserParams,
	PerformanceReport,
	RenderParams,
} from "./interfaces.js";
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
	private _debugLevel: DebugLevel = "off";
	protected readonly dirpath: string = "";

	/** Performance data collected during rendering. Reset on each mount(). */
	private _perfData: {
		lifecycle: { mountTime?: number; preprocessTime?: number; renderTime?: number };
		effects: Map<string, { count: number; totalTime: number }>;
	} = { lifecycle: {}, effects: new Map() };

	/** Debug level ordering for comparison. */
	private static readonly DEBUG_LEVELS: DebugLevel[] = ["off", "lifecycle", "effects", "verbose"];
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
	 * Sets the debug level for the current instance.
	 *
	 * @param flag - Boolean for backwards compat (true -> 'lifecycle') or a DebugLevel.
	 * @returns The current instance of the class.
	 */
	debug(flag: boolean | DebugLevel): this {
		if (typeof flag === "boolean") {
			this._debugLevel = flag ? "lifecycle" : "off";
		} else {
			this._debugLevel = flag;
		}
		return this;
	}

	/**
	 * Returns whether debugging is enabled (any level except 'off').
	 */
	get debugging(): boolean {
		return this._debugLevel !== "off";
	}

	/**
	 * Checks if the current debug level is at least the specified level.
	 */
	private shouldLog(level: DebugLevel): boolean {
		return (
			IRenderer.DEBUG_LEVELS.indexOf(this._debugLevel) >= IRenderer.DEBUG_LEVELS.indexOf(level)
		);
	}

	/**
	 * Resets performance data. Called at the start of mount().
	 */
	private resetPerfData(): void {
		this._perfData = { lifecycle: {}, effects: new Map() };
	}

	/**
	 * Generates a DOM path for an element (e.g., "html>body>div>ul>li:nth-child(2)").
	 */
	private getNodePath(elem: Element): string {
		const parts: string[] = [];
		let current: Element | null = elem;

		while (current?.tagName) {
			const tag = current.tagName.toLowerCase();
			const parent: Element | null = current.parentElement;

			if (parent) {
				const siblings = Array.from(parent.children).filter(
					(c: Element) => c.tagName.toLowerCase() === tag,
				);
				if (siblings.length > 1) {
					const index = siblings.indexOf(current) + 1;
					parts.unshift(`${tag}:nth-child(${index})`);
				} else {
					parts.unshift(tag);
				}
			} else {
				parts.unshift(tag);
			}

			current = parent;
		}

		return parts.join(">");
	}

	/**
	 * Builds an effect identifier from metadata.
	 */
	buildEffectId(meta?: EffectMeta): string {
		const directive = meta?.directive ?? "unknown";
		const expression = ellipsize(meta?.expression ?? "", 32);
		const elem = meta?.element as HTMLElement | undefined;

		const elemId = elem
			? (elem.dataset?.perfid ?? elem.id ?? elem.dataset?.testid ?? this.getNodePath(elem))
			: "unknown";

		return `${directive}:${elemId}:${expression}`;
	}

	/**
	 * Records an effect execution for performance tracking.
	 */
	recordEffectExecution(meta: EffectMeta | undefined, duration: number): void {
		const id = this.buildEffectId(meta);
		const stats = this._perfData.effects.get(id) ?? { count: 0, totalTime: 0 };
		stats.count++;
		stats.totalTime += duration;
		this._perfData.effects.set(id, stats);
	}

	/**
	 * Returns a structured performance report.
	 */
	performanceReport(): PerformanceReport {
		const effects = Array.from(this._perfData.effects.entries());
		const byDirective: Record<string, { count: number; totalTime: number }> = {};

		for (const [id, stats] of effects) {
			const directive = id.split(":")[0];
			if (!byDirective[directive]) byDirective[directive] = { count: 0, totalTime: 0 };
			byDirective[directive].count += stats.count;
			byDirective[directive].totalTime += stats.totalTime;
		}

		const sorted = effects
			.map(([id, s]) => ({
				id,
				executionCount: s.count,
				totalTime: s.totalTime,
				avgTime: s.count > 0 ? s.totalTime / s.count : 0,
			}))
			.sort((a, b) => b.totalTime - a.totalTime)
			.slice(0, 10);

		return {
			lifecycle: this._perfData.lifecycle,
			effects: {
				total: effects.length,
				byDirective,
				slowest: sorted,
			},
			observers: this.getObserverStats(),
		};
	}

	/**
	 * Override effect() to add performance tracking.
	 * Tracks effect execution time and logs slow effects (>16ms).
	 */
	override effect<T>(observer: () => T, meta?: EffectMeta): T {
		// Skip tracking if debugging is off.
		if (!this.shouldLog("lifecycle")) {
			return super.effect(observer, meta);
		}

		const startTime = performance.now();
		const result = super.effect(observer, meta);
		const duration = performance.now() - startTime;

		// Record effect execution for performance report.
		if (meta) {
			this.recordEffectExecution(meta, duration);
		}

		// Log slow effects (>16ms = potentially dropped frame).
		if (duration > 16) {
			console.warn(`Slow effect (${duration.toFixed(1)}ms):`, this.buildEffectId(meta));
		}

		// Log individual effect timings at 'effects' level.
		if (this.shouldLog("effects")) {
			console.debug(`Effect (${duration.toFixed(2)}ms):`, this.buildEffectId(meta));
		}

		return result;
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
	 * Logs the provided arguments if verbose debugging is enabled.
	 * @param args - The arguments to be logged.
	 */
	log(...args: unknown[]): void {
		if (this.shouldLog("verbose")) console.debug(...args);
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
		const startTime = this.shouldLog("lifecycle") ? performance.now() : 0;
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

		// Record preprocess timing.
		if (startTime) {
			this._perfData.lifecycle.preprocessTime =
				(this._perfData.lifecycle.preprocessTime ?? 0) + (performance.now() - startTime);
		}

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
		const startTime = this.shouldLog("lifecycle") ? performance.now() : 0;

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

		// Record render timing.
		if (startTime) {
			this._perfData.lifecycle.renderTime =
				(this._perfData.lifecycle.renderTime ?? 0) + (performance.now() - startTime);
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
		const startTime = this.shouldLog("lifecycle") ? performance.now() : 0;

		// Reset performance data for this mount cycle.
		if (startTime) this.resetPerfData();

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

		// Record mount timing.
		if (startTime) {
			this._perfData.lifecycle.mountTime = performance.now() - startTime;
		}
	}
}
