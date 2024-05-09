import * as path from "path-browserify";
import { ReactiveProxy, ReactiveProxyStore, proxify } from "./reactive";
import { attributeNameToCamelCase, decodeHtmlAttrib } from "./attributes";

const KW_ATTRIBUTES = new Set([":bind", ":bind-events", ":data", ":for", ":show", "@watch"]);
const ATTR_SHORTHANDS: { [key: string]: string } = {
  // ":class": ":class-name",
  $text: "$text-content",
  $html: "$inner-HTML",
};

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

export function folderPath(fpath: string): string {
  if (fpath.endsWith("/")) {
    return fpath.slice(0, -1);
  } else {
    return path.dirname(fpath);
  }
}

export function resolvePath(fpath: string): string {
  if (fpath.includes("://")) {
    const [scheme, remotePath] = fpath.split("://", 2);
    return `${scheme}://${resolvePath("/" + remotePath).substring(1)}`;
  } else {
    return path.resolve(fpath);
  }
}

export function extractTextNodeKeys(content: string): [string, string, string[]][] {
  const matcher = new RegExp(/{{ ([\w\.]+) }}/gm);
  return Array.from(content.matchAll(matcher)).map((match) => {
    const orig = match[0];
    let key = match[1];
    const props: string[] = [];
    if (key.includes(".")) {
      const parts = key.split(".");
      key = parts[0];
      props.push(...parts.slice(1));
    }
    return [orig, key, props];
  });
}

export function safeEval(
  code: string,
  context: any,
  args: { [key: string]: any } = {}
): Promise<any> {
  const inner = `with (this) { return (async () => (${code}))(); }`;
  return new Function(...Object.keys(args), inner).call(context, ...Object.values(args));
}

export interface ParserParams {
  isRoot?: boolean;
  encoding?: BufferEncoding;
}

export interface RendererParams {
  fsroot?: string;
  maxdepth?: number;
  cache?: RequestCache | null;
  debug?: boolean;
}

const _DEFAULT_RENDERER_PARAMS: RendererParams = { maxdepth: 10 };

export abstract class IRenderer extends ReactiveProxyStore {
  protected readonly fsroot: string = ".";
  protected readonly skipNodes: Set<Node> = new Set();
  abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
  abstract serializeHTML(root: DocumentFragment | Node): string;
  abstract renderLocalPath(
    fpath: string,
    params?: RendererParams & ParserParams
  ): Promise<DocumentFragment>;

  clone(): IRenderer {
    return new (this.constructor as any)(Object.fromEntries(this.store.entries()));
  }

  log(params?: RendererParams, ...args: any[]): void {
    if (params?.debug) console.debug(...args);
  }

  async eval(expr: string, args: { [key: string]: any } = {}, params?: RendererParams) {
    const proxy = proxify(this);
    const result = await safeEval(expr, proxy, { ...args });
    this.log(params, `eval \`${expr}\` => `, result);
    return result;
  }

