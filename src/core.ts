import { ReactiveProxyStore } from "./reactive.js";
import { ParserParams, RenderParams } from "./interfaces.js";
import { Iterator } from "./iterator.js";
import { RendererPlugins } from "./plugins.js";
import { traverse } from "./dome.js";

export type EvalListener = (result: any, dependencies: string[]) => any;

/**
 * Returns the directory name from a given file path.
 * @param fpath - The file path.
 * @returns The directory name.
 */
export function dirname(fpath: string): string {
  if (!fpath.includes("/")) {
    return "";
  } else {
    return fpath.split("/").slice(0, -1).join("/");
  }
}

/**
 * Checks if a given file path is a relative path.
 *
 * @param fpath - The file path to check.
 * @returns A boolean indicating whether the file path is relative or not.
 */
export function isRelativePath(fpath: string): boolean {
  return (
    !fpath.includes("://") &&
    !fpath.startsWith("/") &&
    !fpath.startsWith("#") &&
    !fpath.startsWith("data:")
  );
}

/**
 * Creates an evaluation function based on the provided code and arguments.
 * @param code The code to be evaluated.
 * @param args The arguments to be passed to the evaluation function. Default is an empty array.
 * @returns The evaluation function.
 */
export function makeEvalFunction(code: string, args: string[] = []): Function {
  return new Function(...args, `with (this) { return (async () => (${code}))(); }`);
}

/**
 * Represents an abstract class for rendering and manipulating HTML content.
 * Extends the `ReactiveProxyStore` class.
 */
export abstract class IRenderer extends ReactiveProxyStore {
  protected debugging: boolean = false;
  protected readonly dirpath: string = "";
  protected readonly evalkeys: string[] = ["$elem", "$event"];
  protected readonly expressionCache: Map<string, Function> = new Map();
  protected readonly evalCallbacks: Map<string, EvalListener[]> = new Map();
  readonly _skipNodes: Set<Node> = new Set();
  readonly _customElements: Map<string, Node> = new Map();
  abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
  abstract serializeHTML(root: DocumentFragment | Node): string;

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
    params?: RenderParams & ParserParams
  ): Promise<DocumentFragment> {
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
    params?: RenderParams & ParserParams
  ): Promise<DocumentFragment> {
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
    params?: RenderParams & ParserParams
  ): Promise<DocumentFragment> {
    const content = await this.fetchLocal(fpath, params);
    return this.preprocessString(content, {
      ...params,
      dirpath: dirname(fpath),
      rootDocument: params?.rootDocument ?? !fpath.endsWith(".tpl.html"),
    });
  }

  /**
   * Creates a deep copy of the current renderer instance.
   * @returns A new instance of the renderer with the same state as the original.
   */
  clone(): IRenderer {
    const instance = new (this.constructor as any)(Object.fromEntries(this.store.entries()));
    // Custom elements are shared across all instances.
    instance._customElements = this._customElements;
    return instance.debug(this.debugging);
  }

  /**
   * Logs the provided arguments if debugging is enabled.
   * @param args - The arguments to be logged.
   */
  log(...args: any[]): void {
    if (this.debugging) console.debug(...args);
  }

  /**
   * Retrieves or creates a cached expression function based on the provided expression.
   * @param expr - The expression to retrieve or create a cached function for.
   * @returns The cached expression function.
   */
  private cachedExpressionFunction(expr: string): any {
    if (!this.expressionCache.has(expr)) {
      this.expressionCache.set(expr, makeEvalFunction(expr, this.evalkeys));
    }
    return this.expressionCache.get(expr);
  }

  /**
   * Evaluates an expression and returns the result along with its dependencies.
   * If the expression is already stored, it returns the stored value directly.
   * Otherwise, it performs the expression evaluation using the cached expression function.
   * @param expr - The expression to evaluate.
   * @param args - Optional arguments to be passed to the expression function.
   * @returns A promise that resolves to the result and the dependencies of the expression.
   */
  async eval(expr: string, args: { [key: string]: any } = {}): Promise<[any, string[]]> {
    if (this.store.has(expr)) {
      // Shortcut: if the expression is just an item from the value store, use that directly.
      const result = this.get(expr);
      return [result, [expr]];
    } else {
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

  /**
   * This function is intended for internal use only.
   *
   * Executes the given expression and invokes the provided callback whenever the any of the
   * dependencies change.
   *
   * @param expr - The expression to watch for changes.
   * @param args - The arguments to be passed to the expression during evaluation.
   * @param callback - The callback function to be invoked when the dependencies change.
   * @returns A promise that resolves when the initial evaluation is complete.
   */
  watchExpr(expr: string, args: { [key: string]: any }, callback: EvalListener): Promise<void> {
    // Early exit: this eval has already been registered, we just need to add our callback.
    if (this.evalCallbacks.has(expr)) {
      this.evalCallbacks.get(expr)?.push(callback);
      // Trigger the eval manually upon registration, to ensure the callback is called immediately.
      return this.eval(expr, args).then(([result, dependencies]) => callback(result, dependencies));
    }

    // Otherwise, register the callback provided.
    this.evalCallbacks.set(expr, [callback]);

    // Keep track of dependencies each evaluation.
    const prevdeps: string[] = [];
    const inner = async () => {
      // Evaluate the expression first.
      const [result, dependencies] = await this.eval(expr, args);

      // Trigger all registered callbacks.
      const callbacks = this.evalCallbacks.get(expr) || [];
      await Promise.all(callbacks.map((x: EvalListener) => x(result, dependencies)));

      // Watch the dependencies for changes.
      if (prevdeps.length > 0) this.unwatch(prevdeps, inner);
      prevdeps.splice(0, prevdeps.length, ...dependencies);
      this.watch(dependencies, inner);
    };

    return inner();
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
    params?: RenderParams
  ): Promise<T> {
    params = { dirpath: this.dirpath, maxdepth: 10, ...params };

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

  /**
   * Renders the node by applies all the registered rendering plugins.
   *
   * @template T - The type of the root node (Document, DocumentFragment, or Node).
   * @param {T} root - The root node to render.
   * @param {RenderParams} [params] - Optional parameters for rendering.
   * @returns {Promise<T>} - A promise that resolves to the fully rendered root node.
   */
  async renderNode<T extends Document | DocumentFragment | Node>(
    root: T,
    params?: RenderParams
  ): Promise<T> {
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

  /**
   * Mounts the Mancha application to a root element in the DOM.
   *
   * @param root - The root element to mount the application to.
   * @param params - Optional parameters for rendering the application.
   * @returns A promise that resolves when the mounting process is complete.
   */
  async mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void> {
    params = { ...params, rootNode: root };

    // Preprocess all the elements recursively first.
    await this.preprocessNode(root, params);

    // Now that the DOM is complete, render all the nodes.
    await this.renderNode(root, params);

    // Attach ourselves to the HTML node.
    (root as any).renderer = this;
  }
}
