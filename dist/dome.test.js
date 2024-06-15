import * as assert from "assert";
import * as htmlparser2 from "htmlparser2";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { appendChild, attributeNameToCamelCase, createElement, getAttribute, getNodeValue, getTextContent, insertBefore, replaceChildren, setNodeValue, setTextContent, traverse, } from "./dome.js";
const HTML_PARSERS = {
    jsdom: (html) => JSDOM.fragment(html),
    htmlparser2: (html) => htmlparser2.parseDocument(html),
};
async function testHtmlParsers(testName, testCode) {
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
            const node = fragment.childNodes[0];
            assert.equal(getAttribute(node, "attr1"), "1");
            assert.equal(getAttribute(node, "attr2"), "2");
            assert.equal(getAttribute(node, "attr3"), "3");
        });
        it("converts to camel case", () => {
            assert.equal(attributeNameToCamelCase("foo-bar"), "fooBar");
        });
    });
    describe("get and set text content", () => {
        testHtmlParsers("get and set text content", async (htmlParser) => {
            const fragment = htmlParser("<div>Hello World</div>");
            const node = fragment.childNodes[0];
            assert.equal(getTextContent(node), "Hello World");
            const text = "Hello Universe";
            setTextContent(node, text);
            assert.equal(getTextContent(node), text);
        });
    });
    describe("get and set node value", () => {
        testHtmlParsers("get and set node value", async (htmlParser) => {
            const fragment = htmlParser("Hello World");
            const node = fragment.childNodes[0];
            assert.equal(getNodeValue(node), "Hello World");
            const text = "Hello Universe";
            setNodeValue(node, text);
            assert.equal(getNodeValue(node), text);
        });
    });
    describe("create element", () => {
        testHtmlParsers("create element", async (htmlParser) => {
            const fragment = htmlParser("<div></div>");
            const node = fragment.childNodes[0];
            const elem = createElement("span", node.ownerDocument);
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
            const node = fragment.childNodes[0];
            const elem = createElement("span", node.ownerDocument);
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
            const node = fragment.childNodes[0];
            const elem1 = createElement("span", node.ownerDocument);
            const elem2 = createElement("span", node.ownerDocument);
            const elem3 = createElement("span", node.ownerDocument);
            replaceChildren(node, elem1, elem2, elem3);
            assert.equal(node.children[0], elem1);
            assert.equal(node.children[1], elem2);
            assert.equal(node.children[2], elem3);
            assert.equal(node.children.length, 3);
        });
    });
});
