import * as assert from "assert";
import { describe, it } from "node:test";
import { SignalStore } from "./store.js";

describe("SignalStore", () => {
  describe("properties", () => {
    it("init, get and set", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b"), 2);

      // Set new value.
      store.set("c", 3);
      assert.equal(store.get("c"), 3);

      // Update existing value.
      await store.set("a", 0);
      assert.equal(store.get("a"), 0);
    });
  });

  describe("effect", () => {
    it("effect gets called immediately", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b"), 2);

      let ops = 0;
      store.effect(() => ops++);
      assert.equal(ops, 1);
    });

    it("effect attaches observer", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b"), 2);
      let ops = 0;

      // Effect should be called as soon as it is set.
      store.effect(function () {
        this.a;
        ops++;
      });
      assert.ok(ops >= 1);

      // And then again once the accessed value is updated.
      ops = 0;
      await store.set("a", 0);
      assert.equal(ops, 1);
    });

    it("effect does not attach to observer for another value", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b"), 2);
      let ops = 0;

      // Effect should be called as soon as it is set.
      store.effect(function () {
        this.a;
        ops++;
      });
      assert.ok(ops >= 1);

      // The observer is not called when an unrelated value is updated.
      ops = 0;
      await store.set("b", 0);
      assert.equal(ops, 0);
    });

    it("effect stops calling observer after value is removed from store", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b"), 2);
      let ops = 0;

      // Effect should be called as soon as it is set.
      store.effect(function () {
        this.a;
        ops++;
      });
      assert.ok(ops >= 1);

      // The effect stops getting called after the value is removed.
      ops = 0;
      store.del("a");
      await store.set("a", 0);
      assert.equal(ops, 0);
    });

    it("effect calls observer for short-circuit expressions", async () => {
      const store = new SignalStore({ a: false, b: false });

      let ops = 0;
      store.effect(function () {
        this.a && this.b;
        ops++;
      });
      assert.ok(ops >= 1);

      ops = 0;
      await store.set("a", true);
      assert.ok(ops >= 1);

      ops = 0;
      await store.set("b", true);
      assert.equal(ops, 1);
    });

    it("effect throws exception", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      const error = new Error("Test error");

      // Synchronous.
      assert.throws(() => {
        store.effect(() => {
          throw error;
        });
      }, error);

      // Asynchronous.
      await assert.rejects(
        store.effect(async () => {
          throw error;
        }),
        error
      );
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
        const result = await store.eval(expression);
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
      const fn = "a + b";
      let ops = 0;
      store.effect(function () {
        this.a;
        this.b;
        ops++;
      });
      const result = store.eval(fn);
      assert.equal(result, 3);
      assert.ok(ops >= 1);
    });

    it("runs effect after dependency changes", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      const fn = "a + b";

      let ops = 0;
      store.effect(function () {
        this.a;
        this.b;
        ops++;
      });
      const result = store.eval(fn);
      assert.equal(result, 3);
      assert.ok(ops >= 1);

      ops = 0;
      await store.set("a", 0);
      assert.equal(ops, 1);
    });

    it("runs eval inside of effect", async () => {
      const store = new SignalStore({ a: 1, b: 2 });
      const { $ } = store;
      let result = null;
      store.effect(function () {
        result = this.eval("a + b");
      });
      assert.equal(result, 3);

      await store.set("a", 0);
      assert.equal(result, 2);
    });

    it("runs effect for short-circuit expressions", async () => {
      const store = new SignalStore({ a: false, b: false });
      const { $ } = store;
      let result = null;
      store.effect(function () {
        result = this.eval("a && b");
      });
      assert.equal(result, false);

      await store.set("a", true);
      assert.equal(result, false);

      await store.set("b", true);
      assert.equal(result, true);
    });

    // TODO: test eval throws exception.
    // TODO: test eval async function.
    // TODO: test eval of direct property.
  });

  // TODO: Test setting objects and arrays as store values.
});
