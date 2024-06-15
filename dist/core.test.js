<<<<<<< HEAD
import * as assert from "assert";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { IRenderer } from "./core.js";
import { traverse } from "./dome.js";
=======
import { describe } from "mocha";
import { IRenderer } from "./core.js";
>>>>>>> dev
class MockRenderer extends IRenderer {
    parseHTML(content, params) {
        throw new Error("Not implemented.");
    }
    serializeHTML(fragment) {
        throw new Error("Not implemented.");
    }
    preprocessLocal(fpath, params) {
        throw new Error("Not implemented.");
    }
}
describe("Core", () => {
    describe("clone", () => {
        // TOOD: Add clone tests.
    });
<<<<<<< HEAD
    describe("mount", () => async () => {
        it("mounts a document fragment", async () => {
            const renderer = new MockRenderer();
            const fragment = JSDOM.fragment("<div></div>");
            await renderer.mount(fragment);
            assert.equal(fragment.renderer, renderer);
        });
    });
    describe("eval", () => {
        it("simple sum", async () => {
            const fn = "a + b";
            const renderer = new MockRenderer({ a: 1, b: 2 });
            const [result] = await renderer.eval(fn);
            assert.equal(result, 3);
        });
        it("sum with nested properties", async () => {
            const fn = "x.a + x.b";
            const renderer = new MockRenderer({ x: { a: 1, b: 2 } });
            const [result] = await renderer.eval(fn);
            assert.equal(result, 3);
        });
        it("modifies variables", async () => {
            const object = { x: { a: 1 } };
            const fn = "x.a++";
            const renderer = new MockRenderer(object);
            const [result] = await renderer.eval(fn);
            assert.equal(result, 1);
            assert.equal(object.x.a, 2);
        });
        it("async call within function", async () => {
            const fn = "await Promise.resolve(1)";
            const renderer = new MockRenderer({ a: 1 });
            const [result] = await renderer.eval(fn);
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
            it(`boolean expressions with multiple variables: ${expression}`, async () => {
                const renderer = new MockRenderer({ a: false, b: true });
                const [result] = await renderer.eval(expression);
                assert.equal(result, expected);
            });
        });
        it("using implicit `this` in function", async () => {
            const fn = "++a";
            const renderer = new MockRenderer({ a: 1 });
            const [result] = await renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("a"), 2);
        });
        it("using implicit `this` and nested values", async () => {
            const renderer = new MockRenderer({ x: { a: 1 } });
            const fn = "++x.a";
            const [result] = await renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("x")?.a, 2);
        });
        it("tracing works as expected", async () => {
            const renderer = new MockRenderer({ a: 1, b: 2, c: 3 });
            const [result, dependencies] = await renderer.eval("a + b");
            assert.equal(result, 3);
            assert.deepEqual(dependencies, ["a", "b"]);
        });
        it("use `global` in function", async () => {
            const renderer = new MockRenderer();
            global.foo = "bar";
            const [result] = await renderer.eval("global.foo");
            assert.equal(result, "bar");
            delete global.foo;
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
            it(`boolean expressions with multiple variables: ${expression}`, async () => {
                const renderer = new MockRenderer({ a: false, b: true });
                const [result] = await renderer.eval(expression);
                assert.equal(result, expected);
            });
        });
        it("mutating boolean expression with multiple variables", async () => {
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
        it("runs callback after evaluation", async () => {
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
        it("runs callback after dependency changes", async () => {
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
        it("tracks unseen dependencies from short-circuit expressions", async () => {
            const renderer = new MockRenderer({ a: false, b: false });
            const expression = "a && b";
            assert.deepEqual(await renderer.eval(expression), [false, ["a"]]);
            await renderer.set("a", true);
            assert.deepEqual(await renderer.eval(expression), [false, ["a", "b"]]);
        });
=======
    describe("preprocess", () => {
        // TOOD: Add preprocess tests.
>>>>>>> dev
    });
    describe("render", () => {
        // TOOD: Add render tests.
    });
});
