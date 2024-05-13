"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mocha_1 = require("mocha");
const jsdom_1 = require("jsdom");
const attributes_1 = require("./attributes");
(0, mocha_1.describe)("Mancha Element module", () => {
    (0, mocha_1.describe)("Attributes", () => {
        (0, mocha_1.it)("get case insensitive", () => __awaiter(void 0, void 0, void 0, function* () {
            const fragment = jsdom_1.JSDOM.fragment('<div attr1="1" ATTR2="2" aTtR3="3"></div>');
            const node = fragment.childNodes[0];
            assert.equal(node.getAttribute("attr1"), "1");
            assert.equal(node.getAttribute("attr2"), "2");
            assert.equal(node.getAttribute("attr3"), "3");
        }));
        (0, mocha_1.it)("converts to camel case", () => {
            assert.equal((0, attributes_1.attributeNameToCamelCase)("foo-bar"), "fooBar");
        });
    });
});
