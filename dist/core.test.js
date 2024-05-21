"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mocha_1 = require("mocha");
const jsdom_1 = require("jsdom");
const core_1 = require("./core");
class MockRenderer extends core_1.IRenderer {
    parseHTML(content, params) {
        return params?.root
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
        (0, mocha_1.it)("simple sum", async () => {
            const fn = "a + b";
            const result = await (0, core_1.safeEval)(fn, null, { a: 1, b: 2 });
            assert.equal(result, 3);
        });
        (0, mocha_1.it)("sum with nested properties", async () => {
            const fn = "x.a + x.b";
            const result = await (0, core_1.safeEval)(fn, null, { x: { a: 1, b: 2 } });
            assert.equal(result, 3);
        });
        (0, mocha_1.it)("modifies variables", async () => {
            const object = { x: { a: 1 } };
            const fn = "x.a++";
            await (0, core_1.safeEval)(fn, null, object);
            assert.equal(object.x.a, 2);
        });
        (0, mocha_1.it)('passing "this" to function', async () => {
            const object = { x: { a: 1 } };
            const fn = "this.x.a++";
            await (0, core_1.safeEval)(fn, object);
            assert.equal(object.x.a, 2);
        });
        (0, mocha_1.it)("async call within function", async () => {
            const fn = "await Promise.resolve(1)";
            const result = await (0, core_1.safeEval)(fn, null);
            assert.equal(result, 1);
        });
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
            (0, mocha_1.it)(`boolean expressions with multiple variables: ${expression}`, async () => {
                const result = await (0, core_1.safeEval)(expression, null, { a: false, b: true });
                assert.equal(result, expected);
            });
        });
    });
    (0, mocha_1.describe)("eval", () => {
        (0, mocha_1.it)("using implicit `this` in function", async () => {
            const renderer = new MockRenderer({ a: 1 });
            const fn = "++a";
            const [result] = await renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("a"), 2);
        });
        (0, mocha_1.it)("using implicit `this` and nested values", async () => {
            const renderer = new MockRenderer({ x: { a: 1 } });
            const fn = "++x.a";
            const [result] = await renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("x")?.a, 2);
        });
        (0, mocha_1.it)("tracing works as expected", async () => {
            const renderer = new MockRenderer({ a: 1, b: 2, c: 3 });
            const [result, dependencies] = await renderer.eval("a + b");
            assert.equal(result, 3);
            assert.deepEqual(dependencies, ["a", "b"]);
        });
        (0, mocha_1.it)("use `global` in function", async () => {
            const renderer = new MockRenderer();
            global.foo = "bar";
            const [result] = await renderer.eval("global.foo");
            assert.equal(result, "bar");
        });
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
            (0, mocha_1.it)(`boolean expressions with multiple variables: ${expression}`, async () => {
                const renderer = new MockRenderer({ a: false, b: true });
                const [result] = await renderer.eval(expression);
                assert.equal(result, expected);
            });
        });
        (0, mocha_1.it)("mutating boolean expression with multiple variables", async () => {
            const renderer = new MockRenderer({ a: false, b: false });
            const expression = "a || b";
            assert.deepEqual(await renderer.eval(expression), [false, ["a", "b"]]);
            await renderer.set("a", true);
            assert.deepEqual(await renderer.eval(expression), [true, ["a"]]);
            await renderer.set("a", false);
            await renderer.set("b", true);
            assert.deepEqual(await renderer.eval(expression), [true, ["a", "b"]]);
            await renderer.set("a", true);
            await renderer.set("b", true);
            assert.deepEqual(await renderer.eval(expression), [true, ["a"]]);
        });
        (0, mocha_1.it)("runs callback after evaluation", async () => {
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const fn = "a + b";
            let called = false;
            const callback = (result, dependencies) => {
                assert.equal(result, 3);
                assert.deepEqual(dependencies, ["a", "b"]);
                called = true;
            };
            await renderer.watchExpr(fn, {}, callback);
            assert.ok(called);
        });
        (0, mocha_1.it)("runs callback after dependency changes", async () => {
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const fn = "a + b";
            let called = 0;
            const callback = (result, dependencies) => {
                assert.deepEqual(dependencies, ["a", "b"]);
                called++;
            };
            await renderer.watchExpr(fn, {}, callback);
            assert.equal(called, 1);
            await renderer.set("a", 3);
            assert.equal(called, 2);
        });
        (0, mocha_1.it)("tracks unseen dependencies from short-circuit expressions", async () => {
            const renderer = new MockRenderer({ a: false, b: false });
            const expression = "a && b";
            assert.deepEqual(await renderer.eval(expression), [false, ["a"]]);
            await renderer.set("a", true);
            assert.deepEqual(await renderer.eval(expression), [false, ["a", "b"]]);
        });
    });
    (0, mocha_1.describe)("watchExpr", () => {
        (0, mocha_1.it)("watches an expression for changes", async () => {
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const fn = "a + b";
            let called = 0;
            const callback = (result, dependencies) => {
                assert.deepEqual(dependencies, ["a", "b"]);
                called++;
            };
            await renderer.watchExpr(fn, {}, callback);
            assert.equal(called, 1);
            await renderer.set("a", 3);
            assert.equal(called, 2);
        });
        (0, mocha_1.it)("multiple listeners watch the same expression for changes", async () => {
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const fn = "a + b";
            let called = 0;
            const callback1 = () => called++;
            const callback2 = () => called++;
            await renderer.watchExpr(fn, {}, callback1);
            await renderer.watchExpr(fn, {}, callback2);
            assert.equal(called, 2);
            await renderer.set("a", 3);
            assert.equal(called, 4);
        });
    });
});
