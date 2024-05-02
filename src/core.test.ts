import * as assert from "assert";
import * as htmlparser2 from "htmlparser2";

import { traverse } from "./core";

describe("Mancha core module", () => {
  describe("traverse", () => {
    it("empty document", () => {
      const document = htmlparser2.parseDocument("");
      const nodes = traverse(document as unknown as DocumentFragment);
      assert.equal(nodes.length, 0);
    });

    it("single element", () => {
      const document = htmlparser2.parseDocument("<div></div>");
      const nodes = traverse(document as unknown as DocumentFragment);
      assert.equal(nodes.length, 1);
    });

    it("multiple elements", () => {
      const num = 10;
      const html = new Array(num).fill("<div></div>").join("");
      const document = htmlparser2.parseDocument(html);
      const nodes = traverse(document as unknown as DocumentFragment);
      assert.equal(nodes.length, num);
    });

    it("nested elements", () => {
      const document = htmlparser2.parseDocument("<div><div></div></div>");
      const nodes = traverse(document as unknown as DocumentFragment);
      assert.equal(nodes.length, 2);
    });
  });
});
