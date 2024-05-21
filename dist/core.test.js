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
const core_1 = require("./core");
class MockRenderer extends core_1.IRenderer {
    parseHTML(content, params) {
        return (params === null || params === void 0 ? void 0 : params.root)
            ? new jsdom_1.JSDOM(content).window.document
            : jsdom_1.JSDOM.fragment(content);
    }
    serializeHTML(fragment) {
        throw new Error("Not implemented.");
    }
    preprocessLocal(fpath, params) {
        throw new Error("Not implemented.");
    }
}
(0, mocha_1.describe)("Core", () => {
    (0, mocha_1.describe)("traverse", () => {
        (0, mocha_1.it)("empty document", () => {
            const fragment = jsdom_1.JSDOM.fragment("");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 0);
        });
        (0, mocha_1.it)("single element", () => {
            const fragment = jsdom_1.JSDOM.fragment("<div></div>");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 1);
        });
        (0, mocha_1.it)("multiple elements", () => {
            const num = 10;
            const html = new Array(num).fill("<div></div>").join("");
            const fragment = jsdom_1.JSDOM.fragment(html);
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, num);
        });
        (0, mocha_1.it)("nested elements", () => {
            const fragment = jsdom_1.JSDOM.fragment("<div><div></div></div>");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 2);
        });
        (0, mocha_1.it)("single text node", () => {
            const fragment = jsdom_1.JSDOM.fragment("text");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 1);
            assert.equal(nodes[0].nodeType, 3);
            assert.equal(nodes[0].nodeValue, "text");
            assert.equal(nodes[0].textContent, "text");
        });
        (0, mocha_1.it)("sibling text node", () => {
            const fragment = jsdom_1.JSDOM.fragment("<span></span>world");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 2);
        });
    });
    (0, mocha_1.describe)("safeEval", () => {
        (0, mocha_1.it)("simple sum", () => __awaiter(void 0, void 0, void 0, function* () {
            const fn = "a + b";
            const result = yield (0, core_1.safeEval)(fn, null, { a: 1, b: 2 });
            assert.equal(result, 3);
        }));
        (0, mocha_1.it)("sum with nested properties", () => __awaiter(void 0, void 0, void 0, function* () {
            const fn = "x.a + x.b";
            const result = yield (0, core_1.safeEval)(fn, null, { x: { a: 1, b: 2 } });
            assert.equal(result, 3);
        }));
        (0, mocha_1.it)("modifies variables", () => __awaiter(void 0, void 0, void 0, function* () {
            const object = { x: { a: 1 } };
            const fn = "x.a++";
            yield (0, core_1.safeEval)(fn, null, object);
            assert.equal(object.x.a, 2);
        }));
        (0, mocha_1.it)('passing "this" to function', () => __awaiter(void 0, void 0, void 0, function* () {
            const object = { x: { a: 1 } };
            const fn = "this.x.a++";
            yield (0, core_1.safeEval)(fn, object);
            assert.equal(object.x.a, 2);
        }));
        (0, mocha_1.it)("async call within function", () => __awaiter(void 0, void 0, void 0, function* () {
            const fn = "await Promise.resolve(1)";
            const result = yield (0, core_1.safeEval)(fn, null);
            assert.equal(result, 1);
        }));
        [
            { expression: "a && b", expected: false },
            { expression: "!a && !b", expected: false },
            { expression: "!a && b", expected: true },
            { expression: "a && !b", expected: false },
            { expression: "a || b", expected: true },
            { expression: "!a || !b", expected: true },
            { expression: "!a || b", expected: true },
            { expression: "a || !b", expected: false },
        ].forEach(({ expression, expected }) => {
            (0, mocha_1.it)(`boolean expressions with multiple variables: ${expression}`, () => __awaiter(void 0, void 0, void 0, function* () {
                const result = yield (0, core_1.safeEval)(expression, null, { a: false, b: true });
                assert.equal(result, expected);
            }));
        });
    });
    (0, mocha_1.describe)("eval", () => {
        (0, mocha_1.it)("using implicit `this` in function", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: 1 });
            const fn = "++a";
            const [result] = yield renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("a"), 2);
        }));
        (0, mocha_1.it)("using implicit `this` and nested values", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const renderer = new MockRenderer({ x: { a: 1 } });
            const fn = "++x.a";
            const [result] = yield renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal((_a = renderer.get("x")) === null || _a === void 0 ? void 0 : _a.a, 2);
        }));
        (0, mocha_1.it)("tracing works as expected", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: 1, b: 2, c: 3 });
            const [result, dependencies] = yield renderer.eval("a + b");
            assert.equal(result, 3);
            assert.deepEqual(dependencies, ["a", "b"]);
        }));
        (0, mocha_1.it)("use `global` in function", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer();
            global.foo = "bar";
            const [result] = yield renderer.eval("global.foo");
            assert.equal(result, "bar");
        }));
        [
            { expression: "a && b", expected: false },
            { expression: "!a && !b", expected: false },
            { expression: "!a && b", expected: true },
            { expression: "a && !b", expected: false },
            { expression: "a || b", expected: true },
            { expression: "!a || !b", expected: true },
            { expression: "!a || b", expected: true },
            { expression: "a || !b", expected: false },
        ].forEach(({ expression, expected }) => {
            (0, mocha_1.it)(`boolean expressions with multiple variables: ${expression}`, () => __awaiter(void 0, void 0, void 0, function* () {
                const renderer = new MockRenderer({ a: false, b: true });
                const [result] = yield renderer.eval(expression);
                assert.equal(result, expected);
            }));
        });
        (0, mocha_1.it)("mutating boolean expression with multiple variables", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: false, b: false });
            const expression = "a || b";
            assert.deepEqual(yield renderer.eval(expression), [false, ["a", "b"]]);
            yield renderer.set("a", true);
            assert.deepEqual(yield renderer.eval(expression), [true, ["a"]]);
            yield renderer.set("a", false);
            yield renderer.set("b", true);
            assert.deepEqual(yield renderer.eval(expression), [true, ["a", "b"]]);
            yield renderer.set("a", true);
            yield renderer.set("b", true);
            assert.deepEqual(yield renderer.eval(expression), [true, ["a"]]);
        }));
        (0, mocha_1.it)("runs callback after evaluation", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const fn = "a + b";
            let called = false;
            const callback = (result, dependencies) => {
                assert.equal(result, 3);
                assert.deepEqual(dependencies, ["a", "b"]);
                called = true;
            };
            yield renderer.eval(fn, {}, callback);
            assert(called);
        }));
        (0, mocha_1.it)("runs callback after dependency changes", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const fn = "a + b";
            let called = 0;
            const callback = (result, dependencies) => {
                assert.deepEqual(dependencies, ["a", "b"]);
                called++;
            };
            yield renderer.eval(fn, {}, callback);
            assert.equal(called, 1);
            yield renderer.set("a", 3);
            assert.equal(called, 2);
        }));
        (0, mocha_1.it)("tracks unseen dependencies from short-circuit expressions", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: false, b: false });
            const expression = "a && b";
            assert.deepEqual(yield renderer.eval(expression), [false, ["a"]]);
            yield renderer.set("a", true);
            assert.deepEqual(yield renderer.eval(expression), [false, ["a", "b"]]);
        }));
    });
});
