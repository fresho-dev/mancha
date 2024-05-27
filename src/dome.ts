import {
  ChildNode as _ChildNode,
  Element as _Element,
  Node as _Node,
  ParentNode as _ParentNode,
  Text as _Text,
} from "domhandler";
import { DomUtils } from "htmlparser2";

type __Node = Node | _Node;
type __ParentNode = ParentNode | _ParentNode;
type __Element = Element | _Element;
type __ChildNode = ChildNode | _ChildNode;

function hasFunction(obj: any, func: string): boolean {
  return typeof obj?.[func] === "function";
}

/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
export function attributeNameToCamelCase(name: string): string {
  return name.replace(/-./g, (c) => c[1].toUpperCase());
}

export function getAttribute(elem: __Element, name: string): string | null {
  if (elem instanceof _Element) return elem.attribs?.[name];
  else return elem.getAttribute?.(name);
}

export function setAttribute(elem: __Element, name: string, value: string): void {
  if (elem instanceof _Element) elem.attribs[name] = value;
  else elem.setAttribute?.(name, value);
}

export function removeAttribute(elem: __Element, name: string): void {
  if (elem instanceof _Element) delete elem.attribs[name];
  else elem.removeAttribute?.(name);
}

export function replaceWith(original: __ChildNode, ...replacement: __Node[]): void {
  if (hasFunction(original, "replaceWith")) {
    return (original as ChildNode).replaceWith(...(replacement as Node[]));
  } else {
    const elem = original as _Element;
    const parent = elem.parentNode as _ParentNode;
    const index = Array.from(parent.childNodes).indexOf(elem);
    replacement.forEach((elem) => ((elem as any).parentNode = parent));
    (parent as any).childNodes = ([] as _ChildNode[])
      .concat(Array.from(parent.childNodes).slice(0, index))
      .concat(replacement as _ChildNode[])
      .concat(Array.from(parent.childNodes).slice(index + 1));
  }
}

export function appendChild(parent: __Node, node: __Node): __Node {
  if (hasFunction(node, "appendChild")) {
    return (parent as Node).appendChild(node as Node);
  } else {
    (parent as any).childNodes.push(node as ChildNode);
    (node as any).parentNode = parent;
    return node;
  }
}

export function removeChild(parent: __Node, node: __Node): __Node {
  if (hasFunction(node, "removeChild")) {
    return (parent as Node).removeChild(node as Node);
  } else {
    const elem = node as _ChildNode;
    (parent as any).childNodes = (parent as _ParentNode).children.filter((child) => child !== elem);
    return elem;
  }
}

export function replaceChildren(parent: __ParentNode, ...nodes: __Node[]): void {
  if (hasFunction(parent, "replaceChildren")) {
    (parent as ParentNode).replaceChildren(...(nodes as Node[]));
  } else {
    (parent as any).childNodes = nodes as _ChildNode[];
    nodes.forEach((node) => ((node as any).parentNode = parent));
  }
}

export function insertBefore(parent: __Node, node: __Node, reference: __ChildNode | null): __Node {
  if (!reference) {
    return appendChild(parent, node);
  } else if (hasFunction(parent, "insertBefore")) {
    return (parent as Node).insertBefore(node as Node, reference as ChildNode | null);
  } else {
    replaceWith(reference as _ChildNode, node, reference);
    return node;
  }
}

export function innerHTML(elem: Element | _Element): string {
  if (elem instanceof _Element) return DomUtils.getInnerHTML(elem);
  else return (elem as HTMLElement).innerHTML;
}

export function innerText(elem: Element | _Element): string | null {
  if (elem instanceof _Element) return DomUtils.innerText(elem);
  else return (elem as HTMLElement).innerText;
}

export function getTextContent(elem: Element | _Element): string | null {
  if (elem instanceof _Element) return DomUtils.textContent(elem);
  else return (elem as HTMLElement).textContent;
}

export function setTextContent(elem: Element | _Element, value: string): void {
  if (elem instanceof _Element) elem.children = [new _Text(value)];
  else elem.textContent = value;
}

export function getNodeValue(node: Node | _Node): string | null {
  if (node instanceof _Node) return (node as any).data;
  else return node.nodeValue;
}

export function setNodeValue(node: Node | _Node, value: string | null): void {
  if (node instanceof _Node) (node as any).data = value;
  else node.nodeValue = value;
}

export function createElement(tagName: string, document: Document | null): Element | _Element {
  if (document) return document.createElement(tagName);
  else return new _Element(tagName, {});
}