  async resolveIncludes(
    root: Document | DocumentFragment | Node,
    params?: RendererParams
  ): Promise<IRenderer> {
    params = Object.assign({ fsroot: this.fsroot }, _DEFAULT_RENDERER_PARAMS, params);

    const includes = Array.from(traverse(root, this.skipNodes))
      .map((node) => node as Element)
      .filter((node) => node.tagName?.toLocaleLowerCase() === "include")
      .map(async (node) => {
        const src = node.getAttribute?.("src");
        const dataset = { ...(node as HTMLElement).dataset };

        // Add all the data-* attributes as properties to current context.
        // NOTE: this will propagate to all subsequent render calls, including nested calls.
        Object.entries(dataset).forEach(([key, attr]) => this.set(key, decodeHtmlAttrib(attr)));

        // Early exit: <include> tags must have a src attribute.
        if (!src) {
          throw new Error(`"src" attribute missing from ${node}.`);
        }

        // The included file will replace this tag.
        const handler = (fragment: DocumentFragment) => {
          node.replaceWith(...Array.from(fragment.childNodes));
        };

        // Decrement the maxdepth param.
        params.maxdepth!!--;

        // Case 1: Absolute remote path.
        if (src.indexOf("://") !== -1) {
          await this.renderRemotePath(src, { ...params, isRoot: false }).then(handler);

          // Case 2: Relative remote path.
        } else if (params.fsroot?.indexOf("://") !== -1) {
          const relpath = `${params.fsroot}/${src}`;
          await this.renderRemotePath(relpath, { ...params, isRoot: false }).then(handler);

          // Case 3: Local absolute path.
        } else if (src.charAt(0) === "/") {
          await this.renderLocalPath(src, { ...params, isRoot: false }).then(handler);

          // Case 4: Local relative path.
        } else {
          const relpath = path.join(params.fsroot, src);
          await this.renderLocalPath(relpath, { ...params, isRoot: false }).then(handler);
        }
      });

    // Wait for all the rendering operations to complete.
    await Promise.all(includes);

    // Re-render until no changes are made.
    if (includes.length === 0) {
      return this;
    } else if (params.maxdepth === 0) {
      throw new Error("Maximum recursion depth reached.");
    } else {
      return this.resolveIncludes(root, {
        fsroot: params.fsroot,
        maxdepth: params.maxdepth!! - 1,
      });
    }
  }

  resolveTextNode(node: ChildNode, params?: RendererParams): ReactiveProxy<any>[] {
    if (node.nodeType !== 3) return [];
    const content = node.nodeValue || "";

    // Identify all the context variables found in the content.
    const keys = extractTextNodeKeys(content).filter(([, key]) => this.store.has(key));

    // Early exit: no keys found in content.
    if (keys.length === 0) return [];
    this.log(params, keys, "keys found in node:", node);

    // Apply the context variables to the content, iteratively.
    const updateNode = () => {
      let updatedContent = content;
      keys.forEach(([match, key, props]) => {
        updatedContent = updatedContent.replace(match, String(this.get(key, ...props) ?? ""));
      });
      node.nodeValue = updatedContent;
    };

    // Update the content now, and set up the listeners for future updates.
    updateNode();
    this.watch(
      keys.map(([, key]) => key),
      updateNode
    );

    // Return all the proxies found in the content.
    return keys.map(([, key]) => this.store.get(key)!!);
  }

  async resolveDataAttribute(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const dataAttr = elem.getAttribute?.(":data");
    if (dataAttr) {
      this.log(params, ":data attribute found in:\n", node);

      elem.removeAttribute(":data");
      const result = await this.eval(dataAttr, { $elem: node }, params);
      this.log(params, ":data", dataAttr, "=>", result);
      await this.update(result);
    }
  }

  async resolveWatchAttribute(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const watchAttr = elem.getAttribute?.("@watch");
    if (watchAttr) {
      this.log(params, "@watch attribute found in:\n", node);

      // Remove the attribute from the node.
      elem.removeAttribute("@watch");

      // Compute the function's result and trace dependencies.
      const fn = () => this.eval(watchAttr, { $elem: node }, params);
      const [result, dependencies] = await this.trace(fn);
      this.log(params, "@watch", watchAttr, "=>", result);

      // Watch for updates, and re-execute function if needed.
      this.watch(dependencies, fn);
    }
  }

  async resolvePropAttributes(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith("$") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(params, attr.name, "attribute found in:\n", node);

        // Remove the attribute from the node.
        elem.removeAttribute(attr.name);

        // Apply any shorthand conversions if necessary.
        const propName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);

        // Compute the function's result and trace dependencies.
        const fn = () => this.eval(attr.value, { $elem: node }, params);
        const [result, dependencies] = await this.trace(fn);
        this.log(params, attr.name, attr.value, "=>", result, `[${dependencies}]`);

