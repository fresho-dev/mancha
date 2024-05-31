import {
  appendChild,
  attributeNameToCamelCase,
  cloneAttribute,
  createElement,
  firstElementChild,
  getAttribute,
  getNodeValue,
  insertBefore,
  removeAttribute,
  removeChild,
  replaceChildren,
  replaceWith,
  setAttribute,
  setNodeValue,
  setTextContent,
  traverse,
} from "./dome.js";
import { isRelativePath } from "./core.js";
import { RendererPlugin } from "./interfaces.js";
import { Iterator } from "./iterator.js";

const KW_ATTRIBUTES = new Set([
  ":bind",
  ":bind-events",
  ":data",
  ":for",
  ":show",
  "@watch",
  "$html",
]);

/** @internal */
export namespace RendererPlugins {
  export const resolveIncludes: RendererPlugin = async function (node, params) {
    const elem = node as Element;

    // Early exit: node must be an <include> element.
    if (elem.tagName?.toLocaleLowerCase() !== "include") return;
    this.log("<include> tag found in:\n", node);
    this.log("<include> params:", params);

    // Early exit: <include> tags must have a src attribute.
    const src = getAttribute(elem, "src");
    if (!src) {
      throw new Error(`"src" attribute missing from ${node}.`);
    }

    // The included file will replace this tag, and all elements will be fully preprocessed.
    const handler = (fragment: DocumentFragment) => {
      // Add whatever attributes the include tag had to the first child.
      const child = fragment.firstChild as Element | null;
      for (const attr of Array.from(elem.attributes)) {
        if (child && attr.name !== "src") cloneAttribute(elem, child, attr.name);
      }
      // Replace the include tag with the contents of the included file.
      replaceWith(node, ...fragment.childNodes);
    };

    // Compute the subparameters being passed down to the included file.
    const subparameters = { ...params, root: false, maxdepth: params?.maxdepth!! - 1 };
    if (subparameters.maxdepth === 0) throw new Error("Maximum recursion depth reached.");

    // Case 1: Absolute remote path.
    if (src.includes("://") || src.startsWith("//")) {
      this.log("Including remote file from absolute path:", src);
      await this.preprocessRemote(src, subparameters).then(handler);

      // Case 2: Relative remote path.
    } else if (params?.dirpath?.includes("://") || params?.dirpath?.startsWith("//")) {
      const relpath = src.startsWith("/") ? src : `${params.dirpath}/${src}`;
      this.log("Including remote file from relative path:", relpath);
      await this.preprocessRemote(relpath, subparameters).then(handler);

      // Case 3: Local absolute path.
    } else if (src.charAt(0) === "/") {
      this.log("Including local file from absolute path:", src);
      await this.preprocessLocal(src, subparameters).then(handler);

      // Case 4: Local relative path.
    } else {
      const relpath =
        params?.dirpath && params?.dirpath !== "." ? `${params?.dirpath}/${src}` : src;
      this.log("Including local file from relative path:", relpath);
      await this.preprocessLocal(relpath, subparameters).then(handler);
    }
  };

  export const rebaseRelativePaths: RendererPlugin = async function (node, params) {
    const elem = node as Element;
    const tagName = elem.tagName?.toLowerCase();

    // Early exit: if there is no dirpath, we cannot rebase relative paths.
    if (!params?.dirpath) return;

    // We have to retrieve the attribute, because the node property is always an absolute path.
    const src = getAttribute(elem, "src");
    const href = getAttribute(elem, "href");
    const data = getAttribute(elem, "data");

    // Early exit: if there is no element attribute to rebase, we can skip this step.
    const anyattr = src || href || data;
    if (!anyattr) return;
    if (anyattr && isRelativePath(anyattr)) {
      this.log("Rebasing relative path as:", params.dirpath, "/", anyattr);
    }

    if (tagName === "img" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "a" && href && isRelativePath(href)) {
      setAttribute(elem, "href", `${params.dirpath}/${href}`);
    } else if (tagName === "link" && href && isRelativePath(href)) {
      setAttribute(elem, "href", `${params.dirpath}/${href}`);
    } else if (tagName === "script" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "source" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "audio" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "video" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "track" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "iframe" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "object" && data && isRelativePath(data)) {
      setAttribute(elem, "data", `${params.dirpath}/${data}`);
    } else if (tagName === "input" && src && isRelativePath(src)) {
      setAttribute(elem, "src", `${params.dirpath}/${src}`);
    } else if (tagName === "area" && href && isRelativePath(href)) {
      setAttribute(elem, "href", `${params.dirpath}/${href}`);
    } else if (tagName === "base" && href && isRelativePath(href)) {
      setAttribute(elem, "href", `${params.dirpath}/${href}`);
    }
  };

  export const registerCustomElements: RendererPlugin = async function (node, params) {
    const elem = node as Element;
    if (elem.tagName?.toLowerCase() === "template" && getAttribute(elem, "is")) {
      const tagName = getAttribute(elem, "is")?.toLowerCase() as string;
      if (!this._customElements.has(tagName)) {
        this.log(`Registering custom element: ${tagName}\n`, elem);
        this._customElements.set(tagName, elem.cloneNode(true));
        // Remove the node from the DOM.
        removeChild(elem.parentNode!!, elem);
      }
    }
  };

