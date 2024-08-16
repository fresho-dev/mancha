import { safeAttrPrefix } from "safevalues";
import { safeElement } from "safevalues/dom";

const SAFE_ATTRS = [
  safeAttrPrefix`style`,
  safeAttrPrefix`class`,
  safeAttrPrefix`@`,
  safeAttrPrefix`:`,
  safeAttrPrefix`$`,
];

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

export function hasProperty(obj: any, prop: string): boolean {
  return typeof obj?.[prop] !== "undefined";
}

export function hasFunction(obj: any, func: string): boolean {
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

export function getAttribute(elem: Element | any, name: string): string | null {
  if (hasProperty(elem, "attribs")) return (elem as any).attribs?.[name] ?? null;
  else return elem.getAttribute?.(name);
}

export function setAttribute(elem: Element | any, name: string, value: string): void {
  if (hasProperty(elem, "attribs")) (elem as any).attribs[name] = value;
  else safeElement.setPrefixedAttribute(SAFE_ATTRS, elem, name, value);
}

export function removeAttribute(elem: Element | any, name: string): void {
  if (hasProperty(elem, "attribs")) delete elem.attribs[name];
  else elem.removeAttribute?.(name);
}

export function cloneAttribute(
  elemFrom: Element | any,
  elemDest: Element | any,
  name: string
): void {
  if (hasProperty(elemFrom, "attribs") && hasProperty(elemDest, "attribs")) {
    elemDest.attribs[name] = elemFrom.attribs[name];
  } else {
    const attr = (elemFrom as Element)?.getAttribute?.(name);
    setAttribute(elemDest as Element, name, attr || "");
  }
}

export function firstElementChild(elem: Element): Element | null {
  if (hasProperty(elem, "firstElementChild")) {
    return elem.firstElementChild;
  } else {
    const children = Array.from(elem.children);
    return children.find((child) => child.nodeType === 1) as Element;
  }
}

export function replaceWith(original: ChildNode, ...replacement: Node[]): void {
  if (hasFunction(original, "replaceWith")) {
    return (original as ChildNode).replaceWith(...(replacement as Node[]));
  } else {
    const elem = original;
    const parent = elem.parentNode!;
    const index = Array.from(parent.childNodes).indexOf(elem);
    replacement.forEach((elem) => ((elem as any).parentNode = parent));
    (parent as any).childNodes = ([] as ChildNode[])
      .concat(Array.from(parent.childNodes).slice(0, index))
      .concat(replacement as ChildNode[])
      .concat(Array.from(parent.childNodes).slice(index + 1));
  }
}

export function replaceChildren(parent: ParentNode, ...nodes: Node[]): void {
  if (hasFunction(parent, "replaceChildren")) {
    (parent as ParentNode).replaceChildren(...(nodes as Node[]));
  } else {
    (parent as any).childNodes = nodes as ChildNode[];
    nodes.forEach((node) => ((node as any).parentNode = parent));
  }
}

export function appendChild(parent: Node, node: Node): Node {
  if (hasFunction(node, "appendChild")) {
    return (parent as Node).appendChild(node as Node);
  } else {
    (parent as any).childNodes.push(node as ChildNode);
    (node as any).parentNode = parent;
    return node;
  }
}

export function removeChild(parent: ParentNode, node: Node): Node {
  if (hasFunction(node, "removeChild")) {
    return (parent as Node).removeChild(node as Node);
  } else {
    replaceChildren(parent, ...Array.from(parent.childNodes).filter((child) => child !== node));
    return node;
  }
}

export function insertBefore(parent: Node, node: Node, reference: ChildNode | null): Node {
  if (!reference) {
    return appendChild(parent, node);
  } else if (hasFunction(parent, "insertBefore")) {
    return (parent as Node).insertBefore(node as Node, reference as ChildNode | null);
  } else {
    replaceWith(reference as ChildNode, node, reference);
    return node;
  }
}

export function ellipsize(str: string | null, maxLength: number = 0): string {
  if (!str) return "";
  else if (str.length <= maxLength) return str;
  else return str.slice(0, maxLength - 1) + "…";
}

export function nodeToString(node: Node, maxLength: number = 0): string {
  return ellipsize((node as any).outerHTML || node.nodeValue || String(node), maxLength);
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
