import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DomUtils } from "htmlparser2";
import { hasProperty } from "./dome.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./store.js";

/** Time to sleep for reactive side effects to complete (1.1x debounce time). */
export const REACTIVE_SLEEP_MS = Math.ceil(REACTIVE_DEBOUNCE_MILLIS * 1.1);

/** Sleep for the reactive debounce period to allow side effects to complete. */
export function sleepForReactivity(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, REACTIVE_SLEEP_MS));
}

export function innerHTML(elem: Element): string {
	if (hasProperty(elem, "innerHTML")) return elem.innerHTML;
	else return DomUtils.getInnerHTML(elem as unknown as import("domhandler").Element);
}

export function setInnerHTML(elem: Element, html: string): void {
	// tsec-disable-next-line
	(elem as unknown as { innerHTML: string }).innerHTML = html;
}

interface NodeLike {
	type: string;
	data?: string;
	name?: string;
	children?: NodeLike[];
	textContent?: string;
}

// Custom recursive textContent that skips <template> tags for domhandler nodes.
export function getTextContent(node: Element | unknown): string | null {
	if (hasProperty(node, "textContent")) return (node as Element).textContent;
	const n = node as NodeLike;
	if (n.type === "text") return n.data || null;
	if ((node as NodeLike).type === "tag" && (node as NodeLike).name === "template") return "";
	if ((node as NodeLike).children)
		return (node as NodeLike).children?.map(getTextContent).join("") ?? "";
	return "";
}

export const isNode =
	typeof process !== "undefined" && process.versions != null && process.versions.node != null;

export async function setupGlobalTestEnvironment() {
	// Set up global test environment for DOM manipulation.

	// Fall back to JSDOM for DOM manipulation during testing.
	if (!globalThis.window) {
		// Import JSDOM dynamically, because it's not available in browser context.
		const jsdomName = "jsdom";
		const { JSDOM } = await import(jsdomName);
		const dom = new JSDOM(``, { url: "http://localhost/" });

		// Types.
		globalThis.Document = globalThis.Document || dom.window.Document;
		globalThis.DocumentFragment = globalThis.DocumentFragment || dom.window.DocumentFragment;

		// Objects and Classes.
		globalThis.window = globalThis.window || (dom.window as unknown as Window & typeof globalThis);
		globalThis.document = globalThis.document || dom.window.document;
		globalThis.DOMParser = globalThis.DOMParser || dom.window.DOMParser;
		globalThis.XMLSerializer = globalThis.XMLSerializer || dom.window.XMLSerializer;
		globalThis.PopStateEvent = globalThis.PopStateEvent || dom.window.PopStateEvent;
	}
}

export function createFragment(html: string): DocumentFragment {
	// Use DOMParser to avoid tsec innerHTML violation and unify Node/Browser behavior.
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const fragment = document.createDocumentFragment();
	// Move nodes to fragment
	while (doc.body.firstChild) {
		fragment.appendChild(doc.body.firstChild);
	}
	return fragment;
}

// Map the assert methods using Chai.
chai.use(chaiAsPromised);
export const assert = {
	equal: (actual: unknown, expected: unknown, message?: string) => {
		chai.expect(actual, message).to.equal(expected);
	},
	deepEqual: (actual: unknown, expected: unknown, message?: string) => {
		chai.expect(actual, message).to.deep.equal(expected);
	},
	notEqual: (actual: unknown, expected: unknown, message?: string) => {
		chai.expect(actual, message).to.not.equal(expected);
	},
	greaterEqual: (actual: unknown, expected: unknown, message?: string) => {
		chai.expect(actual, message).to.be.gte(expected as number);
	},
	ok: (value: unknown, message?: string) => {
		chai.expect(value, message).to.be.ok;
	},
	fail: (message?: string) => {
		throw new Error(message);
	},
	throws: (fn: () => void, message?: string) => {
		chai.expect(fn, message).to.throw();
	},
	rejects: async (p: Promise<unknown>, message?: string) => {
		await chai.expect(p, message).to.eventually.be.rejected;
	},
};