  export const resolveCustomElements: RendererPlugin = async function (node, params) {
    const elem = node as Element;
    const tagName = elem.tagName?.toLowerCase();
    if (this._customElements.has(tagName)) {
      this.log(`Processing custom element: ${tagName}\n`, elem);
      const template = this._customElements.get(tagName)!! as HTMLTemplateElement;
      const clone = (template.content || template).cloneNode(true) as Element;

      // Add whatever attributes the custom element tag had to the first child.
      const child = firstElementChild(clone);
      for (const attr of Array.from(elem.attributes)) {
        if (child) cloneAttribute(elem, child, attr.name);
      }

      // If there's a <slot> element, replace it with the contents of the custom element.
      const iter = new Iterator(traverse(clone));
      const slot = iter.find((x) => (x as Element).tagName?.toLowerCase() === "slot");
      if (slot) replaceWith(slot, ...elem.childNodes);

      // Replace the custom element tag with the contents of the template.
      replaceWith(node, ...clone.childNodes);
    }
  };

  export const resolveTextNodeExpressions: RendererPlugin = async function (node, params) {
    if (node.nodeType !== 3) return;
    const content = getNodeValue(node) || "";
    this.log(`Processing node content value:\n`, content);

    // Identify all the expressions found in the content.
    const matcher = new RegExp(/{{ ([^}]+) }}/gm);
    const expressions = Array.from(content.matchAll(matcher)).map((match) => match[1]);

    // To update the node, we have to re-evaluate all of the expressions since that's much simpler
    // than caching results.
    const updateNode = () => {
      let updatedContent = content;
      for (const expr of expressions) {
        const result = this.eval(expr, { $elem: node });
        updatedContent = updatedContent.replace(`{{ ${expr} }}`, String(result));
      }
      setNodeValue(node, updatedContent);
    };

