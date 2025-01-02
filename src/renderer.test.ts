import { IRenderer } from "./renderer.js";
import { ParserParams, RenderParams } from "./interfaces.js";
import { assert } from "./test_utils.js";
import { getAttributeOrDataset } from "./dome.js";

class MockRenderer extends IRenderer {
  readonly impl = "mock";
  parseHTML(content: string, params?: ParserParams): DocumentFragment {
    throw new Error("Not implemented.");
  }
  serializeHTML(fragment: DocumentFragment): string {
    throw new Error("Not implemented.");
  }
  preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
  createElement(tag: string): Element {
    throw new Error("Not implemented.");
  }
  textContent(node: Node, content: string): void {
    throw new Error("Not implemented.");
  }
}

export function testSuite(ctor: new (...args: any[]) => IRenderer): void {
  describe("parseHTML", () => {
    it("parses root document", function () {
      const renderer = new ctor();
      const html = "<html><head></head><body></body></html>";
      const doc = renderer.parseHTML(html, { rootDocument: true });
      assert.ok(doc instanceof Document);
    });

    it("parses document fragment", function () {
      const renderer = new ctor();
      const html = "<div></div>";
      const doc = renderer.parseHTML(html);
      assert.ok(doc instanceof DocumentFragment);
    });

    it("parses simple DIV element", function () {
      const renderer = new ctor();
      const html = "<div></div>";
      const fragment = renderer.parseHTML(html) as DocumentFragment;
      assert.equal(fragment.children.length, 1);
    });

    it("parses element with :for attribute", function () {
      const renderer = new ctor();
      const html = '<div :for="_ in [1,2,3]"></div>';
      const fragment = renderer.parseHTML(html) as DocumentFragment;
      assert.equal(fragment.children.length, 1);
      const attr = getAttributeOrDataset(fragment.children[0], "for", ":");
      assert.equal(attr, "_ in [1,2,3]");
    });

    it("parses element with data-for attribute", function () {
      const renderer = new ctor();
      const html = '<div data-for="_ in [1,2,3]"></div>';
      const fragment = renderer.parseHTML(html) as DocumentFragment;
      assert.equal(fragment.children.length, 1);
      const attr = getAttributeOrDataset(fragment.children[0], "for", ":");
      assert.equal(attr, "_ in [1,2,3]");
    });
  });

  describe("serializeHTML", () => {
    it("serializes a simple DIV element", function () {
      const renderer = new ctor();
      const html = "<div></div>";
      const fragment = renderer.parseHTML(html) as DocumentFragment;
      const serialized = renderer.serializeHTML(fragment);
      assert.equal(serialized, "<div></div>");
    });

    it("serializes a full document", function () {
      const renderer = new ctor();
      const html = "<html><head></head><body></body></html>";
      const doc = renderer.parseHTML(html, { rootDocument: true });
      const serialized = renderer.serializeHTML(doc);
      assert.equal(serialized, "<html><head></head><body></body></html>");
    });
  });

  describe("mount", () => {
    it("processes a :for directive", async function () {
      const renderer = new ctor();
      const html = '<div :for="item in [1,2,3]">{{ item }}</div>';
      const fragment = renderer.parseHTML(html);
      await renderer.mount(fragment);
      const elems = Array.from(fragment.querySelectorAll("div"));
      assert.equal(elems.length, 4); // Includes template element.
      assert.equal(elems[0].textContent, "{{ item }}");
      assert.equal(elems[1].textContent, "1");
      assert.equal(elems[2].textContent, "2");
      assert.equal(elems[3].textContent, "3");
    });
  });
}
