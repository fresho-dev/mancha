import { DomUtils } from "htmlparser2";
import { hasProperty } from "./dome.js";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
export function innerHTML(elem) {
    if (hasProperty(elem, "innerHTML"))
        return elem.innerHTML;
    else
        return DomUtils.getInnerHTML(elem);
}
export function getTextContent(elem) {
    if (hasProperty(elem, "textContent"))
        return elem.textContent;
    else
        return DomUtils.textContent(elem);
}
// Map the assert methods using Chai.
chai.use(chaiAsPromised);
export const assert = {
    equal: (actual, expected, message) => {
        chai.expect(actual).to.equal(expected);
    },
    deepEqual: (actual, expected, message) => {
        chai.expect(actual).to.deep.equal(expected);
    },
    notEqual: (actual, expected, message) => {
        chai.expect(actual).to.not.equal(expected);
    },
    ok: (value, message) => {
        chai.expect(value).to.be.ok;
    },
    fail: (message) => {
        throw new Error(message);
    },
    throws: (fn, message) => {
        chai.expect(fn).to.throw();
    },
    rejects: async (p, message) => {
        await chai.expect(p).to.eventually.be.rejected;
    },
};
