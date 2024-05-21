import { ReactiveProxyStore } from "./reactive";
import { ParserParams, RenderParams } from "./interfaces";
import { Iterator } from "./iterator";
import {
  rebaseRelativePaths,
  resolveAttrAttributes,
  resolveBindAttribute,
  resolveDataAttribute,
  resolveEventAttributes,
  resolveForAttribute,
  resolveHtmlAttribute,
  resolveIncludes,
  resolvePropAttributes,
  resolveShowAttribute,
  resolveTextNodeExpressions,
  resolveWatchAttribute,
} from "./plugins";

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

export function safeEval(
  code: string,
  context: any,
  args: { [key: string]: any } = {}
): Promise<any> {
  const inner = `with (this) { return (async () => (${code}))(); }`;
  return new Function(...Object.keys(args), inner).call(context, ...Object.values(args));
}

export abstract class IRenderer extends ReactiveProxyStore {
  private debugging: boolean = false;
  protected readonly dirpath: string = "";
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
  async eval(
    expr: string,
    args: { [key: string]: any } = {},
    callback?: (result: any, dependencies: string[]) => void | Promise<void>
  ): Promise<[any, string[]]> {
    // TODO: Add expression to cache.
    const prevdeps: string[] = [];
    const inner = async () => {
      const [result, dependencies] = await this.trace(async function () {
        const result = await safeEval(expr, this, { ...args });
        return result;
      });
      this.log(`eval \`${expr}\` => `, result, `[ ${dependencies.join(", ")} ]`);

      // Watch all the dependencies for changes.
      if (prevdeps.length > 0) this.unwatch(prevdeps, inner);
      prevdeps.splice(0, prevdeps.length, ...dependencies);
      this.watch(dependencies, inner);

      await callback?.(result, dependencies);
      return [result, dependencies];
    };

    return inner() as Promise<[any, string[]]>;
  }

  async preprocessNode(
    root: Document | DocumentFragment | Node,
    params?: RenderParams
  ): Promise<void> {
    params = Object.assign({ dirpath: this.dirpath, maxdepth: 10 }, params);

    const promises = new Iterator(traverse(root, this.skipNodes)).map(async (node) => {
      this.log("Preprocessing node:\n", node);
      // Resolve all the includes in the node.
      await resolveIncludes.call(this, node, params);
      // Resolve all the relative paths in the node.
      await rebaseRelativePaths.call(this, node, params);
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
      await resolveDataAttribute.call(this, node, params);
      // Resolve the :for attribute in the node.
      await resolveForAttribute.call(this, node, params);
      // Resolve the $html attribute in the node.
      await resolveHtmlAttribute.call(this, node, params);
      // Resolve the :show attribute in the node.
      await resolveShowAttribute.call(this, node, params);
      // Resolve the @watch attribute in the node.
      await resolveWatchAttribute.call(this, node, params);
      // Resolve the :bind attribute in the node.
      await resolveBindAttribute.call(this, node, params);
      // Resolve all $attributes in the node.
      await resolvePropAttributes.call(this, node, params);
      // Resolve all :attributes in the node.
      await resolveAttrAttributes.call(this, node, params);
      // Resolve all @attributes in the node.
      await resolveEventAttributes.call(this, node, params);
      // Replace all the {{ variables }} in the text.
      await resolveTextNodeExpressions.call(this, node, params);
    }
  }

  async mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void> {
    // Preprocess all the elements recursively first.
    await this.preprocessNode(root, params);

    // Now that the DOM is complete, render all the nodes.
    await this.renderNode(root, params);
  }
}
