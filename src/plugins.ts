import { safeAnchorEl, safeAreaEl } from "safevalues/dom";
import {
  appendChild,
  attributeNameToCamelCase,
  cloneAttribute,
  ellipsize,
  firstElementChild,
  getAttribute,
  insertBefore,
  isRelativePath,
  nodeToString,
  removeAttribute,
  removeChild,
  replaceChildren,
  replaceWith,
  setAttribute,
  traverse,
} from "./dome.js";
import { ParserParams, RenderParams, RendererPlugin } from "./interfaces.js";
import { Iterator } from "./iterator.js";

/** @internal */
export namespace RendererPlugins {
  export const resolveIncludes: RendererPlugin = async function (node, params) {
    const elem = node as Element;

    // Early exit: node must be an <include> element.
    if (elem.tagName?.toLocaleLowerCase() !== "include") return;
    this.log("<include> tag found in:\n", nodeToString(node, 128));
    this.log("<include> params:", params);

    // Early exit: <include> tags must have a src attribute.
    const src = getAttribute(elem, "src");
    if (!src) {
      throw new Error(`"src" attribute missing from ${node}.`);
    }

    // The included file will replace this tag, and all elements will be fully preprocessed.
    const handler = (fragment: Document | DocumentFragment) => {
      // Add whatever attributes the include tag had to the first child.
      const child = fragment.firstChild as Element | null;
      for (const attr of Array.from(elem.attributes)) {
        if (child && attr.name !== "src") cloneAttribute(elem, child, attr.name);
      }
      // Replace the include tag with the contents of the included file.
      replaceWith(node, ...fragment.childNodes);
    };

    // Compute the subparameters being passed down to the included file.
    const subparameters: RenderParams & ParserParams = {
      ...params,
      rootDocument: false,
      maxdepth: params?.maxdepth!! - 1,
    };
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

    // Early exit: if there is no element attribute to rebase, we can skip this step.
    const pathref = src || href;
    if (pathref && isRelativePath(pathref)) {
      const relpath = `${params.dirpath}/${pathref}`;
      this.log("Rebasing relative path as:", relpath);

      if (tagName === "img") {
        (elem as HTMLImageElement).src = relpath;
      } else if (tagName === "a") {
        safeAnchorEl.setHref(elem as HTMLAnchorElement, relpath);
      } else if (tagName === "source") {
        (elem as HTMLSourceElement).src = relpath;
      } else if (tagName === "audio") {
        (elem as HTMLAudioElement).src = relpath;
      } else if (tagName === "video") {
        (elem as HTMLVideoElement).src = relpath;
      } else if (tagName === "track") {
        (elem as HTMLTrackElement).src = relpath;
      } else if (tagName === "input") {
        (elem as HTMLInputElement).src = relpath;
      } else if (tagName === "area") {
        safeAreaEl.setHref(elem as HTMLAreaElement, relpath);
      } else {
        this.log("Unable to rebase relative path for element:", tagName);
      }
    }
  };

  export const registerCustomElements: RendererPlugin = async function (node, params) {
    const elem = node as Element;
    if (elem.tagName?.toLowerCase() === "template" && getAttribute(elem, "is")) {
      const tagName = getAttribute(elem, "is")?.toLowerCase() as string;
      if (!this._customElements.has(tagName)) {
        this.log(`Registering custom element: ${tagName}\n`, nodeToString(elem, 128));
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
      this.log(`Processing custom element: ${tagName}\n`, nodeToString(elem, 128));
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
    const content = node.nodeValue || "";
    if (node.nodeType !== 3 || !content?.trim()) return;
    this.log(`Processing node content value:\n`, ellipsize(content, 128));

    // Identify all the expressions found in the content.
    const matcher = new RegExp(/{{ ([^}]+) }}/gm);
    const expressions = Array.from(content.matchAll(matcher)).map((match) => match[1]);

    // To update the node, we have to re-evaluate all of the expressions since that's much simpler
    // than caching results.
    return this.effect(function () {
      let updatedContent = content;
      for (const expr of expressions) {
        const result = this.eval(expr, { $elem: node }) as string;
        updatedContent = updatedContent.replace(`{{ ${expr} }}`, String(result));
      }
      node.nodeValue = updatedContent;
    });
  };

  export const resolveDataAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const dataAttr = getAttribute(elem, ":data");
    if (dataAttr) {
      this.log(":data attribute found in:\n", nodeToString(node, 128));

      // Remove the attribute from the node.
      removeAttribute(elem, ":data");

      // Create a subrenderer and process the tag, unless it's the root node.
      const subrenderer = params?.rootNode === node ? this : this.clone();
      (node as any).renderer = subrenderer;

      // Evaluate the expression.
      const result = subrenderer.eval(dataAttr, { $elem: node }) as Object;

      // Await any promises in the result object.
      await Promise.all(Object.entries(result).map(([key, value]) => subrenderer.set(key, value)));

      // Skip all the children of the current node, if it's a subrenderer.
      if (subrenderer !== this) {
        for (const child of traverse(node, this._skipNodes)) {
          this._skipNodes.add(child);
        }
      }

      // Mount the current node with the subrenderer.
      await subrenderer.mount(node, params);
    }
  };

