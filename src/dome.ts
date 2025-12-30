import { safeAttrPrefix } from "safevalues";
import { safeElement } from "safevalues/dom";

export type ElementWithAttribs = Element & {
	dataset?: DOMStringMap;
	attribs?: { [key: string]: string };
};

// @ts-expect-error: domhandler types are slightly incompatible with Node
interface MutableNode extends Node {
	parentNode: Node | null;
	childNodes: ChildNode[];
}

const SAFE_ATTRS = [safeAttrPrefix`:`, safeAttrPrefix`style`, safeAttrPrefix`class`];

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
	skip: Set<Node> = new Set(),
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
				.forEach((node) => {
					frontier.push(node);
				});
		}
	}
}

export function hasProperty(obj: unknown, prop: string): boolean {
	return typeof (obj as Record<string, unknown>)?.[prop] !== "undefined";
}

export function hasFunction(obj: unknown, func: string): boolean {
	return typeof (obj as Record<string, unknown>)?.[func] === "function";
}

/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
export function attributeNameToCamelCase(name: string): string {
	return name.replace(/-./g, (c) => c[1].toUpperCase());
}

export function getAttribute(elem: ElementWithAttribs, name: string): string | null {
	if (elem.attribs) return elem.attribs[name] ?? null;
	else return elem.getAttribute?.(name) ?? null;
}

export function hasAttribute(elem: ElementWithAttribs, name: string): boolean {
	if (elem.attribs) return name in elem.attribs;
	else return elem.hasAttribute?.(name) ?? false;
}

export function getAttributeOrDataset(
	elem: ElementWithAttribs,
	name: string,
	attributePrefix: string = "",
): string | null {
	return (
		getAttribute(elem, attributePrefix + name) ||
		getAttribute(elem, `data-${name}`) ||
		(elem.dataset?.[attributeNameToCamelCase(name)] ?? null)
	);
}

export function hasAttributeOrDataset(
	elem: ElementWithAttribs,
	name: string,
	attributePrefix: string = "",
): boolean {
	return (
		hasAttribute(elem, attributePrefix + name) ||
		hasAttribute(elem, `data-${name}`) ||
		hasProperty(elem.dataset, attributeNameToCamelCase(name))
	);
}

export function setAttribute(elem: ElementWithAttribs, name: string, value: string): void {
	if (elem.attribs) elem.attribs[name] = value;
	// tsec-disable-next-line
	else
		(elem as unknown as { setAttribute?: (name: string, value: string) => void }).setAttribute?.(
			name,
			value,
		);
}

export function safeSetAttribute(elem: ElementWithAttribs, name: string, value: string): void {
	if (elem.attribs) elem.attribs[name] = value;
	else safeElement.setPrefixedAttribute(SAFE_ATTRS, elem, name, value);
}

export function setProperty(elem: ElementWithAttribs, name: string, value: unknown): void {
	switch (name) {
		// Directly set some safe, known properties.
		case "disabled":
			(elem as HTMLOptionElement).disabled = value as boolean;
			return;
		case "selected":
			(elem as HTMLOptionElement).selected = value as boolean;
			return;
		case "checked":
			(elem as HTMLInputElement).checked = value as boolean;
			return;
		// Fall back to setting the property directly (unsafe).
		default:
			(elem as unknown as Record<string, unknown>)[name] = value;
	}
}

export function removeAttribute(elem: ElementWithAttribs, name: string): void {
	if (elem.attribs) delete elem.attribs[name];
	else elem.removeAttribute?.(name);
}

export function setAttributeOrDataset(
	elem: ElementWithAttribs,
	name: string,
	value: string,
	prefix: string = "",
): void {
	// Update whichever form of the attribute exists, preferring prefix form.
	if (hasAttribute(elem, `${prefix}${name}`)) {
		setAttribute(elem, `${prefix}${name}`, value);
	} else if (hasAttribute(elem, `data-${name}`)) {
		setAttribute(elem, `data-${name}`, value);
	} else {
		// Default to prefix form if neither exists.
		setAttribute(elem, `${prefix}${name}`, value);
	}
}

export function removeAttributeOrDataset(
	elem: ElementWithAttribs,
	name: string,
	prefix: string = "",
): void {
	removeAttribute(elem, `${prefix}${name}`);
	removeAttribute(elem, `data-${name}`);
}

export function cloneAttribute(
	elemFrom: ElementWithAttribs,
	elemDest: ElementWithAttribs,
	name: string,
): void {
	if (elemFrom.attribs && elemDest.attribs) {
		elemDest.attribs[name] = elemFrom.attribs[name];
	} else if (name.startsWith("data-")) {
		const datasetKey = attributeNameToCamelCase(name.slice(5));
		if (elemDest.dataset && elemFrom.dataset) {
			elemDest.dataset[datasetKey] = elemFrom.dataset[datasetKey];
		}
	} else {
		const attr = (elemFrom as Element)?.getAttribute?.(name);
		safeSetAttribute(elemDest as Element, name, attr || "");
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
		(original as ChildNode).replaceWith(...(replacement as Node[]));
		return;
	} else {
		const elem = original;
		const parent = elem.parentNode;
		if (!parent) return; // Should not happen if replacing
		const index = Array.from(parent.childNodes).indexOf(elem);
		(elem as unknown as MutableNode).parentNode = null;
		replacement.forEach((elem) => {
			(elem as unknown as MutableNode).parentNode = parent;
		});
		(parent as unknown as MutableNode).childNodes = ([] as ChildNode[])
			.concat(Array.from(parent.childNodes).slice(0, index))
			.concat(replacement as ChildNode[])
			.concat(Array.from(parent.childNodes).slice(index + 1));
	}
}

export function replaceChildren(parent: ParentNode, ...nodes: Node[]): void {
	if (hasFunction(parent, "replaceChildren")) {
		(parent as ParentNode).replaceChildren(...(nodes as Node[]));
	} else {
		(parent as unknown as MutableNode).childNodes = nodes as ChildNode[];
		nodes.forEach((node) => {
			(node as unknown as MutableNode).parentNode = parent;
		});
	}
}

export function appendChild(parent: Node, node: Node): Node {
	if (hasFunction(node, "appendChild")) {
		return parent.appendChild(node);
	} else {
		(parent as unknown as MutableNode).childNodes.push(node as ChildNode);
		(node as unknown as MutableNode).parentNode = parent;
		return node;
	}
}

export function removeChild(parent: ParentNode, node: Node): Node {
	if (hasFunction(node, "removeChild")) {
		return parent.removeChild(node);
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
	else return `${str.slice(0, maxLength - 1)}…`;
}

export function nodeToString(node: Node, maxLength: number = 0): string {
	if (globalThis.DocumentFragment && node instanceof DocumentFragment) {
		return Array.from(node.childNodes)
			.map((node) => nodeToString(node, maxLength))
			.join("");
	}
	return ellipsize((node as HTMLElement).outerHTML || node.nodeValue || String(node), maxLength);
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