        // Set the requested property value on the original node, and watch for updates.
        const prop = attributeNameToCamelCase(propName);
        this.watch(dependencies, async () => ((node as any)[prop] = await fn()));
        (node as any)[prop] = result;
      }
    }
  }

  async resolveAttrAttributes(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith(":") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(params, attr.name, "attribute found in:\n", node);

        // Remove the processed attributes from node.
        elem.removeAttribute(attr.name);

        // Apply any shorthand conversions if necessary.
        const attrName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);

        // Compute the function's result and trace dependencies.
        const fn = () => this.eval(attr.value, { $elem: node }, params);
        const [result, dependencies] = await this.trace(fn);
        this.log(params, attr.name, attr.value, "=>", result, `[${dependencies}]`);

        // Set the requested property value on the original node, and watch for updates.
        this.watch(dependencies, async () => elem.setAttribute(attrName, await fn()));
        elem.setAttribute(attrName, result);
      }
    }
  }

  async resolveEventAttributes(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith("@") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(params, attr.name, "attribute found in:\n", node);

        // Remove the processed attributes from node.
        elem.removeAttribute(attr.name);

        node.addEventListener?.(attr.name.substring(1), (event) =>
          this.eval(attr.value, { $elem: node, $event: event }, params)
        );
      }
    }
  }

  async resolveForAttribute(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const forAttr = elem.getAttribute?.(":for");
    if (forAttr) {
      this.log(params, ":for attribute found in:\n", node);

      // Remove the processed attributes from node.
      elem.removeAttribute(":for");

      // Ensure the node and its children are not processed by subsequent steps.
      for (const child of traverse(node, this.skipNodes)) {
        this.skipNodes.add(child);
      }

      // Place the template node into a template element.
      const parent = node.parentNode!!;
      const template = node.ownerDocument!!.createElement("template");
      parent.insertBefore(template, node);
      template.append(node);
      this.log(params, ":for template:\n", template);

      // Tokenize the input by splitting it based on the format "{key} in {expression}".
      const tokens = forAttr.split(" in ", 2);
      if (tokens.length !== 2) {
        throw new Error(`Invalid :for format: \`${forAttr}\`. Expected "{key} in {expression}".`);
      }

      // Compute the container expression and trace dependencies.
      let items: any[] = [];
      let deps: string[] = [];
      const [loopKey, itemsExpr] = tokens;
      try {
        [items, deps] = await this.trace(() => this.eval(itemsExpr, { $elem: node }, params));
        this.log(params, itemsExpr, "=>", items, `[${deps}]`);
      } catch (exc) {
        console.error(exc);
        return;
      }

      // Keep track of all the child nodes added.
      const children: Node[] = [];

      // Define the function that will update the DOM.
      const fn = async (items: any[]) => {
        this.log(params, ":for list items:", items);

        // Validate that the expression returns a list of items.
        if (!Array.isArray(items)) {
          console.error(`Expression did not yield a list: \`${itemsExpr}\` => \`${items}\``);
          return;
        }

        // Acquire the lock atomically.
        this.lock = this.lock.then(
          () =>
            new Promise(async (resolve) => {
              // Remove all the previously added children, if any.
              children.splice(0, children.length).forEach((child) => {
                parent.removeChild(child);
                // this.skipNodes.delete(child);
              });

              // Loop through the container items in reverse, because we insert from back to front.
              for (const item of items.slice(0).reverse()) {
                // Create a subrenderer that will hold the loop item and all node descendants.
                const subrenderer = this.clone();
                await subrenderer.set(loopKey, item);

                // Create a new HTML element for each item and add them to parent node.
                const copy = node.cloneNode(true);
                parent.insertBefore(copy, template.nextSibling);

                // Also add the new element to the store.
                children.push(copy);

                // Since the element will be handled by a subrenderer, skip it in the source.
                this.skipNodes.add(copy);

                // Render the element using the subrenderer.
                await subrenderer.mount(copy, params);
                this.log(params, "Rendered list child:\n", copy);
              }

              // Release the lock.
              resolve();
            })
        );

        // Return the lock so the whole operation can be awaited.
        return this.lock;
      };

      // Apply changes, and watch for updates in the dependencies.
      this.watch(deps, async () => fn(await this.eval(itemsExpr, { $elem: node }, params)));
      return fn(items);
    }
  }

  async resolveBindAttribute(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const bindKey = elem.getAttribute?.(":bind");
    if (bindKey) {
      this.log(params, ":bind attribute found in:\n", node);

      // The change events we listen for can be overriden by user.
      const defaultEvents = ["change", "input"];
      const updateEvents = elem.getAttribute?.(":bind-events")?.split(",") || defaultEvents;

      // If the element is of type checkbox, we bind to the "checked" property.
      const prop = elem.getAttribute("type") === "checkbox" ? "checked" : "value";

      // If the key is not found in our store, create it and initialize it with the node's value.
      if (!this.store.has(bindKey)) await this.set(bindKey, (elem as any)[prop]);

      // Set the node's value to our current value.
      (elem as any)[prop] = this.get(bindKey);

      // Watch for updates in the node's value.
      for (const event of updateEvents) {
        node.addEventListener(event, () => this.set(bindKey, (elem as any)[prop]));
      }

      // Watch for updates in the store.
      this.watch([bindKey], () => ((elem as any)[prop] = this.get(bindKey)));

      // Remove the processed attributes from node.
      elem.removeAttribute(":bind");
      elem.removeAttribute(":bind-events");
    }
  }

  async resolveShowAttribute(node: ChildNode, params?: RendererParams) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const showExpr = (node as Element).getAttribute?.(":show");
    if (showExpr) {
      // Compute the function's result and trace dependencies.
      const fn = () => this.eval(showExpr, { $elem: node }, params);
      const [result, dependencies] = await this.trace(fn);
      this.log(params, ":show", showExpr, "=>", result, `[${dependencies}]`);

      // If the result is false, remove the element from the DOM.
      const parent = node.parentNode!!;
      if (!result) parent.removeChild(node);

      // Watch the dependencies, and re-evaluate the expression.
      this.watch(dependencies, async () => {
        if ((await fn()) && node.parentNode !== parent) parent.append(node);
        else if (Array.from(parent.childNodes).includes(node)) node.remove();
      });

      // Remove the processed attributes from node.
      elem.removeAttribute(":show");
    }
  }

  async mount(
    root: Document | DocumentFragment | Node,
    params?: RendererParams
  ): Promise<IRenderer> {
    // Resolve all the includes recursively first.
    await this.resolveIncludes(root, params);

    // Iterate over all the nodes and apply appropriate handlers.
    // Do these steps one at a time to avoid any potential race conditions.
    for (const node of traverse(root, this.skipNodes)) {
      this.log(params, "Processing node:\n", node);
      // Resolve the :data attribute in the node.
      await this.resolveDataAttribute(node, params);
      // Resolve the :show attribute in the node.
      await this.resolveShowAttribute(node, params);
      // Resolve the @watch attribute in the node.
      await this.resolveWatchAttribute(node, params);
      // Resolve the :for attribute in the node.
      await this.resolveForAttribute(node, params);
      // Resolve the :bind attribute in the node.
      await this.resolveBindAttribute(node, params);
      // Resolve all $attributes in the node.
      await this.resolvePropAttributes(node, params);
      // Resolve all :attributes in the node.
      await this.resolveAttrAttributes(node, params);
      // Resolve all @attributes in the node.
      await this.resolveEventAttributes(node, params);
      // Replace all the {{ variables }} in the text.
      this.resolveTextNode(node, params);
    }

    return this;
  }

  async renderString(
    content: string,
    params?: RendererParams & ParserParams
  ): Promise<DocumentFragment> {
    const fragment = this.parseHTML(content, params);
    await this.mount(fragment, params);
    return fragment;
  }

  async renderRemotePath(
    fpath: string,
    params?: RendererParams & ParserParams
  ): Promise<DocumentFragment> {
    const cache = params?.cache || "default";
    const content = await fetch(fpath, { cache }).then((res) => res.text());
    return this.renderString(content, {
      ...params,
      fsroot: folderPath(fpath),
      isRoot: params?.isRoot || !fpath.endsWith(".tpl.html"),
    });
  }
}