  export const resolveClassAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as HTMLElement;
    const classAttr = getAttribute(elem, ":class");
    if (classAttr) {
      this.log(":class attribute found in:\n", nodeToString(node, 128));

      // Remove the attribute from the node.
      removeAttribute(elem, ":class");

      // Store the original class attribute, if any.
      const originalClass = getAttribute(elem, "class") || "";

      // Compute the function's result.
      return this.effect(function () {
        const result = this.eval(classAttr, { $elem: node });
        setAttribute(elem, "class", (result ? `${originalClass} ${result}` : originalClass).trim());
      });
    }
  };

  export const resolveTextAttributes: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const textAttr = getAttribute(elem, ":text");
    if (textAttr) {
      this.log(":text attribute found in:\n", nodeToString(node, 128));

      // Remove the attribute from the node.
      removeAttribute(elem, ":text");

      // Compute the function's result and track dependencies.
      const setTextContent = (content: string) => this.textContent(node, content);
      return this.effect(function () {
        setTextContent(this.eval(textAttr, { $elem: node }) as string);
      });
    }
  };

  export const resolveHtmlAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const htmlAttr = getAttribute(elem, ":html");
    if (htmlAttr) {
      this.log(":html attribute found in:\n", nodeToString(node, 128));

      // Remove the attribute from the node.
      removeAttribute(elem, ":html");

      // Compute the function's result and track dependencies.
      return this.effect(function () {
        const result = this.eval(htmlAttr, { $elem: node }) as string;
        return new Promise(async (resolve) => {
          const fragment = await this.preprocessString(result, params);
          await this.renderNode(fragment);
          replaceChildren(elem, fragment);
          resolve();
        });
      });
    }
  };

  export const resolveEventAttributes: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith(":on:")) {
        this.log(attr.name, "attribute found in:\n", nodeToString(node, 128));

        // Remove the processed attributes from node.
        removeAttribute(elem, attr.name);

        node.addEventListener?.(attr.name.substring(4), (event) => {
          return this.eval(attr.value, { $elem: node, $event: event });
        });
      }
    }
  };

  export const resolveForAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const forAttr = getAttribute(elem, ":for")?.trim();
    if (forAttr) {
      this.log(":for attribute found in:\n", nodeToString(node, 128));

      // Remove the processed attributes from node.
      removeAttribute(elem, ":for");

      // Ensure the node and its children are not processed by subsequent steps.
      for (const child of traverse(node, this._skipNodes)) {
        this._skipNodes.add(child);
      }

      // Place the template node into a template element.
      const parent = node.parentNode!!;
      const template = this.createElement("template", node.ownerDocument);
      insertBefore(parent, template as Node, node);
      removeChild(parent, node);
      appendChild(template as Node, node);
      this.log(":for template:\n", nodeToString(template, 128));

      // Tokenize the input by splitting it based on the format "{key} in {expression}".
      const tokens = forAttr.split(" in ", 2);
      if (tokens.length !== 2) {
        throw new Error(`Invalid :for format: \`${forAttr}\`. Expected "{key} in {expression}".`);
      }

      // Keep track of all the child nodes added.
      const children: Node[] = [];

      // Compute the container expression and track dependencies.
      const [loopKey, itemsExpr] = tokens;
      await this.effect(function () {
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
        const awaiters: Promise<void>[] = [];
        for (const item of items) {
          // Create a subrenderer that will hold the loop item and all node descendants.
          const subrenderer = this.clone();
          subrenderer.set(loopKey, item);

          // Create a new HTML element for each item and add them to parent node.
          const copy = node.cloneNode(true);

          // Also add the new element to the store.
          children.push(copy);

          // Since the element will be handled by a subrenderer, skip it in parent renderer.
          this._skipNodes.add(copy);

          // Render the element using the subrenderer.
          awaiters.push(subrenderer.mount(copy, params));
          this.log("Rendered list child:\n", nodeToString(copy, 128));
        }

        // Insert the new children into the parent container.
        const reference = template.nextSibling as ChildNode;
        for (const child of children) {
          insertBefore(parent, child, reference);
        }

        return Promise.all(awaiters).then(() => {
          // Hacky workaround: if the parent node is a <select> element, we have to reselect the
          // value to trigger the change event.
          if (parent.nodeName?.toUpperCase() === "SELECT") {
            const elem = parent as HTMLSelectElement;
            const value = elem.value;
            elem.value = "";
            elem.value = value;
          }
        });
      });
    }
  };

  export const resolveBindAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    const bindExpr = getAttribute(elem, ":bind");
    if (bindExpr) {
      this.log(":bind attribute found in:\n", nodeToString(node, 128));

      // The change events we listen for can be overriden by user.
      const defaultEvents = ["change", "input"];
      const updateEvents = getAttribute(elem, ":bind:on")?.split(",") || defaultEvents;

      // Remove the processed attributes from node.
      removeAttribute(elem, ":bind");
      removeAttribute(elem, ":bind:on");

      // If the element is of type checkbox, we bind to the "checked" property.
      const prop = getAttribute(elem, "type") === "checkbox" ? "checked" : "value";

      // Watch for updates in the store and bind our property ==> node value.
      this.effect(function () {
        const result = this.eval(bindExpr, { $elem: node });
        (elem as any)[prop] = result;
      });

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
      this.log(":show attribute found in:\n", nodeToString(node, 128));

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

      // Compute the function's result and track dependencies.
      this.effect(function () {
        const result = this.eval(showExpr, { $elem: node });
        // If the result is false, set the node's display to none.
        if (elem.style) elem.style.display = result ? display : "none";
        else setAttribute(elem, "style", `display: ${result ? display : "none"};`);
      });
    }
  };

  export const resolveCustomAttribute: RendererPlugin = async function (node, params) {
    if (this._skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith(":")) {
        this.log(attr.name, "attribute found in:\n", nodeToString(node, 128));

        // Remove the processed attributes from node.
        removeAttribute(elem, attr.name);

        const propName = attributeNameToCamelCase(attr.name.substring(1));
        this.effect(function () {
          const propValue = this.eval(attr.value, { $elem: node });
          (elem as any)[propName] = propValue;
        });
      }
    }
  };
}
