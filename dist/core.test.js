"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const htmlparser2 = require("htmlparser2");
const core_1 = require("./core");
describe("Mancha core module", () => {
    describe("traverse", () => {
        it("empty document", () => {
            const document = htmlparser2.parseDocument("");
            const nodes = (0, core_1.traverse)(document);
            assert.equal(nodes.length, 0);
        });
        it("single element", () => {
            const document = htmlparser2.parseDocument("<div></div>");
            const nodes = (0, core_1.traverse)(document);
            assert.equal(nodes.length, 1);
        });
        it("multiple elements", () => {
            const num = 10;
            const html = new Array(num).fill("<div></div>").join("");
            const document = htmlparser2.parseDocument(html);
            const nodes = (0, core_1.traverse)(document);
            assert.equal(nodes.length, num);
        });
        it("nested elements", () => {
            const document = htmlparser2.parseDocument("<div><div></div></div>");
            const nodes = (0, core_1.traverse)(document);
            assert.equal(nodes.length, 2);
        });
    });
});
