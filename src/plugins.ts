import { attributeNameToCamelCase } from "./attributes";
import { isRelativePath, traverse } from "./core";
import { RendererPlugin } from "./interfaces";

const KW_ATTRIBUTES = new Set([
  ":bind",
  ":bind-events",
  ":data",
  ":for",
  ":show",
  "@watch",
  "$html",
]);
const ATTR_SHORTHANDS: { [key: string]: string } = {
  $text: "$text-content",
  // $html: "$inner-HTML",
};

/** @internal */
export namespace RendererPlugins {
  export const resolveIncludes: RendererPlugin = async function (node, params) {
    const elem = node as Element;

    // Early exit: node must be an <include> element.
    if (elem.tagName?.toLocaleLowerCase() !== "include") return;
    this.log("<include> tag found in:\n", node);
    this.log("<include> params:", params);

    // Early exit: <include> tags must have a src attribute.
    const src = elem.getAttribute?.("src");
    if (!src) {
      throw new Error(`"src" attribute missing from ${node}.`);
    }

    // The included file will replace this tag, and all elements will be fully preprocessed.
    const handler = (fragment: DocumentFragment) => {
      node.replaceWith(...Array.from(fragment.childNodes));
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
      const relpath = params.dirpath && params.dirpath !== "." ? `${params.dirpath}/${src}` : src;
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
    const elem = node as any;
    const tagName = elem.tagName?.toLowerCase();

    // Early exit: if there is no dirpath, we cannot rebase relative paths.
    if (!params?.dirpath) return;

    // We have to retrieve the attribute, because the node property is always an absolute path.
    const src = (node as Element).getAttribute?.("src");
    const href = (node as Element).getAttribute?.("href");
    const data = (node as Element).getAttribute?.("data");

    // Early exit: if there is no element attribute to rebase, we can skip this step.
    const anyattr = src || href || data;
    if (!anyattr) return;
    if (anyattr && isRelativePath(anyattr)) {
      this.log("Rebasing relative path as:", params.dirpath, "/", anyattr);
    }

    if (tagName === "img" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "a" && href && isRelativePath(href)) {
      elem.href = `${params.dirpath}/${href}`;
    } else if (tagName === "link" && href && isRelativePath(href)) {
      elem.href = `${params.dirpath}/${href}`;
    } else if (tagName === "script" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "source" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "audio" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "video" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "track" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "iframe" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "object" && data && isRelativePath(data)) {
      elem.data = `${params.dirpath}/${data}`;
    } else if (tagName === "input" && src && isRelativePath(src)) {
      elem.src = `${params.dirpath}/${src}`;
    } else if (tagName === "area" && href && isRelativePath(href)) {
      elem.href = `${params.dirpath}/${href}`;
    } else if (tagName === "base" && href && isRelativePath(href)) {
      elem.href = `${params.dirpath}/${href}`;
    }
  };

  export const resolveTextNodeExpressions: RendererPlugin = async function (node, params) {
    if (node.nodeType !== 3) return;
    const content = node.nodeValue || "";
    this.log(`Processing node content value:\n`, content);

    // Identify all the expressions found in the content.
    const matcher = new RegExp(/{{ ([^}]+) }}/gm);
    const expressions = Array.from(content.matchAll(matcher)).map((match) => match[1]);

    // To update the node, we have to re-evaluate all of the expressions since that's much simpler
    // than caching results.
    const updateNode = async () => {
      let updatedContent = content;
      for (const expr of expressions) {
        const [result] = await this.eval(expr, { $elem: node });
        updatedContent = updatedContent.replace(`{{ ${expr} }}`, String(result));
      }
      node.nodeValue = updatedContent;
    };

    // Trigger the eval and pass our full node update function as the callback.
    await Promise.all(expressions.map((expr) => this.watchExpr(expr, { $elem: node }, updateNode)));
  };

