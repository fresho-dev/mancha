import { ChildNode as _ChildNode, Element as _Element, Node as _Node, ParentNode as _ParentNode } from "domhandler";
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
export declare function traverse(root: Node | DocumentFragment | Document, skip?: Set<Node>): Generator<ChildNode>;
/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
export declare function attributeNameToCamelCase(name: string): string;
export declare function getAttribute(elem: __Element, name: string): string | null;
export declare function setAttribute(elem: __Element, name: string, value: string): void;
export declare function removeAttribute(elem: __Element, name: string): void;
export declare function cloneAttribute(elemFrom: __Element, elemDest: __Element, name: string): void;
export declare function firstElementChild(elem: __Element): __Element | null;
export declare function replaceWith(original: __ChildNode, ...replacement: __Node[]): void;
export declare function appendChild(parent: __Node, node: __Node): __Node;
export declare function removeChild(parent: __Node, node: __Node): __Node;
export declare function replaceChildren(parent: __ParentNode, ...nodes: __Node[]): void;
export declare function insertBefore(parent: __Node, node: __Node, reference: __ChildNode | null): __Node;
export declare function innerHTML(elem: Element | _Element): string;
export declare function innerText(elem: Element | _Element): string | null;
export declare function getTextContent(elem: Element | _Element): string | null;
export declare function setTextContent(elem: Element | _Element, value: string): void;
export declare function getNodeValue(node: Node | _Node): string | null;
export declare function setNodeValue(node: Node | _Node, value: string | null): void;
export declare function createElement(tagName: string, document: Document | null): Element | _Element;
export declare function ellipsize(str: string | null, maxLength?: number): string;
export declare function nodeToString(node: Node | _Node, maxLength?: number): string;
/**
 * Returns the directory name from a given file path.
 * @param fpath - The file path.
 * @returns The directory name.
 */
export declare function dirname(fpath: string): string;
/**
 * Checks if a given file path is a relative path.
 *
 * @param fpath - The file path to check.
 * @returns A boolean indicating whether the file path is relative or not.
 */
export declare function isRelativePath(fpath: string): boolean;
export {};
