import { ReactiveProxyStore } from "./reactive";
import { ParserParams, RenderParams } from "./interfaces";
import { Iterator } from "./iterator";
import { RendererPlugins } from "./plugins";

export type EvalListener = (result: any, dependencies: string[]) => any;

export function* traverse(
  root: Node | DocumentFragment | Document,
  skip: Set<Node> = new Set()
): Generator<ChildNode> {
  const explored: Set<ChildNode> = new Set();
  const frontier: ChildNode[] = Array.from(root.childNodes).filter((node) => !skip.has(node));

  // Also yield the root node.
  yield root as ChildNode;

  while (frontier.length) {
    const node: ChildNode = frontier.pop() as ChildNode;
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

export function dirname(fpath: string): string {
  if (!fpath.includes("/")) {
    return "";
  } else {
    return fpath.split("/").slice(0, -1).join("/");
  }
}

export function isRelativePath(fpath: string): boolean {
  return (
    !fpath.includes("://") &&
    !fpath.startsWith("/") &&
    !fpath.startsWith("#") &&
    !fpath.startsWith("data:")
  );
}

export function makeEvalFunction(code: string, args: string[] = []): Function {
  return new Function(...args, `with (this) { return (async () => (${code}))(); }`);
}

export function safeEval(
  context: any,
  code: string,
  args: { [key: string]: any } = {}
): Promise<any> {
  const inner = `with (this) { return (async () => (${code}))(); }`;
  return new Function(...Object.keys(args), inner).call(context, ...Object.values(args));
}

export abstract class IRenderer extends ReactiveProxyStore {
  protected debugging: boolean = false;
  protected readonly dirpath: string = "";
  protected readonly evalkeys: string[] = ["$elem", "$event"];
  protected readonly expressionCache: Map<string, Function> = new Map();
  protected readonly evalCallbacks: Map<string, EvalListener[]> = new Map();
  readonly skipNodes: Set<Node> = new Set();
  abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
  abstract serializeHTML(root: DocumentFragment | Node): string;

  debug(flag: boolean): this {
    this.debugging = flag;
    return this;
  }

  async fetchRemote(fpath: string, params?: RenderParams): Promise<string> {
    return fetch(fpath, { cache: params?.cache ?? "default" }).then((res) => res.text());
  }

  async fetchLocal(fpath: string, params?: RenderParams): Promise<string> {
    return this.fetchRemote(fpath, params);
  }

  async preprocessString(
    content: string,
    params?: RenderParams & ParserParams
  ): Promise<DocumentFragment> {
    this.log("Preprocessing string content with params:\n", params);
    const fragment = this.parseHTML(content, params);
    await this.preprocessNode(fragment, params);
    return fragment;
  }

  async preprocessLocal(
    fpath: string,
    params?: RenderParams & ParserParams
  ): Promise<DocumentFragment> {
    const content = await this.fetchLocal(fpath, params);
    return this.preprocessString(content, {
      ...params,
      dirpath: dirname(fpath),
      root: params?.root ?? !fpath.endsWith(".tpl.html"),
    });
  }

  async preprocessRemote(
    fpath: string,
    params?: RenderParams & ParserParams
  ): Promise<DocumentFragment> {
    const cache = params?.cache || "default";
    const content = await fetch(fpath, { cache }).then((res) => res.text());
    return this.preprocessString(content, {
      ...params,
      dirpath: dirname(fpath),
      root: params?.root ?? !fpath.endsWith(".tpl.html"),
    });
  }

  clone(): IRenderer {
    return new (this.constructor as any)(Object.fromEntries(this.store.entries()));
  }

  log(...args: any[]): void {
    if (this.debugging) console.debug(...args);
  }

  private cachedExpressionFunction(expr: string): any {
    if (!this.expressionCache.has(expr)) {
      this.expressionCache.set(expr, makeEvalFunction(expr, this.evalkeys));
    }
    return this.expressionCache.get(expr);
  }

  async eval(expr: string, args: { [key: string]: any } = {}): Promise<[any, string[]]> {
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

  async watchExpr(
    expr: string,
    args: { [key: string]: any },
    callback: EvalListener
  ): Promise<void> {
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

  async preprocessNode(
    root: Document | DocumentFragment | Node,
    params?: RenderParams
  ): Promise<void> {
    params = Object.assign({ dirpath: this.dirpath, maxdepth: 10 }, params);

    const promises = new Iterator(traverse(root, this.skipNodes)).map(async (node) => {
      this.log("Preprocessing node:\n", node);
      // Resolve all the includes in the node.
      await RendererPlugins.resolveIncludes.call(this, node, params);
      // Resolve all the relative paths in the node.
      await RendererPlugins.rebaseRelativePaths.call(this, node, params);
    });

    // Wait for all the rendering operations to complete.
    await Promise.all(promises.generator());
  }

  async renderNode(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void> {
    // Iterate over all the nodes and apply appropriate handlers.
    // Do these steps one at a time to avoid any potential race conditions.
    for (const node of traverse(root, this.skipNodes)) {
      this.log("Rendering node:\n", node);
      // Resolve the :data attribute in the node.
      await RendererPlugins.resolveDataAttribute.call(this, node, params);
      // Resolve the :for attribute in the node.
      await RendererPlugins.resolveForAttribute.call(this, node, params);
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
  }

  async mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void> {
    // Preprocess all the elements recursively first.
    await this.preprocessNode(root, params);

    // Now that the DOM is complete, render all the nodes.
    await this.renderNode(root, params);
  }
}
