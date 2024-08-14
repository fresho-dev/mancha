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
export declare function getAttribute(elem: Element | any, name: string): string | null;
export declare function setAttribute(elem: Element | any, name: string, value: string): void;
export declare function removeAttribute(elem: Element | any, name: string): void;
export declare function cloneAttribute(elemFrom: Element | any, elemDest: Element | any, name: string): void;
export declare function firstElementChild(elem: Element): Element | null;
export declare function replaceWith(original: ChildNode, ...replacement: Node[]): void;
export declare function appendChild(parent: Node, node: Node): Node;
export declare function removeChild(parent: Node, node: Node): Node;
export declare function replaceChildren(parent: ParentNode, ...nodes: Node[]): void;
export declare function insertBefore(parent: Node, node: Node, reference: ChildNode | null): Node;
export declare function innerHTML(elem: Element): string;
export declare function innerText(elem: Element): string | null;
export declare function getTextContent(elem: Element): string | null;
export declare function setTextContent(elem: Element, value: string): void;
export declare function getNodeValue(node: Node): string | null;
export declare function setNodeValue(node: Node, value: string | null): void;
export declare function createElement(tagName: string, document: Document | null): Element;
export declare function ellipsize(str: string | null, maxLength?: number): string;
export declare function nodeToString(node: Node, maxLength?: number): string;
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
