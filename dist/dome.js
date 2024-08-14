import { DomUtils, parseDocument } from "htmlparser2";
/**
 * Traverses the DOM tree starting from the given root node and yields each child node.
 * Nodes in the `skip` set will be skipped during traversal.
 *
 * @param root - The root node to start the traversal from.
 * @param skip - A set of nodes to skip during traversal.
 * @returns A generator that yields each child node in the DOM tree.
 */
export function* traverse(root, skip = new Set()) {
    const explored = new Set();
    const frontier = Array.from(root.childNodes).filter((node) => !skip.has(node));
    // Also yield the root node.
    yield root;
    while (frontier.length) {
        const node = frontier.shift();
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
function hasProperty(obj, prop) {
    return typeof obj?.[prop] !== "undefined";
}
function hasFunction(obj, func) {
    return typeof obj?.[func] === "function";
}
/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
export function attributeNameToCamelCase(name) {
    return name.replace(/-./g, (c) => c[1].toUpperCase());
}
export function getAttribute(elem, name) {
    if (hasProperty(elem, "attribs"))
        return elem.attribs?.[name] ?? null;
    else
        return elem.getAttribute?.(name);
}
export function setAttribute(elem, name, value) {
    if (hasProperty(elem, "attribs"))
        elem.attribs[name] = value;
    else
        elem.setAttribute?.(name, value);
}
export function removeAttribute(elem, name) {
    if (hasProperty(elem, "attribs"))
        delete elem.attribs[name];
    else
        elem.removeAttribute?.(name);
}
export function cloneAttribute(elemFrom, elemDest, name) {
    if (hasProperty(elemFrom, "attribs") && hasProperty(elemDest, "attribs")) {
        elemDest.attribs[name] = elemFrom.attribs[name];
    }
    else {
        const attr = elemFrom?.getAttributeNode?.(name);
        elemDest?.setAttributeNode?.(attr?.cloneNode(true));
    }
}
export function firstElementChild(elem) {
    if (hasProperty(elem, "firstElementChild")) {
        return elem.firstElementChild;
    }
    else {
        const children = Array.from(elem.children);
        return children.find((child) => child.nodeType === 1);
    }
}
export function replaceWith(original, ...replacement) {
    if (hasFunction(original, "replaceWith")) {
        return original.replaceWith(...replacement);
    }
    else {
        const elem = original;
        const parent = elem.parentNode;
        const index = Array.from(parent.childNodes).indexOf(elem);
        replacement.forEach((elem) => (elem.parentNode = parent));
        parent.childNodes = []
            .concat(Array.from(parent.childNodes).slice(0, index))
            .concat(replacement)
            .concat(Array.from(parent.childNodes).slice(index + 1));
    }
}
export function appendChild(parent, node) {
    if (hasFunction(node, "appendChild")) {
        return parent.appendChild(node);
    }
    else {
        parent.childNodes.push(node);
        node.parentNode = parent;
        return node;
    }
}
export function removeChild(parent, node) {
    if (hasFunction(node, "removeChild")) {
        return parent.removeChild(node);
    }
    else {
        DomUtils.removeElement(node);
        return node;
    }
}
export function replaceChildren(parent, ...nodes) {
    if (hasFunction(parent, "replaceChildren")) {
        parent.replaceChildren(...nodes);
    }
    else {
        parent.childNodes = nodes;
        nodes.forEach((node) => (node.parentNode = parent));
    }
}
export function insertBefore(parent, node, reference) {
    if (!reference) {
        return appendChild(parent, node);
    }
    else if (hasFunction(parent, "insertBefore")) {
        return parent.insertBefore(node, reference);
    }
    else {
        replaceWith(reference, node, reference);
        return node;
    }
}
export function innerHTML(elem) {
    if (hasProperty(elem, "innerHTML"))
        return elem.innerHTML;
    else
        return DomUtils.getInnerHTML(elem);
}
export function innerText(elem) {
    if (hasProperty(elem, "innerText"))
        return elem.innerText;
    else
        return DomUtils.innerText(elem);
}
export function getTextContent(elem) {
    if (hasProperty(elem, "textContent"))
        return elem.textContent;
    else
        return DomUtils.textContent(elem);
}
export function setTextContent(elem, value) {
    if (hasProperty(elem, "textContent"))
        elem.textContent = value;
    else
        elem.children = [parseDocument(value).firstChild];
}
export function getNodeValue(node) {
    if (hasProperty(node, "nodeValue"))
        return node.nodeValue;
    else
        return node.data;
}
export function setNodeValue(node, value) {
    if (hasProperty(node, "nodeValue"))
        node.nodeValue = value;
    else
        node.data = value;
}
export function createElement(tagName, document) {
    if (document)
        return document.createElement(tagName);
    else
        return parseDocument(`<${tagName}></${tagName}>`).firstChild;
}
export function ellipsize(str, maxLength = 0) {
    if (!str)
        return "";
    else if (str.length <= maxLength)
        return str;
    else
        return str.slice(0, maxLength - 1) + "…";
}
export function nodeToString(node, maxLength = 0) {
    return ellipsize(node.outerHTML || getNodeValue(node) || String(node), maxLength);
}
/**
 * Returns the directory name from a given file path.
 * @param fpath - The file path.
 * @returns The directory name.
 */
export function dirname(fpath) {
    if (!fpath.includes("/")) {
        return "";
    }
    else {
        return fpath.split("/").slice(0, -1).join("/");
    }
}
/**
 * Checks if a given file path is a relative path.
 *
 * @param fpath - The file path to check.
 * @returns A boolean indicating whether the file path is relative or not.
 */
export function isRelativePath(fpath) {
    return (!fpath.includes("://") &&
        !fpath.startsWith("/") &&
        !fpath.startsWith("#") &&
        !fpath.startsWith("data:"));
}
