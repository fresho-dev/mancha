import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DomUtils } from "htmlparser2";
import { hasProperty } from "./dome.js";

export function innerHTML(elem: Element): string {
  if (hasProperty(elem, "innerHTML")) return elem.innerHTML;
  else return DomUtils.getInnerHTML(elem as any);
}

export function getTextContent(elem: Element): string | null {
  if (hasProperty(elem, "textContent")) return elem.textContent;
  else return DomUtils.textContent(elem as any);
}

// Map the assert methods using Chai.
chai.use(chaiAsPromised);
export const assert = {
  equal: (actual: any, expected: any, message?: string) => {
    chai.expect(actual, message).to.equal(expected);
  },
  deepEqual: (actual: any, expected: any, message?: string) => {
    chai.expect(actual, message).to.deep.equal(expected);
  },
  notEqual: (actual: any, expected: any, message?: string) => {
    chai.expect(actual, message).to.not.equal(expected);
  },
  greaterEqual: (actual: any, expected: any, message?: string) => {
    chai.expect(actual, message).to.be.gte(expected);
  },
  ok: (value: any, message?: string) => {
    chai.expect(value, message).to.be.ok;
  },
  fail: (message?: string) => {
    throw new Error(message);
  },
  throws: (fn: () => void, message?: string) => {
    chai.expect(fn, message).to.throw();
  },
  rejects: async (p: Promise<any>, message?: string) => {
    await chai.expect(p, message).to.eventually.be.rejected;
  },
};

// Fall back to JSDOM for DOM manipulation during testing.
if (!globalThis.window) {
  // Import JSDOM dynamically, because it's not available in browser context.
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM();

  // Types.
  globalThis.Document = globalThis.Document || dom.window.Document;
  globalThis.DocumentFragment = globalThis.DocumentFragment || dom.window.DocumentFragment;

  // Objects and Classes.
  globalThis.window = globalThis.window || dom.window;
  globalThis.document = globalThis.document || dom.window.document;
  globalThis.DOMParser = globalThis.DOMParser || dom.window.DOMParser;
  globalThis.XMLSerializer = globalThis.XMLSerializer || dom.window.XMLSerializer;
}
