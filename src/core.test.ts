import * as assert from "assert";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { IRenderer, safeEval, traverse } from "./core";
import { ParserParams, RenderParams } from "./interfaces";

class MockRenderer extends IRenderer {
  parseHTML(content: string, params?: ParserParams): DocumentFragment {
    return params?.root
      ? (new JSDOM(content).window.document as unknown as DocumentFragment)
      : JSDOM.fragment(content);
  }
  serializeHTML(fragment: DocumentFragment): string {
    throw new Error("Not implemented.");
  }
  preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

describe("Core", () => {
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

  describe("safeEval", () => {
    it("simple sum", async () => {
      const fn = "a + b";
      const result = await safeEval(fn, null, { a: 1, b: 2 });
      assert.equal(result, 3);
    });

    it("sum with nested properties", async () => {
      const fn = "x.a + x.b";
      const result = await safeEval(fn, null, { x: { a: 1, b: 2 } });
      assert.equal(result, 3);
    });

    it("modifies variables", async () => {
      const object = { x: { a: 1 } };
      const fn = "x.a++";
      await safeEval(fn, null, object);
      assert.equal(object.x.a, 2);
    });

    it('passing "this" to function', async () => {
      const object = { x: { a: 1 } };
      const fn = "this.x.a++";
      await safeEval(fn, object);
      assert.equal(object.x.a, 2);
    });

    it("async call within function", async () => {
      const fn = "await Promise.resolve(1)";
      const result = await safeEval(fn, null);
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
        const result = await safeEval(expression, null, { a: false, b: true });
        assert.equal(result, expected);
      });
    });
  });

  describe("eval", () => {
    it("using implicit `this` in function", async () => {
      const renderer = new MockRenderer({ a: 1 });
      const fn = "++a";
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
      (global as any).foo = "bar";
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
      const callback = (result: any, dependencies: string[]) => {
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
      const callback = (result: any, dependencies: string[]) => {
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
  });

  describe("watchExpr", () => {
    it("watches an expression for changes", async () => {
      const renderer = new MockRenderer({ a: 1, b: 2 });
      const fn = "a + b";
      let called = 0;
      const callback = (result: any, dependencies: string[]) => {
        assert.deepEqual(dependencies, ["a", "b"]);
        called++;
      };
      await renderer.watchExpr(fn, {}, callback);
      assert.equal(called, 1);
      await renderer.set("a", 3);
      assert.equal(called, 2);
    });

    it("multiple listeners watch the same expression for changes", async () => {
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