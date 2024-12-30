import { DomUtils } from "htmlparser2";
import { hasProperty } from "./dome.js";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

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
    chai.expect(actual).to.equal(expected);
  },
  deepEqual: (actual: any, expected: any, message?: string) => {
    chai.expect(actual).to.deep.equal(expected);
  },
  notEqual: (actual: any, expected: any, message?: string) => {
    chai.expect(actual).to.not.equal(expected);
  },
  ok: (value: any, message?: string) => {
    chai.expect(value).to.be.ok;
  },
  fail: (message?: string) => {
    throw new Error(message);
  },
  throws: (fn: () => void, message?: string) => {
    chai.expect(fn).to.throw();
  },
  rejects: async (p: Promise<any>, message?: string) => {
    await chai.expect(p).to.eventually.be.rejected;
  },
};
