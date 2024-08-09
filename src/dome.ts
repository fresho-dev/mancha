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

/**
 * Traverses the DOM tree starting from the given root node and yields each child node.
 * Nodes in the `skip` set will be skipped during traversal.
 *
 * @param root - The root node to start the traversal from.
 * @param skip - A set of nodes to skip during traversal.
 * @returns A generator that yields each child node in the DOM tree.
 */
export function* traverse(
  root: Node | DocumentFragment | Document,
  skip: Set<Node> = new Set()
): Generator<ChildNode> {
  const explored: Set<ChildNode> = new Set();
  const frontier: ChildNode[] = Array.from(root.childNodes).filter((node) => !skip.has(node));

  // Also yield the root node.
  yield root as ChildNode;

  while (frontier.length) {
    const node: ChildNode = frontier.shift() as ChildNode;
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

export function cloneAttribute(elemFrom: __Element, elemDest: __Element, name: string): void {
  if (elemFrom instanceof _Element && elemDest instanceof _Element) {
    elemDest.attribs[name] = elemFrom.attribs[name];
  } else {
    const attr = (elemFrom as Element)?.getAttributeNode?.(name);
    (elemDest as Element)?.setAttributeNode?.(attr?.cloneNode(true) as Attr);
  }
}

export function firstElementChild(elem: __Element): __Element | null {
  if (elem instanceof _Element) {
    return elem.children.find((child) => child instanceof _Element) as _Element;
  } else {
    return elem.firstElementChild;
  }
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

export function ellipsize(str: string | null, maxLength: number = 0): string {
  if (!str) return "";
  else if (str.length <= maxLength) return str;
  else return str.slice(0, maxLength - 1) + "…";
}

export function nodeToString(node: Node | _Node, maxLength: number = 0): string {
  return ellipsize((node as any).outerHTML || getNodeValue(node) || String(node), maxLength);
}

/**
 * Returns the directory name from a given file path.
 * @param fpath - The file path.
 * @returns The directory name.
 */
export function dirname(fpath: string): string {
  if (!fpath.includes("/")) {
    return "";
  } else {
    return fpath.split("/").slice(0, -1).join("/");
  }
}

/**
 * Checks if a given file path is a relative path.
 *
 * @param fpath - The file path to check.
 * @returns A boolean indicating whether the file path is relative or not.
 */
export function isRelativePath(fpath: string): boolean {
  return (
    !fpath.includes("://") &&
    !fpath.startsWith("/") &&
    !fpath.startsWith("#") &&
    !fpath.startsWith("data:")
  );
}
