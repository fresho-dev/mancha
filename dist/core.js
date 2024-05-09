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
exports.IRenderer = exports.safeEval = exports.extractTextNodeKeys = exports.resolvePath = exports.folderPath = exports.traverse = void 0;
const path = require("path-browserify");
const reactive_1 = require("./reactive");
const attributes_1 = require("./attributes");
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
function* traverse(root, skip = new Set()) {
    const explored = new Set();
    const frontier = Array.from(root.childNodes).filter((node) => !skip.has(node));
    // Also yield the root node.
    yield root;
    while (frontier.length) {
        const node = frontier.pop();
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
exports.traverse = traverse;
function folderPath(fpath) {
    if (fpath.endsWith("/")) {
        return fpath.slice(0, -1);
    }
    else {
        return path.dirname(fpath);
    }
}
exports.folderPath = folderPath;
function resolvePath(fpath) {
    if (fpath.includes("://")) {
        const [scheme, remotePath] = fpath.split("://", 2);
        return `${scheme}://${resolvePath("/" + remotePath).substring(1)}`;
    }
    else {
        return path.resolve(fpath);
    }
}
exports.resolvePath = resolvePath;
function extractTextNodeKeys(content) {
    const matcher = new RegExp(/{{ ([\w\.]+) }}/gm);
    return Array.from(content.matchAll(matcher)).map((match) => {
        const orig = match[0];
        let key = match[1];
        const props = [];
        if (key.includes(".")) {
            const parts = key.split(".");
            key = parts[0];
            props.push(...parts.slice(1));
        }
        return [orig, key, props];
    });
}
exports.extractTextNodeKeys = extractTextNodeKeys;
function safeEval(code, context, args = {}) {
    const inner = `with (this) { return (async () => (${code}))(); }`;
    return new Function(...Object.keys(args), inner).call(context, ...Object.values(args));
}
exports.safeEval = safeEval;
const _DEFAULT_RENDERER_PARAMS = { maxdepth: 10 };
class IRenderer extends reactive_1.ReactiveProxyStore {
    constructor() {
        super(...arguments);
        this.fsroot = ".";
        this.skipNodes = new Set();
    }
    clone() {
        return new this.constructor(Object.fromEntries(this.store.entries()));
    }
    log(params, ...args) {
        if (params === null || params === void 0 ? void 0 : params.debug)
            console.debug(...args);
    }
    eval(expr_1) {
        return __awaiter(this, arguments, void 0, function* (expr, args = {}, params) {
            const proxy = (0, reactive_1.proxify)(this);
            const result = yield safeEval(expr, proxy, Object.assign({}, args));
            this.log(params, `eval \`${expr}\` => `, result);
            return result;
        });
    }
    resolveIncludes(root, params) {
        return __awaiter(this, void 0, void 0, function* () {
            params = Object.assign({ fsroot: this.fsroot }, _DEFAULT_RENDERER_PARAMS, params);
            const includes = Array.from(traverse(root, this.skipNodes))
                .map((node) => node)
                .filter((node) => { var _a; return ((_a = node.tagName) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === "include"; })
                .map((node) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const src = (_a = node.getAttribute) === null || _a === void 0 ? void 0 : _a.call(node, "src");
                const dataset = Object.assign({}, node.dataset);
                // Add all the data-* attributes as properties to current context.
                // NOTE: this will propagate to all subsequent render calls, including nested calls.
                Object.entries(dataset).forEach(([key, attr]) => this.set(key, (0, attributes_1.decodeHtmlAttrib)(attr)));
                // Early exit: <include> tags must have a src attribute.
                if (!src) {
                    throw new Error(`"src" attribute missing from ${node}.`);
                }
                // The included file will replace this tag.
                const handler = (fragment) => {
                    node.replaceWith(...Array.from(fragment.childNodes));
                };
                // Decrement the maxdepth param.
                params.maxdepth--;
                // Case 1: Absolute remote path.
                if (src.indexOf("://") !== -1) {
                    yield this.renderRemotePath(src, Object.assign(Object.assign({}, params), { isRoot: false })).then(handler);
                    // Case 2: Relative remote path.
                }
                else if (((_b = params.fsroot) === null || _b === void 0 ? void 0 : _b.indexOf("://")) !== -1) {
                    const relpath = `${params.fsroot}/${src}`;
                    yield this.renderRemotePath(relpath, Object.assign(Object.assign({}, params), { isRoot: false })).then(handler);
                    // Case 3: Local absolute path.
                }
                else if (src.charAt(0) === "/") {
                    yield this.renderLocalPath(src, Object.assign(Object.assign({}, params), { isRoot: false })).then(handler);
                    // Case 4: Local relative path.
                }
                else {
                    const relpath = path.join(params.fsroot, src);
                    yield this.renderLocalPath(relpath, Object.assign(Object.assign({}, params), { isRoot: false })).then(handler);
                }
            }));
            // Wait for all the rendering operations to complete.
            yield Promise.all(includes);
            // Re-render until no changes are made.
            if (includes.length === 0) {
                return this;
            }
            else if (params.maxdepth === 0) {
                throw new Error("Maximum recursion depth reached.");
            }
            else {
                return this.resolveIncludes(root, {
                    fsroot: params.fsroot,
                    maxdepth: params.maxdepth - 1,
                });
            }
        });
    }
    resolveTextNode(node, params) {
        if (node.nodeType !== 3)
            return [];
        const content = node.nodeValue || "";
        // Identify all the context variables found in the content.
        const keys = extractTextNodeKeys(content).filter(([, key]) => this.store.has(key));
        // Early exit: no keys found in content.
        if (keys.length === 0)
            return [];
        this.log(params, keys, "keys found in node:", node);
        // Apply the context variables to the content, iteratively.
        const updateNode = () => {
            let updatedContent = content;
            keys.forEach(([match, key, props]) => {
                var _a;
                updatedContent = updatedContent.replace(match, String((_a = this.get(key, ...props)) !== null && _a !== void 0 ? _a : ""));
            });
            node.nodeValue = updatedContent;
        };
        // Update the content now, and set up the listeners for future updates.
        updateNode();
        this.watch(keys.map(([, key]) => key), updateNode);
        // Return all the proxies found in the content.
        return keys.map(([, key]) => this.store.get(key));
    }
    resolveDataAttribute(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            const dataAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":data");
            if (dataAttr) {
                this.log(params, ":data attribute found in:\n", node);
                elem.removeAttribute(":data");
                const result = yield this.eval(dataAttr, { $elem: node }, params);
                this.log(params, ":data", dataAttr, "=>", result);
                yield this.update(result);
            }
        });
    }
    resolveWatchAttribute(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            const watchAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, "@watch");
            if (watchAttr) {
                this.log(params, "@watch attribute found in:\n", node);
                // Remove the attribute from the node.
                elem.removeAttribute("@watch");
                // Compute the function's result and trace dependencies.
                const fn = () => this.eval(watchAttr, { $elem: node }, params);
                const [result, dependencies] = yield this.trace(fn);
                this.log(params, "@watch", watchAttr, "=>", result);
                // Watch for updates, and re-execute function if needed.
                this.watch(dependencies, fn);
            }
        });
    }
    resolveHtmlAttribute(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            const htmlAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, "$html");
            if (htmlAttr) {
                this.log(params, "$html attribute found in:\n", node);
                // Remove the attribute from the node.
                elem.removeAttribute("$html");
                // Compute the function's result and trace dependencies.
                const fn = () => __awaiter(this, void 0, void 0, function* () {
                    const html = yield this.eval(htmlAttr, { $elem: node }, params);
                    elem.replaceChildren(yield this.renderString(html, params));
                });
                const [result, dependencies] = yield this.trace(fn);
                this.log(params, "$html", htmlAttr, "=>", result);
                // Watch for updates, and re-execute function if needed.
                this.watch(dependencies, fn);
            }
        });
    }
    resolvePropAttributes(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            for (const attr of Array.from(elem.attributes || [])) {
                if (attr.name.startsWith("$") && !KW_ATTRIBUTES.has(attr.name)) {
                    this.log(params, attr.name, "attribute found in:\n", node);
                    // Remove the attribute from the node.
                    elem.removeAttribute(attr.name);
                    // Apply any shorthand conversions if necessary.
                    const propName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);
                    // Compute the function's result and trace dependencies.
                    const fn = () => this.eval(attr.value, { $elem: node }, params);
                    const [result, dependencies] = yield this.trace(fn);
                    this.log(params, attr.name, attr.value, "=>", result, `[${dependencies}]`);
                    // Set the requested property value on the original node, and watch for updates.
                    const prop = (0, attributes_1.attributeNameToCamelCase)(propName);
                    this.watch(dependencies, () => __awaiter(this, void 0, void 0, function* () { return (node[prop] = yield fn()); }));
                    node[prop] = result;
                }
            }
        });
    }
    resolveAttrAttributes(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            for (const attr of Array.from(elem.attributes || [])) {
                if (attr.name.startsWith(":") && !KW_ATTRIBUTES.has(attr.name)) {
                    this.log(params, attr.name, "attribute found in:\n", node);
                    // Remove the processed attributes from node.
                    elem.removeAttribute(attr.name);
                    // Apply any shorthand conversions if necessary.
                    const attrName = (ATTR_SHORTHANDS[attr.name] || attr.name).slice(1);
                    // Compute the function's result and trace dependencies.
                    const fn = () => this.eval(attr.value, { $elem: node }, params);
                    const [result, dependencies] = yield this.trace(fn);
                    this.log(params, attr.name, attr.value, "=>", result, `[${dependencies}]`);
                    // Set the requested property value on the original node, and watch for updates.
                    this.watch(dependencies, () => __awaiter(this, void 0, void 0, function* () { return elem.setAttribute(attrName, yield fn()); }));
                    elem.setAttribute(attrName, result);
                }
            }
        });
    }
    resolveEventAttributes(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            for (const attr of Array.from(elem.attributes || [])) {
                if (attr.name.startsWith("@") && !KW_ATTRIBUTES.has(attr.name)) {
                    this.log(params, attr.name, "attribute found in:\n", node);
                    // Remove the processed attributes from node.
                    elem.removeAttribute(attr.name);
                    (_a = node.addEventListener) === null || _a === void 0 ? void 0 : _a.call(node, attr.name.substring(1), (event) => this.eval(attr.value, { $elem: node, $event: event }, params));
                }
            }
        });
    }
    resolveForAttribute(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            const forAttr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":for");
            if (forAttr) {
                this.log(params, ":for attribute found in:\n", node);
                // Remove the processed attributes from node.
                elem.removeAttribute(":for");
                // Ensure the node and its children are not processed by subsequent steps.
                for (const child of traverse(node, this.skipNodes)) {
                    this.skipNodes.add(child);
                }
                // Place the template node into a template element.
                const parent = node.parentNode;
                const template = node.ownerDocument.createElement("template");
                parent.insertBefore(template, node);
                template.append(node);
                this.log(params, ":for template:\n", template);
                // Tokenize the input by splitting it based on the format "{key} in {expression}".
                const tokens = forAttr.split(" in ", 2);
                if (tokens.length !== 2) {
                    throw new Error(`Invalid :for format: \`${forAttr}\`. Expected "{key} in {expression}".`);
                }
                // Compute the container expression and trace dependencies.
                let items = [];
                let deps = [];
                const [loopKey, itemsExpr] = tokens;
                try {
                    [items, deps] = yield this.trace(() => this.eval(itemsExpr, { $elem: node }, params));
                    this.log(params, itemsExpr, "=>", items, `[${deps}]`);
                }
                catch (exc) {
                    console.error(exc);
                    return;
                }
                // Keep track of all the child nodes added.
                const children = [];
                // Define the function that will update the DOM.
                const fn = (items) => __awaiter(this, void 0, void 0, function* () {
                    this.log(params, ":for list items:", items);
                    // Validate that the expression returns a list of items.
                    if (!Array.isArray(items)) {
                        console.error(`Expression did not yield a list: \`${itemsExpr}\` => \`${items}\``);
                        return;
                    }
                    // Acquire the lock atomically.
                    this.lock = this.lock.then(() => new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                        // Remove all the previously added children, if any.
                        children.splice(0, children.length).forEach((child) => {
                            parent.removeChild(child);
                            this.skipNodes.delete(child);
                        });
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
                            // Since the element will be handled by a subrenderer, skip it in the source.
                            this.skipNodes.add(copy);
                            // Render the element using the subrenderer.
                            yield subrenderer.mount(copy, params);
                            this.log(params, "Rendered list child:\n", copy);
                        }
                        // Release the lock.
                        resolve();
                    })));
                    // Return the lock so the whole operation can be awaited.
                    return this.lock;
                });
                // Apply changes, and watch for updates in the dependencies.
                this.watch(deps, () => __awaiter(this, void 0, void 0, function* () { return fn(yield this.eval(itemsExpr, { $elem: node }, params)); }));
                return fn(items);
            }
        });
    }
    resolveBindAttribute(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            const bindKey = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":bind");
            if (bindKey) {
                this.log(params, ":bind attribute found in:\n", node);
                // The change events we listen for can be overriden by user.
                const defaultEvents = ["change", "input"];
                const updateEvents = ((_c = (_b = elem.getAttribute) === null || _b === void 0 ? void 0 : _b.call(elem, ":bind-events")) === null || _c === void 0 ? void 0 : _c.split(",")) || defaultEvents;
                // Remove the processed attributes from node.
                elem.removeAttribute(":bind");
                elem.removeAttribute(":bind-events");
                // If the element is of type checkbox, we bind to the "checked" property.
                const prop = elem.getAttribute("type") === "checkbox" ? "checked" : "value";
                // If the key is not found in our store, create it and initialize it with the node's value.
                if (!this.store.has(bindKey))
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
    }
    resolveShowAttribute(node, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.skipNodes.has(node))
                return;
            const elem = node;
            const showExpr = (_a = elem.getAttribute) === null || _a === void 0 ? void 0 : _a.call(elem, ":show");
            if (showExpr) {
                this.log(params, ":show attribute found in:\n", node);
                // Remove the processed attributes from node.
                elem.removeAttribute(":show");
                // Compute the function's result and trace dependencies.
                const fn = () => this.eval(showExpr, { $elem: node }, params);
                const [result, dependencies] = yield this.trace(fn);
                this.log(params, ":show", showExpr, "=>", result, `[${dependencies}]`);
                // If the result is false, set the node's display to none.
                const display = elem.style.display === "none" ? "" : elem.style.display;
                if (!result)
                    elem.style.display = "none";
                // Watch the dependencies, and re-evaluate the expression.
                this.watch(dependencies, () => __awaiter(this, void 0, void 0, function* () {
                    if ((yield fn()) && elem.style.display === "none")
                        elem.style.display = display;
                    else if (elem.style.display !== "none")
                        elem.style.display = "none";
                }));
            }
        });
    }
    mount(root, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // Resolve all the includes recursively first.
            yield this.resolveIncludes(root, params);
            // Iterate over all the nodes and apply appropriate handlers.
            // Do these steps one at a time to avoid any potential race conditions.
            for (const node of traverse(root, this.skipNodes)) {
                this.log(params, "Processing node:\n", node);
                // Resolve the :data attribute in the node.
                yield this.resolveDataAttribute(node, params);
                // Resolve the :for attribute in the node.
                yield this.resolveForAttribute(node, params);
                // Resolve the :$html attribute in the node.
                yield this.resolveHtmlAttribute(node, params);
                // Resolve the :show attribute in the node.
                yield this.resolveShowAttribute(node, params);
                // Resolve the @watch attribute in the node.
                yield this.resolveWatchAttribute(node, params);
                // Resolve the :bind attribute in the node.
                yield this.resolveBindAttribute(node, params);
                // Resolve all $attributes in the node.
                yield this.resolvePropAttributes(node, params);
                // Resolve all :attributes in the node.
                yield this.resolveAttrAttributes(node, params);
                // Resolve all @attributes in the node.
                yield this.resolveEventAttributes(node, params);
                // Replace all the {{ variables }} in the text.
                this.resolveTextNode(node, params);
            }
            return this;
        });
    }
    renderString(content, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const fragment = this.parseHTML(content, params);
            yield this.mount(fragment, params);
            return fragment;
        });
    }
    renderRemotePath(fpath, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = (params === null || params === void 0 ? void 0 : params.cache) || "default";
            const content = yield fetch(fpath, { cache }).then((res) => res.text());
            return this.renderString(content, Object.assign(Object.assign({}, params), { fsroot: folderPath(fpath), isRoot: (params === null || params === void 0 ? void 0 : params.isRoot) || !fpath.endsWith(".tpl.html") }));
        });
    }
}
exports.IRenderer = IRenderer;
