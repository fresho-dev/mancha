import * as assert from "assert";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { attributeNameToCamelCase } from "./attributes.js";

describe("Mancha Element module", () => {
  describe("Attributes", () => {
    it("get case insensitive", async () => {
      const fragment = JSDOM.fragment('<div attr1="1" ATTR2="2" aTtR3="3"></div>');
      const node = fragment.childNodes[0] as Element;
      assert.equal(node.getAttribute("attr1"), "1");
      assert.equal(node.getAttribute("attr2"), "2");
      assert.equal(node.getAttribute("attr3"), "3");
    });

    it("converts to camel case", () => {
      assert.equal(attributeNameToCamelCase("foo-bar"), "fooBar");
    });
  });
});
