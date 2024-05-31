import * as assert from "assert";
import { describe, it } from "mocha";
import { SignalStore } from "./store.js";

describe("Signal", () => {
  describe("SignalStore", () => {
    it("get, set and update", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      const { $ } = store;
      assert.equal($.a, 1);
      assert.equal($.b, 2);

      $.b = 3;
      assert.equal(store.$.b, 3);
    });
  });
  describe("eval", () => {
    it("simple sum", async () => {
      const fn = "a + b";
      const store = new SignalStore({ a: 1, b: 2 });
      const result = store.eval(fn);
      assert.equal(result, 3);
    });

    it("sum with nested properties", async () => {
      const fn = "x.a + x.b";
      const store = new SignalStore({ x: { a: 1, b: 2 } });
      const result = store.eval(fn);
      assert.equal(result, 3);
    });

    it("modifies variables", async () => {
      const object = { x: { a: 1 } };
      const fn = "x.a++";
      const store = new SignalStore(object);
      const result = store.eval(fn);
      assert.equal(result, 1);
      assert.equal(object.x.a, 2);
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
        const store = new SignalStore({ a: false, b: true });
        const result = store.eval(expression);
        assert.equal(result, expected);
      });
    });

    it("use `global` in function", async () => {
      const store = new SignalStore();
      (global as any).foo = "bar";
      const result = store.eval("global.foo");
      assert.equal(result, "bar");
      delete (global as any).foo;
    });

    it("runs effect after evaluation", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      const { $ } = store;
      const fn = "a + b";
      let ops = 0;
      store.effect(() => {
        $.a;
        $.b;
        ops++;
      });
      store.eval(fn);
      assert.equal(ops, 1);
    });

    it("runs effect after dependency changes", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      const { $ } = store;
      const fn = "a + b";
      let ops = 0;
      store.effect(() => {
        $.a;
        $.b;
        ops++;
      });
      store.eval(fn);
      assert.equal(ops, 1);
      $.a = 0;
      assert.equal(ops, 2);
    });

    it("runs effect for unseen dependencies from short-circuit expressions", async () => {
      const store = new SignalStore({ a: false, b: false });
      const { $ } = store;
      const fn = "a && b";

      let ops = 0;
      store.effect(() => {
        $.a;
        $.b;
        ops++;
      });

      store.eval(fn);
      assert.equal(ops, 1);

      $.a = true;
      assert.equal(ops, 2);

      $.b = true;
      assert.equal(ops, 3);
    });
  });

  it("runs computed after evaluation", async () => {
    const store = new SignalStore({ a: 1, b: 2 });
    const { $ } = store;
    const fn = "a + b";
    let ops = 0;
    const result = store.computed(() => {
      $.a;
      $.b;
      return ++ops;
    });
    store.eval(fn);
    assert.equal(result.value, 1);
  });

  it("runs computed after dependency changes", async () => {
    const store = new SignalStore({ a: 1, b: 2 });
    const { $ } = store;
    const fn = "a + b";
    let ops = 0;
    const result = store.computed(() => {
      $.a;
      $.b;
      return ++ops;
    });
    store.eval(fn);
    assert.equal(result.value, 1);
    $.a = 0;
    assert.equal(result.value, 2);
  });

  it("runs computed for unseen dependencies from short-circuit expressions", async () => {
    const store = new SignalStore({ a: false, b: false });
    const { $ } = store;
    const fn = "a && b";

    let ops = 0;
    const result = store.computed(() => {
      $.a;
      $.b;
      return ++ops;
    });

    store.eval(fn);
    assert.equal(result.value, 1);

    $.a = true;
    assert.equal(result.value, 2);

    $.b = true;
    assert.equal(result.value, 3);
  });

  // TODO: Test setting objects and arrays as store values.
});
