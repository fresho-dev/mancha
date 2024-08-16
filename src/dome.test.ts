import * as assert from "assert";
import * as htmlparser2 from "htmlparser2";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import {
  appendChild,
  attributeNameToCamelCase,
  getAttribute,
  insertBefore,
  replaceChildren,
  traverse,
} from "./dome.js";
import { getTextContent } from "./test_utils.js";

const HTML_PARSERS = {
  jsdom: (html: string) => JSDOM.fragment(html),
  htmlparser2: (html: string) => htmlparser2.parseDocument(html) as unknown as DocumentFragment,
};

async function testHtmlParsers(
  testName: string,
  testCode: (htmlParser: (html: string) => Document | DocumentFragment | Node) => Promise<any>
) {
  for (const [parserName, parserMethod] of Object.entries(HTML_PARSERS)) {
    describe(parserName, () => it(testName, () => testCode(parserMethod)));
  }
}

describe("Dome", () => {
  describe("traverse", () => {
    it("empty document", () => {
      const fragment = JSDOM.fragment("");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 0);
    });

    it("single element", () => {
      const fragment = JSDOM.fragment("<div></div>");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 1);
    });

    it("multiple elements", () => {
      const num = 10;
      const html = new Array(num).fill("<div></div>").join("");
      const fragment = JSDOM.fragment(html);
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, num);
    });

    it("nested elements", () => {
      const fragment = JSDOM.fragment("<div><div></div></div>");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 2);
    });

    it("single text node", () => {
      const fragment = JSDOM.fragment("text");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].nodeType, 3);
      assert.equal(nodes[0].nodeValue, "text");
      assert.equal(nodes[0].textContent, "text");
    });

    it("sibling text node", () => {
      const fragment = JSDOM.fragment("<span></span>world");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 2);
    });
  });

  describe("getAttribute", () => {
    testHtmlParsers("get case insensitive", async (htmlParser) => {
      const fragment = htmlParser('<div attr1="1" ATTR2="2" aTtR3="3"></div>');
      const node = fragment.childNodes[0] as Element;
      assert.equal(getAttribute(node, "attr1"), "1");
      assert.equal(getAttribute(node, "attr2"), "2");
      assert.equal(getAttribute(node, "attr3"), "3");
    });

    it("converts to camel case", () => {
      assert.equal(attributeNameToCamelCase("foo-bar"), "fooBar");
    });
  });

  describe("get and set node value", () => {
    testHtmlParsers("get and set node value", async (htmlParser) => {
      const fragment = htmlParser("Hello World");
      const node = fragment.childNodes[0] as Text;
      assert.equal(node.nodeValue, "Hello World");

      const text = "Hello Universe";
      node.nodeValue = text;
      // setNodeValue(node, text);
      assert.equal(node.nodeValue, text);
    });
  });

  describe("create element", () => {
    testHtmlParsers("create element", async (htmlParser) => {
      const fragment = htmlParser("<div></div>");
      const node = fragment.childNodes[0] as Element;
      const elem = htmlParser("<span></span>").childNodes[0] as Element;
      appendChild(node, elem);
      assert.equal(elem.parentNode, node);
      assert.equal(node.firstChild, elem);
      assert.equal(node.lastChild, elem);
      assert.equal(node.children.length, 1);
    });
  });

  describe("insert before", () => {
    testHtmlParsers("insert before first element", async (htmlParser) => {
      const fragment = htmlParser("<div><span></span><span></span></div>");
      const node = fragment.childNodes[0] as Element;
      const elem = htmlParser("<span></span>").childNodes[0] as Element;
      const reference = node.children[0];
      insertBefore(node, elem, reference);
      assert.equal(node.children[0], elem);
      assert.equal(node.children[1], reference);
      assert.equal(node.children.length, 3);
    });
  });

  describe("replace children", () => {
    testHtmlParsers("replace children", async (htmlParser) => {
      const fragment = htmlParser("<div><span></span><span></span></div>");
      const node = fragment.childNodes[0] as Element;
      const elem1 = htmlParser("<span></span>").childNodes[0] as Element;
      const elem2 = htmlParser("<span></span>").childNodes[0] as Element;
      const elem3 = htmlParser("<span></span>").childNodes[0] as Element;
      replaceChildren(node, elem1, elem2, elem3);
      assert.equal(node.children[0], elem1);
      assert.equal(node.children[1], elem2);
      assert.equal(node.children[2], elem3);
      assert.equal(node.children.length, 3);
    });
  });
});
