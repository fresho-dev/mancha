import { SignalStore } from "./store.js";
import { assert } from "./test_utils.js";

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

    it("gets ancestor value", async () => {
      const parent = new SignalStore({ a: 1 });
      const child = new SignalStore({ $parent: parent });
      const value1 = child.get("a");
      const value2 = parent.get("a");
      assert.equal(value1, 1);
      assert.equal(value2, 1);
    });

    it("gets proxified ancestor value", async () => {
      const parent = new SignalStore({ a: 1 });
      const child = new SignalStore({ $parent: parent });
      const value1 = child.$.a;
      const value2 = parent.$.a;
      assert.equal(value1, 1);
      assert.equal(value2, 1);
    });

    it("sets ancestor value", async () => {
      const parent = new SignalStore({ a: 1 });
      const child = new SignalStore({ $parent: parent });
      child.set("a", 2);
      const value1 = child.get("a");
      const value2 = parent.get("a");
      assert.equal(value1, 2);
      assert.equal(value2, 2);
    });

    it("sets property with '.' in name", async () => {
      const store = new SignalStore();
      store.set("a.b", 1);
      assert.equal(store.get("a.b"), 1);
    });
  });

  it("sets proxified ancestor value", async () => {
    const parent = new SignalStore({ a: 1 });
    const child = new SignalStore({ $parent: parent });
    child.$.a = 2;
    const value1 = child.get("a");
    const value2 = parent.get("a");
    assert.equal(value1, 2);
    assert.equal(value2, 2);
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
      }, error.message);

      // Asynchronous.
      await assert.rejects(
        store.effect(async () => {
          throw error;
        }),
        error.message
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
      const object = { a: 1 };
      const fn = "a = a + 1";
      const store = new SignalStore(object);
      const result = store.eval(fn);
      assert.equal(result, undefined);
      assert.equal(store.get("a"), 2);
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

    it("modifies variables in nested objects", async () => {
      const object = { x: { a: 1 } };
      const fn = "x.a = x.a + 1";
      const store = new SignalStore(object);
      const result = await store.eval(fn);
      assert.equal(result, undefined);
      assert.deepEqual(store.get("x"), { a: 2 });
    });

    it("returns strings as-is", async () => {
      const store = new SignalStore();
      const result = store.eval("'foo'");
      assert.equal(result, "foo");
    });

    it("string concatenation", async () => {
      const store = new SignalStore({ foo: "bar" });
      const result = store.eval("'foo' + foo");
      assert.equal(result, "foobar");
    });

    it("calling string methods", async () => {
      const store = new SignalStore({ foo: "bar" });
      const result = store.eval("('foo' + foo).toUpperCase()");
      assert.equal(result, "FOOBAR");
    });

    it("use `globalThis` in function", async () => {
      const store = new SignalStore();
      (globalThis as any).foo = "bar";
      const result = store.eval("foo");
      assert.equal(result, "bar");
      delete (globalThis as any).foo;
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
