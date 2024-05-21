"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveShowAttribute = exports.resolveBindAttribute = exports.resolveForAttribute = exports.resolveEventAttributes = exports.resolveAttrAttributes = exports.resolvePropAttributes = exports.resolveHtmlAttribute = exports.resolveWatchAttribute = exports.resolveDataAttribute = exports.resolveTextNodeExpressions = exports.rebaseRelativePaths = exports.resolveIncludes = void 0;
const attributes_1 = require("./attributes");
const core_1 = require("./core");
const KW_ATTRIBUTES = new Set([
    ":bind",
    ":bind-events",
    ":data",
    ":for",
    ":show",
    "@watch",
    "$html",
]);
const ATTR_SHORTHANDS = {
    $text: "$text-content",
    // $html: "$inner-HTML",
};
const resolveIncludes = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const elem = node;
        // Early exit: node must be an <include> element.
        if (((_a = elem.tagName) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) !== "include")
            return;
        this.log("<include> tag found in:\n", node);
        this.log("<include> params:", params);
        // Early exit: <include> tags must have a src attribute.
        const src = (_b = elem.getAttribute) === null || _b === void 0 ? void 0 : _b.call(elem, "src");
        if (!src) {
            throw new Error(`"src" attribute missing from ${node}.`);
        }
        // The included file will replace this tag, and all elements will be fully preprocessed.
        const handler = (fragment) => {
            node.replaceWith(...Array.from(fragment.childNodes));
        };
        // Compute the subparameters being passed down to the included file.
        const subparameters = Object.assign(Object.assign({}, params), { root: false, maxdepth: params.maxdepth - 1 });
        if (subparameters.maxdepth === 0)
            throw new Error("Maximum recursion depth reached.");
        // Case 1: Absolute remote path.
        if (src.includes("://") || src.startsWith("//")) {
            this.log("Including remote file from absolute path:", src);
            yield this.preprocessRemote(src, subparameters).then(handler);
            // Case 2: Relative remote path.
        }
        else if (((_c = params.dirpath) === null || _c === void 0 ? void 0 : _c.includes("://")) || ((_d = params.dirpath) === null || _d === void 0 ? void 0 : _d.startsWith("//"))) {
            const relpath = params.dirpath && params.dirpath !== "." ? `${params.dirpath}/${src}` : src;
            this.log("Including remote file from relative path:", relpath);
            yield this.preprocessRemote(relpath, subparameters).then(handler);
            // Case 3: Local absolute path.
        }
        else if (src.charAt(0) === "/") {
            this.log("Including local file from absolute path:", src);
            yield this.preprocessLocal(src, subparameters).then(handler);
            // Case 4: Local relative path.
        }
        else {
            const relpath = params.dirpath && params.dirpath !== "." ? `${params.dirpath}/${src}` : src;
            this.log("Including local file from relative path:", relpath);
            yield this.preprocessLocal(relpath, subparameters).then(handler);
        }
    });
};
exports.resolveIncludes = resolveIncludes;
const rebaseRelativePaths = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const elem = node;
        const tagName = (_a = elem.tagName) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        // Early exit: if there is no dirpath, we cannot rebase relative paths.
        if (!params.dirpath)
            return;
        // We have to retrieve the attribute, because the node property is always an absolute path.
        const src = (_c = (_b = node).getAttribute) === null || _c === void 0 ? void 0 : _c.call(_b, "src");
        const href = (_e = (_d = node).getAttribute) === null || _e === void 0 ? void 0 : _e.call(_d, "href");
        const data = (_g = (_f = node).getAttribute) === null || _g === void 0 ? void 0 : _g.call(_f, "data");
        // Early exit: if there is no element attribute to rebase, we can skip this step.
        const anyattr = src || href || data;
        if (!anyattr)
            return;
        if (anyattr && (0, core_1.isRelativePath)(anyattr)) {
            this.log("Rebasing relative path as:", params.dirpath, "/", anyattr);
        }
        if (tagName === "img" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "a" && href && (0, core_1.isRelativePath)(href)) {
            elem.href = `${params.dirpath}/${href}`;
        }
        else if (tagName === "link" && href && (0, core_1.isRelativePath)(href)) {
            elem.href = `${params.dirpath}/${href}`;
        }
        else if (tagName === "script" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "source" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "audio" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "video" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "track" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "iframe" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "object" && data && (0, core_1.isRelativePath)(data)) {
            elem.data = `${params.dirpath}/${data}`;
        }
        else if (tagName === "input" && src && (0, core_1.isRelativePath)(src)) {
            elem.src = `${params.dirpath}/${src}`;
        }
        else if (tagName === "area" && href && (0, core_1.isRelativePath)(href)) {
            elem.href = `${params.dirpath}/${href}`;
        }
        else if (tagName === "base" && href && (0, core_1.isRelativePath)(href)) {
            elem.href = `${params.dirpath}/${href}`;
        }
    });
};
exports.rebaseRelativePaths = rebaseRelativePaths;
const resolveTextNodeExpressions = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        if (node.nodeType !== 3)
            return;
        const content = node.nodeValue || "";
        this.log(`Processing node content value:\n`, content);
        // Identify all the expressions found in the content.
        const matcher = new RegExp(/{{ ([^}]+) }}/gm);
        const expressions = Array.from(content.matchAll(matcher)).map((match) => match[1]);
        // To update the node, we have to re-evaluate all of the expressions since that's much simpler
        // than caching results.
        const updateNode = () => __awaiter(this, void 0, void 0, function* () {
            let updatedContent = content;
            for (const expr of expressions) {
                const [result] = yield this.eval(expr, { $elem: node });
                updatedContent = updatedContent.replace(`{{ ${expr} }}`, String(result));
            }
            node.nodeValue = updatedContent;
        });
        // Trigger the eval and pass our full node update function as the callback.
        yield Promise.all(expressions.map((expr) => this.eval(expr, { $elem: node }, updateNode)));
    });
};
exports.resolveTextNodeExpressions = resolveTextNodeExpressions;
const resolveDataAttribute = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        const dataAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":data");
        if (dataAttr) {
            this.log(":data attribute found in:\n", node);
            elem.removeAttribute(":data");
            const [result] = yield this.eval(dataAttr, { $elem: node });
            yield this.update(result);
        }
    });
};
exports.resolveDataAttribute = resolveDataAttribute;
const resolveWatchAttribute = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        const watchAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, "@watch");
        if (watchAttr) {
            this.log("@watch attribute found in:\n", node);
            // Remove the attribute from the node.
            elem.removeAttribute("@watch");
            // Compute the function's result and leave callback empty since we just care about execution.
            yield this.eval(watchAttr, { $elem: node }, () => { });
        }
    });
};
exports.resolveWatchAttribute = resolveWatchAttribute;
const resolveHtmlAttribute = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        const htmlAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, "$html");
        if (htmlAttr) {
            this.log("$html attribute found in:\n", node);
            // Remove the attribute from the node.
            elem.removeAttribute("$html");
            // Obtain a subrenderer for the node contents.
            const subrenderer = this.clone();
            // Compute the function's result and track dependencies.
            yield this.eval(htmlAttr, { $elem: node }, (result) => __awaiter(this, void 0, void 0, function* () {
                const fragment = yield subrenderer.preprocessString(result, params);
                yield subrenderer.renderNode(fragment, params);
                elem.replaceChildren(fragment);
            }));
        }
    });
};
exports.resolveHtmlAttribute = resolveHtmlAttribute;
const resolvePropAttributes = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        for (const attr of Array.from(elem.attributes || [])) {
            if (attr.name.startsWith("$") && !KW_ATTRIBUTES.has(attr.name)) {
                this.log(attr.name, "attribute found in:\n", node);
                // Remove the attribute from the node.
                elem.removeAttribute(attr.name);
                // Apply any shorthand conversions if necessary.
                const propName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);
                // Compute the function's result and track dependencies.
                const prop = (0, attributes_1.attributeNameToCamelCase)(propName);
                yield this.eval(attr.value, { $elem: node }, (result) => (node[prop] = result));
            }
        }
    });
};
exports.resolvePropAttributes = resolvePropAttributes;
const resolveAttrAttributes = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        for (const attr of Array.from(elem.attributes || [])) {
            if (attr.name.startsWith(":") && !KW_ATTRIBUTES.has(attr.name)) {
                this.log(attr.name, "attribute found in:\n", node);
                // Remove the processed attributes from node.
                elem.removeAttribute(attr.name);
                // Apply any shorthand conversions if necessary.
                const attrName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);
                // Compute the function's result and track dependencies.
                yield this.eval(attr.value, { $elem: node }, (result) => elem.setAttribute(attrName, result));
            }
        }
    });
};
exports.resolveAttrAttributes = resolveAttrAttributes;
const resolveEventAttributes = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        for (const attr of Array.from(elem.attributes || [])) {
            if (attr.name.startsWith("@") && !KW_ATTRIBUTES.has(attr.name)) {
                this.log(attr.name, "attribute found in:\n", node);
                // Remove the processed attributes from node.
                elem.removeAttribute(attr.name);
                (_a = node.addEventListener) === null || _a === void 0 ? void 0 : _a.call(node, attr.name.substring(1), (event) => {
                    this.eval(attr.value, { $elem: node, $event: event });
                });
            }
        }
    });
};
exports.resolveEventAttributes = resolveEventAttributes;
const resolveForAttribute = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        const forAttr = (_b = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":for")) === null || _b === void 0 ? void 0 : _b.trim();
        if (forAttr) {
            this.log(":for attribute found in:\n", node);
            // Remove the processed attributes from node.
            elem.removeAttribute(":for");
            // Ensure the node and its children are not processed by subsequent steps.
            for (const child of (0, core_1.traverse)(node, this.skipNodes)) {
                this.skipNodes.add(child);
            }
            // Place the template node into a template element.
            const parent = node.parentNode;
            const template = node.ownerDocument.createElement("template");
            parent.insertBefore(template, node);
            template.append(node);
            this.log(":for template:\n", template);
            // Tokenize the input by splitting it based on the format "{key} in {expression}".
            const tokens = forAttr.split(" in ", 2);
            if (tokens.length !== 2) {
                throw new Error(`Invalid :for format: \`${forAttr}\`. Expected "{key} in {expression}".`);
            }
            // Compute the container expression and trace dependencies.
            // Keep track of all the child nodes added.
            const children = [];
            // Define the function that will update the DOM.
            const [loopKey, itemsExpr] = tokens;
            yield this.eval(itemsExpr, { $elem: node }, (items) => {
                this.log(":for list items:", items);
                // Acquire the lock atomically.
                this.lock = this.lock.then(() => new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
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
                        yield subrenderer.set(loopKey, item);
                        // Create a new HTML element for each item and add them to parent node.
                        const copy = node.cloneNode(true);
                        parent.insertBefore(copy, template.nextSibling);
                        // Also add the new element to the store.
                        children.push(copy);
                        // Since the element will be handled by a subrenderer, skip it in parent renderer.
                        this.skipNodes.add(copy);
                        // Render the element using the subrenderer.
                        yield subrenderer.mount(copy, params);
                        this.log("Rendered list child:\n", copy);
                    }
                    // Release the lock.
                    resolve();
                })));
                // Return the lock so the whole operation can be awaited.
                return this.lock;
            });
        }
    });
};
exports.resolveForAttribute = resolveForAttribute;
const resolveBindAttribute = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        const bindKey = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":bind");
        if (bindKey) {
            this.log(":bind attribute found in:\n", node);
            // The change events we listen for can be overriden by user.
            const defaultEvents = ["change", "input"];
            const updateEvents = ((_c = (_b = elem.getAttribute) === null || _b === void 0 ? void 0 : _b.call(elem, ":bind-events")) === null || _c === void 0 ? void 0 : _c.split(",")) || defaultEvents;
            // Remove the processed attributes from node.
            elem.removeAttribute(":bind");
            elem.removeAttribute(":bind-events");
            // If the element is of type checkbox, we bind to the "checked" property.
            const prop = elem.getAttribute("type") === "checkbox" ? "checked" : "value";
            // If the key is not found in our store, create it and initialize it with the node's value.
            if (!this.has(bindKey))
                yield this.set(bindKey, elem[prop]);
            // Set the node's value to our current value.
            elem[prop] = this.get(bindKey);
            // Watch for updates in the node's value.
            for (const event of updateEvents) {
                node.addEventListener(event, () => this.set(bindKey, elem[prop]));
            }
            // Watch for updates in the store.
            this.watch([bindKey], () => (elem[prop] = this.get(bindKey)));
        }
    });
};
exports.resolveBindAttribute = resolveBindAttribute;
const resolveShowAttribute = function (node, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (this.skipNodes.has(node))
            return;
        const elem = node;
        const showExpr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":show");
        if (showExpr) {
            this.log(":show attribute found in:\n", node);
            // Remove the processed attributes from node.
            elem.removeAttribute(":show");
            // TODO: Instead of using element display, insert a dummy <template> to track position of child,
            // then replace it with the original child when needed.
            // Store the original display value to reset it later if needed.
            const display = elem.style.display === "none" ? "" : elem.style.display;
            // Compute the function's result and track dependencies.
            yield this.eval(showExpr, { $elem: node }, (result) => {
                // If the result is false, set the node's display to none.
                elem.style.display = result ? display : "none";
            });
        }
    });
};
exports.resolveShowAttribute = resolveShowAttribute;