  export const resolveDataAttribute: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const dataAttr = elem.getAttribute?.(":data");
    if (dataAttr) {
      this.log(":data attribute found in:\n", node);

      elem.removeAttribute(":data");
      const [result] = await this.eval(dataAttr, { $elem: node });
      await this.update(result);
    }
  };

  export const resolveWatchAttribute: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const watchAttr = elem.getAttribute?.("@watch");
    if (watchAttr) {
      this.log("@watch attribute found in:\n", node);

      // Remove the attribute from the node.
      elem.removeAttribute("@watch");

      // Compute the function's result.
      await this.watchExpr(watchAttr, { $elem: node }, () => {});
    }
  };

  export const resolveHtmlAttribute: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const htmlAttr = elem.getAttribute?.("$html");
    if (htmlAttr) {
      this.log("$html attribute found in:\n", node);

      // Remove the attribute from the node.
      elem.removeAttribute("$html");

      // Obtain a subrenderer for the node contents.
      const subrenderer = this.clone();

      // Compute the function's result and track dependencies.
      await this.watchExpr(htmlAttr, { $elem: node }, async (result) => {
        const fragment = await subrenderer.preprocessString(result, params);
        await subrenderer.renderNode(fragment, params);
        elem.replaceChildren(fragment);
      });
    }
  };

  export const resolvePropAttributes: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith("$") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(attr.name, "attribute found in:\n", node);

        // Remove the attribute from the node.
        elem.removeAttribute(attr.name);

        // Apply any shorthand conversions if necessary.
        const propName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);

        // Compute the function's result and track dependencies.
        const prop = attributeNameToCamelCase(propName);
        await this.watchExpr(
          attr.value,
          { $elem: node },
          (result) => ((node as any)[prop] = result)
        );
      }
    }
  };

  export const resolveAttrAttributes: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith(":") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(attr.name, "attribute found in:\n", node);

        // Remove the processed attributes from node.
        elem.removeAttribute(attr.name);

        // Apply any shorthand conversions if necessary.
        const attrName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);

        // Compute the function's result and track dependencies.
        await this.watchExpr(attr.value, { $elem: node }, (result) =>
          elem.setAttribute(attrName, result as string)
        );
      }
    }
  };

  export const resolveEventAttributes: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    for (const attr of Array.from(elem.attributes || [])) {
      if (attr.name.startsWith("@") && !KW_ATTRIBUTES.has(attr.name)) {
        this.log(attr.name, "attribute found in:\n", node);

        // Remove the processed attributes from node.
        elem.removeAttribute(attr.name);

        node.addEventListener?.(attr.name.substring(1), (event) => {
          this.eval(attr.value, { $elem: node, $event: event });
        });
      }
    }
  };

  export const resolveForAttribute: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const forAttr = elem.getAttribute?.(":for")?.trim();
    if (forAttr) {
      this.log(":for attribute found in:\n", node);

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
      await this.watchExpr(itemsExpr, { $elem: node }, (items) => {
        this.log(":for list items:", items);

        // Acquire the lock atomically.
        this.lock = this.lock.then(
          () =>
            new Promise(async (resolve) => {
              // Remove all the previously added children, if any.
              children.splice(0, children.length).forEach((child) => {
                parent.removeChild(child);
                this.skipNodes.delete(child);
              });

              // Validate that the expression returns a list of items.
              if (!Array.isArray(items)) {
                console.error(`Expression did not yield a list: \`${itemsExpr}\` => \`${items}\``);
                return resolve();
              }

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

                // Since the element will be handled by a subrenderer, skip it in parent renderer.
                this.skipNodes.add(copy);

                // Render the element using the subrenderer.
                await subrenderer.mount(copy, params);
                this.log("Rendered list child:\n", copy, (copy as HTMLElement).outerHTML);
              }

              // Release the lock.
              resolve();
            })
        );

        // Return the lock so the whole operation can be awaited.
        return this.lock;
      });
    }
  };

  export const resolveBindAttribute: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as Element;
    const bindKey = elem.getAttribute?.(":bind");
    if (bindKey) {
      this.log(":bind attribute found in:\n", node);

      // The change events we listen for can be overriden by user.
      const defaultEvents = ["change", "input"];
      const updateEvents = elem.getAttribute?.(":bind-events")?.split(",") || defaultEvents;

      // Remove the processed attributes from node.
      elem.removeAttribute(":bind");
      elem.removeAttribute(":bind-events");

      // If the element is of type checkbox, we bind to the "checked" property.
      const prop = elem.getAttribute("type") === "checkbox" ? "checked" : "value";

      // If the key is not found in our store, create it and initialize it with the node's value.
      if (!this.has(bindKey)) await this.set(bindKey, (elem as any)[prop]);

      // Set the node's value to our current value.
      (elem as any)[prop] = this.get(bindKey);

      // Watch for updates in the node's value.
      for (const event of updateEvents) {
        node.addEventListener(event, () => this.set(bindKey, (elem as any)[prop]));
      }

      // Watch for updates in the store.
      this.watch([bindKey], () => ((elem as any)[prop] = this.get(bindKey)));
    }
  };

  export const resolveShowAttribute: RendererPlugin = async function (node, params) {
    if (this.skipNodes.has(node)) return;
    const elem = node as HTMLElement;
    const showExpr = elem.getAttribute?.(":show");
    if (showExpr) {
      this.log(":show attribute found in:\n", node);

      // Remove the processed attributes from node.
      elem.removeAttribute(":show");

      // TODO: Instead of using element display, insert a dummy <template> to track position of child,
      // then replace it with the original child when needed.

      // Store the original display value to reset it later if needed.
      const display = elem.style.display === "none" ? "" : elem.style.display;

      // Compute the function's result and track dependencies.
      await this.watchExpr(showExpr, { $elem: node }, (result) => {
        // If the result is false, set the node's display to none.
        elem.style.display = result ? display : "none";
      });
    }
  };
}
