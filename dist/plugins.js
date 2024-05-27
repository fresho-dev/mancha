import { appendChild, attributeNameToCamelCase, createElement, getAttribute, getNodeValue, insertBefore, removeAttribute, removeChild, replaceChildren, replaceWith, setAttribute, setNodeValue, setTextContent, } from "./dome.js";
import { isRelativePath, traverse } from "./core.js";
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
export var RendererPlugins;
(function (RendererPlugins) {
    RendererPlugins.resolveIncludes = async function (node, params) {
        const elem = node;
        // Early exit: node must be an <include> element.
        if (elem.tagName?.toLocaleLowerCase() !== "include")
            return;
        this.log("<include> tag found in:\n", node);
        this.log("<include> params:", params);
        // Early exit: <include> tags must have a src attribute.
        const src = getAttribute(elem, "src");
        if (!src) {
            throw new Error(`"src" attribute missing from ${node}.`);
        }
        // The included file will replace this tag, and all elements will be fully preprocessed.
        const handler = (fragment) => {
            replaceWith(node, ...Array.from(fragment.childNodes));
        };
        // Compute the subparameters being passed down to the included file.
        const subparameters = { ...params, root: false, maxdepth: params?.maxdepth - 1 };
        if (subparameters.maxdepth === 0)
            throw new Error("Maximum recursion depth reached.");
        // Case 1: Absolute remote path.
        if (src.includes("://") || src.startsWith("//")) {
            this.log("Including remote file from absolute path:", src);
            await this.preprocessRemote(src, subparameters).then(handler);
            // Case 2: Relative remote path.
        }
        else if (params?.dirpath?.includes("://") || params?.dirpath?.startsWith("//")) {
            const relpath = params.dirpath && params.dirpath !== "." ? `${params.dirpath}/${src}` : src;
            this.log("Including remote file from relative path:", relpath);
            await this.preprocessRemote(relpath, subparameters).then(handler);
            // Case 3: Local absolute path.
        }
        else if (src.charAt(0) === "/") {
            this.log("Including local file from absolute path:", src);
            await this.preprocessLocal(src, subparameters).then(handler);
            // Case 4: Local relative path.
        }
        else {
            const relpath = params?.dirpath && params?.dirpath !== "." ? `${params?.dirpath}/${src}` : src;
            this.log("Including local file from relative path:", relpath);
            await this.preprocessLocal(relpath, subparameters).then(handler);
        }
    };
    RendererPlugins.rebaseRelativePaths = async function (node, params) {
        const elem = node;
        const tagName = elem.tagName?.toLowerCase();
        // Early exit: if there is no dirpath, we cannot rebase relative paths.
        if (!params?.dirpath)
            return;
        // We have to retrieve the attribute, because the node property is always an absolute path.
        const src = getAttribute(elem, "src");
        const href = getAttribute(elem, "href");
        const data = getAttribute(elem, "data");
        // Early exit: if there is no element attribute to rebase, we can skip this step.
        const anyattr = src || href || data;
        if (!anyattr)
            return;
        if (anyattr && isRelativePath(anyattr)) {
            this.log("Rebasing relative path as:", params.dirpath, "/", anyattr);
        }
        if (tagName === "img" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "a" && href && isRelativePath(href)) {
            setAttribute(elem, "href", `${params.dirpath}/${href}`);
        }
        else if (tagName === "link" && href && isRelativePath(href)) {
            setAttribute(elem, "href", `${params.dirpath}/${href}`);
        }
        else if (tagName === "script" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "source" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "audio" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "video" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "track" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "iframe" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "object" && data && isRelativePath(data)) {
            setAttribute(elem, "data", `${params.dirpath}/${data}`);
        }
        else if (tagName === "input" && src && isRelativePath(src)) {
            setAttribute(elem, "src", `${params.dirpath}/${src}`);
        }
        else if (tagName === "area" && href && isRelativePath(href)) {
            setAttribute(elem, "href", `${params.dirpath}/${href}`);
        }
        else if (tagName === "base" && href && isRelativePath(href)) {
            setAttribute(elem, "href", `${params.dirpath}/${href}`);
        }
    };
    RendererPlugins.resolveTextNodeExpressions = async function (node, params) {
        if (node.nodeType !== 3)
            return;
        const content = getNodeValue(node) || "";
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
            setNodeValue(node, updatedContent);
        };
        // Trigger the eval and pass our full node update function as the callback.
        await Promise.all(expressions.map((expr) => this.watchExpr(expr, { $elem: node }, updateNode)));
    };
    RendererPlugins.resolveDataAttribute = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        const dataAttr = getAttribute(elem, ":data");
        if (dataAttr) {
            this.log(":data attribute found in:\n", node);
            removeAttribute(elem, ":data");
            const [result] = await this.eval(dataAttr, { $elem: node });
            await this.update(result);
        }
    };
    RendererPlugins.resolveWatchAttribute = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        const watchAttr = getAttribute(elem, "@watch");
        if (watchAttr) {
            this.log("@watch attribute found in:\n", node);
            // Remove the attribute from the node.
            removeAttribute(elem, "@watch");
            // Compute the function's result.
            await this.watchExpr(watchAttr, { $elem: node }, () => { });
        }
    };
    RendererPlugins.resolveTextAttributes = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        const textAttr = getAttribute(elem, "$text");
        if (textAttr) {
            this.log("$text attribute found in:\n", node);
            // Remove the attribute from the node.
            removeAttribute(elem, "$text");
            // Compute the function's result and track dependencies.
            await this.watchExpr(textAttr, { $elem: node }, (result) => setTextContent(node, result));
        }
    };
    RendererPlugins.resolveHtmlAttribute = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        const htmlAttr = getAttribute(elem, "$html");
        if (htmlAttr) {
            this.log("$html attribute found in:\n", node);
            // Remove the attribute from the node.
            removeAttribute(elem, "$html");
            // Obtain a subrenderer for the node contents.
            const subrenderer = this.clone();
            // Compute the function's result and track dependencies.
            await this.watchExpr(htmlAttr, { $elem: node }, async (result) => {
                const fragment = await subrenderer.preprocessString(result, params);
                await subrenderer.renderNode(fragment, params);
                replaceChildren(elem, fragment);
            });
        }
    };
    RendererPlugins.resolvePropAttributes = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        for (const attr of Array.from(elem.attributes || [])) {
            if (attr.name.startsWith("$") && !KW_ATTRIBUTES.has(attr.name)) {
                this.log(attr.name, "attribute found in:\n", node);
                // Remove the attribute from the node.
                removeAttribute(elem, attr.name);
                // Compute the function's result and track dependencies.
                const propName = attributeNameToCamelCase(attr.name.slice(1));
                await this.watchExpr(attr.value, { $elem: node }, (result) => (node[propName] = result));
            }
        }
    };
    RendererPlugins.resolveAttrAttributes = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        for (const attr of Array.from(elem.attributes || [])) {
            if (attr.name.startsWith(":") && !KW_ATTRIBUTES.has(attr.name)) {
                this.log(attr.name, "attribute found in:\n", node);
                // Remove the processed attributes from node.
                removeAttribute(elem, attr.name);
                // Compute the function's result and track dependencies.
                const attrName = attr.name.slice(1);
                await this.watchExpr(attr.value, { $elem: node }, (result) => setAttribute(elem, attrName, result));
            }
        }
    };
    RendererPlugins.resolveEventAttributes = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
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
    RendererPlugins.resolveForAttribute = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
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
            const parent = node.parentNode;
            const template = createElement("template", node.ownerDocument);
            insertBefore(parent, template, node);
            removeChild(parent, node);
            appendChild(template, node);
            this.log(":for template:\n", template);
            // Tokenize the input by splitting it based on the format "{key} in {expression}".
            const tokens = forAttr.split(" in ", 2);
            if (tokens.length !== 2) {
                throw new Error(`Invalid :for format: \`${forAttr}\`. Expected "{key} in {expression}".`);
            }
            // Keep track of all the child nodes added.
            const children = [];
            // Compute the container expression and track dependencies.
            const [loopKey, itemsExpr] = tokens;
            await this.watchExpr(itemsExpr, { $elem: node }, (items) => {
                this.log(":for list items:", items);
                // Acquire the lock atomically.
                this.lock = this.lock
                    .then(() => new Promise(async (resolve) => {
                    // Remove all the previously added children, if any.
                    children.splice(0, children.length).forEach((child) => {
                        removeChild(parent, child);
                        this._skipNodes.delete(child);
                    });
                    // Validate that the expression returns a list of items.
                    if (!Array.isArray(items)) {
                        console.error(`Expression did not yield a list: \`${itemsExpr}\` => \`${items}\``);
                        return resolve();
                    }
                    // Loop through the container items.
                    for (const item of items) {
                        // Create a subrenderer that will hold the loop item and all node descendants.
                        const subrenderer = this.clone();
                        await subrenderer.set(loopKey, item);
                        // Create a new HTML element for each item and add them to parent node.
                        const copy = node.cloneNode(true);
                        // Also add the new element to the store.
                        children.push(copy);
                        // Since the element will be handled by a subrenderer, skip it in parent renderer.
                        this._skipNodes.add(copy);
                        // Render the element using the subrenderer.
                        await subrenderer.mount(copy, params);
                        this.log("Rendered list child:\n", copy, copy.outerHTML);
                    }
                    // Insert the new children into the parent container.
                    const reference = template.nextSibling;
                    for (const child of children) {
                        insertBefore(parent, child, reference);
                    }
                    // Release the lock.
                    resolve();
                }))
                    .catch((exc) => {
                    console.error(exc);
                    throw new Error(exc);
                })
                    .then();
                // Return the lock so the whole operation can be awaited.
                return this.lock;
            });
        }
    };
    RendererPlugins.resolveBindAttribute = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
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
            await this.watchExpr(propExpr, { $elem: node }, (result) => (elem[prop] = result));
            // Bind node value ==> our property.
            const nodeExpr = `${bindExpr} = $elem.${prop}`;
            // Watch for updates in the node's value.
            for (const event of updateEvents) {
                node.addEventListener(event, () => this.eval(nodeExpr, { $elem: node }));
            }
        }
    };
    RendererPlugins.resolveShowAttribute = async function (node, params) {
        if (this._skipNodes.has(node))
            return;
        const elem = node;
        const showExpr = getAttribute(elem, ":show");
        if (showExpr) {
            this.log(":show attribute found in:\n", node);
            // Remove the processed attributes from node.
            removeAttribute(elem, ":show");
            // TODO: Instead of using element display, insert a dummy <template> to track position of
            // child, then replace it with the original child when needed.
            // Store the original display value to reset it later if needed.
            const display = elem.style?.display === "none"
                ? ""
                : elem.style?.display ??
                    getAttribute(elem, "style")
                        ?.split(";")
                        ?.find((x) => x.split(":")[0] === "display")
                        ?.split(":")
                        ?.at(1)
                        ?.trim();
            // Compute the function's result and track dependencies.
            await this.watchExpr(showExpr, { $elem: node }, (result) => {
                // If the result is false, set the node's display to none.
                if (elem.style)
                    elem.style.display = result ? display : "none";
                else
                    setAttribute(elem, "style", `display: ${result ? display : "none"};`);
            });
        }
    };
})(RendererPlugins || (RendererPlugins = {}));
