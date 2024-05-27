import { Element as _Element, Node as _Node, Text as _Text, } from "domhandler";
import { DomUtils } from "htmlparser2";
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
    if (elem instanceof _Element)
        return elem.attribs?.[name];
    else
        return elem.getAttribute?.(name);
}
export function setAttribute(elem, name, value) {
    if (elem instanceof _Element)
        elem.attribs[name] = value;
    else
        elem.setAttribute?.(name, value);
}
export function removeAttribute(elem, name) {
    if (elem instanceof _Element)
        delete elem.attribs[name];
    else
        elem.removeAttribute?.(name);
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
        const elem = node;
        parent.childNodes = parent.children.filter((child) => child !== elem);
        return elem;
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
    if (elem instanceof _Element)
        return DomUtils.getInnerHTML(elem);
    else
        return elem.innerHTML;
}
export function innerText(elem) {
    if (elem instanceof _Element)
        return DomUtils.innerText(elem);
    else
        return elem.innerText;
}
export function getTextContent(elem) {
    if (elem instanceof _Element)
        return DomUtils.textContent(elem);
    else
        return elem.textContent;
}
export function setTextContent(elem, value) {
    if (elem instanceof _Element)
        elem.children = [new _Text(value)];
    else
        elem.textContent = value;
}
export function getNodeValue(node) {
    if (node instanceof _Node)
        return node.data;
    else
        return node.nodeValue;
}
export function setNodeValue(node, value) {
    if (node instanceof _Node)
        node.data = value;
    else
        node.nodeValue = value;
}
export function createElement(tagName, document) {
    if (document)
        return document.createElement(tagName);
    else
        return new _Element(tagName, {});
}