    // Trigger the eval and pass our full node update function as the callback.
    this.effect(updateNode);
  };

  export const resolveDataAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const dataAttr = getAttribute(elem, ":data");
    if (dataAttr) {
      this.log(":data attribute found in:\n", node);

      // Remove the attribute from the node.
      removeAttribute(elem, ":data");

      // Create a subrenderer and process the tag.
      const subrenderer = this.clone();
      (node as any).renderer = subrenderer;
      const result = subrenderer.eval(dataAttr, { $elem: node });
      Object.entries(result).forEach(([key, value]) => (subrenderer.$[key] = value));

      // Skip all the children of the current node.
      for (const child of traverse(node, this._skipNodes)) {
        this._skipNodes.add(child);
      }

      // Mount the current node with the subrenderer.
      await subrenderer.mount(node, params);
    }
  };

  export const resolveWatchAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const watchAttr = getAttribute(elem, "@watch");
    if (watchAttr) {
      this.log("@watch attribute found in:\n", node);

      // Remove the attribute from the node.
      removeAttribute(elem, "@watch");

      // Compute the function's result.
      this.effect(() => {
        const result = this.eval(watchAttr, { $elem: node });
        console.log(watchAttr, result);
      });
    }
  };

  export const resolveTextAttributes: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const textAttr = getAttribute(elem, "$text");
    if (textAttr) {
      this.log("$text attribute found in:\n", node);

      // Remove the attribute from the node.
      removeAttribute(elem, "$text");

      // Compute the function's result and track dependencies.
      this.effect(() => setTextContent(node as Element, this.eval(textAttr, { $elem: node })));
    }
  };

  export const resolveHtmlAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const htmlAttr = getAttribute(elem, "$html");
    if (htmlAttr) {
      this.log("$html attribute found in:\n", node);

      // Remove the attribute from the node.
      removeAttribute(elem, "$html");

      // Obtain a subrenderer for the node contents.
      const subrenderer = this.clone();

      // Compute the function's result and track dependencies.
      this.effect(() => {
        const result = this.eval(htmlAttr, { $elem: node });
        subrenderer.preprocessString(result, params).then((fragment) => {
          replaceChildren(elem, fragment);
        });
      });
    }
  };

  export const resolvePropAttributes: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith("$") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(attr.name, "attribute found in:\n", node);

        // Remove the attribute from the node.
        removeAttribute(elem, attr.name);

        // Compute the function's result and track dependencies.
        const propName = attributeNameToCamelCase(attr.name.slice(1));
        this.effect(() => ((node as any)[propName] = this.eval(attr.value, { $elem: node })));
      }
    }
  };

  export const resolveAttrAttributes: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith(":") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(attr.name, "attribute found in:\n", node);

        // Remove the processed attributes from node.
        removeAttribute(elem, attr.name);

        // Compute the function's result and track dependencies.
        const attrName = attr.name.slice(1);
        this.effect(() => setAttribute(elem, attrName, this.eval(attr.value, { $elem: node })));
      }
    }
  };

  export const resolveEventAttributes: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith("@") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(attr.name, "attribute found in:\n", node);

        // Remove the processed attributes from node.
        removeAttribute(elem, attr.name);

        node.addEventListener?.(attr.name.substring(1), (event) => {
          this.eval(attr.value, { $elem: node, $event: event });
        });
      }
    }
  };

  export const resolveForAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const forAttr = getAttribute(elem, ":for")?.trim();
    if (forAttr) {
      this.log(":for attribute found in:\n", node);

      // Remove the processed attributes from node.
      removeAttribute(elem, ":for");

      // Ensure the node and its children are not processed by subsequent steps.
      for (const child of traverse(node, this._skipNodes)) {
        this._skipNodes.add(child);
      }

      // Place the template node into a template element.
      const parent = node.parentNode!!;
      const template = createElement("template", node.ownerDocument);
      insertBefore(parent, template as Node, node);
      removeChild(parent, node);
      appendChild(template as Node, node);
      this.log(":for template:\n", template);

      // Tokenize the input by splitting it based on the format "{key} in {expression}".
      const tokens = forAttr.split(" in ", 2);
      if (tokens.length !== 2) {
        throw new Error(`Invalid :for format: \`${forAttr}\`. Expected "{key} in {expression}".`);
      }

      // Keep track of all the child nodes added.
      const children: Node[] = [];

      // Compute the container expression and track dependencies.
      const [loopKey, itemsExpr] = tokens;
      const awaiter = this.computed(() => {
        const items = this.eval(itemsExpr, { $elem: node });
        this.log(":for list items:", items);

        // Remove all the previously added children, if any.
        children.splice(0, children.length).forEach((child) => {
          removeChild(parent, child);
          this._skipNodes.delete(child);
        });

        // Validate that the expression returns a list of items.
        if (!Array.isArray(items)) {
          console.error(`Expression did not yield a list: \`${itemsExpr}\` => \`${items}\``);
          return Promise.resolve();
        }

        // Loop through the container items.
        const promises: Promise<void>[] = [];
        for (const item of items) {
          // Create a subrenderer that will hold the loop item and all node descendants.
          const subrenderer = this.clone();
          subrenderer.$[loopKey] = item;

          // Create a new HTML element for each item and add them to parent node.
          const copy = node.cloneNode(true);

          // Also add the new element to the store.
          children.push(copy);

          // Since the element will be handled by a subrenderer, skip it in parent renderer.
          this._skipNodes.add(copy);

          // Render the element using the subrenderer.
          promises.push(subrenderer.mount(copy, params));
          this.log("Rendered list child:\n", copy, (copy as HTMLElement).outerHTML);
        }

        // Insert the new children into the parent container.
        const reference = template.nextSibling as ChildNode;
        for (const child of children) {
          insertBefore(parent, child, reference);
        }

        return Promise.all(promises);
      }).value;

      await awaiter
        .catch((exc) => {
          console.error(exc);
          throw new Error(exc);
        })
        .then();
    }
  };

  export const resolveBindAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const bindExpr = getAttribute(elem, ":bind");
    if (bindExpr) {
      this.log(":bind attribute found in:\n", node);

      // The change events we listen for can be overriden by user.
      const defaultEvents = ["change", "input"];
      const updateEvents = getAttribute(elem, ":bind-events")?.split(",") || defaultEvents;

      // Remove the processed attributes from node.
      removeAttribute(elem, ":bind");
      removeAttribute(elem, ":bind-events");

      // If the element is of type checkbox, we bind to the "checked" property.
      const prop = getAttribute(elem, "type") === "checkbox" ? "checked" : "value";

      // Watch for updates in the store and bind our property ==> node value.
      const propExpr = `$elem.${prop} = ${bindExpr}`;
      // await this.watchExpr(propExpr, { $elem: node }, (result) => ((elem as any)[prop] = result));

      // Bind node value ==> our property.
      const nodeExpr = `${bindExpr} = $elem.${prop}`;

      // Watch for updates in the node's value.
      for (const event of updateEvents) {
        node.addEventListener(event, () => this.eval(nodeExpr, { $elem: node }));
      }
    }
  };

  export const resolveShowAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as HTMLElement;
    const showExpr = getAttribute(elem, ":show");
    if (showExpr) {
      this.log(":show attribute found in:\n", node);

      // Remove the processed attributes from node.
      removeAttribute(elem, ":show");

      // TODO: Instead of using element display, insert a dummy <template> to track position of
      // child, then replace it with the original child when needed.

      // Store the original display value to reset it later if needed.
      const display =
        elem.style?.display === "none"
          ? ""
          : elem.style?.display ??
            getAttribute(elem, "style")
              ?.split(";")
              ?.find((x) => x.split(":")[0] === "display")
              ?.split(":")
              ?.at(1)
              ?.trim();

      // // Compute the function's result and track dependencies.
      // await this.watchExpr(showExpr, { $elem: node }, (result) => {
      //   // If the result is false, set the node's display to none.
      //   if (elem.style) elem.style.display = result ? display : "none";
      //   else setAttribute(elem, "style", `display: ${result ? display : "none"};`);
      // });
    }
  };
}
