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
      await store.del("a");
      ops = 0;
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
      const object = { x: { a: 0 } };
      const fn = "x.a = x.a + 1";
      const store = new SignalStore(object);
      let notified = 0;
      store.effect(function () {
        this.x.a;
        notified++;
      });
      assert.equal(notified, 1);
      const result = await store.eval(fn);
      assert.equal(result, undefined);
      assert.deepEqual(store.get("x"), { a: 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(notified, 2);
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

  describe("$resolve", () => {
    it("returns state object with initial pending state", async () => {
      const store = new SignalStore();
      const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve("done"), 10));
      const state = store.$resolve(fn);

      assert.equal(state.$pending, true);
      assert.equal(state.$result, null);
      assert.equal(state.$error, null);
    });

    it("resolves with result on success", async () => {
      const store = new SignalStore();
      const fn = () => Promise.resolve("success");
      const state = store.$resolve(fn);

      // Wait for promise to resolve.
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(state.$pending, false);
      assert.equal(state.$result, "success");
      assert.equal(state.$error, null);
    });

    it("resolves with error on failure", async () => {
      const store = new SignalStore();
      const fn = () => Promise.reject(new Error("failure"));
      const state = store.$resolve(fn);

      // Wait for promise to reject.
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(state.$pending, false);
      assert.equal(state.$result, null);
      assert.ok(state.$error instanceof Error);
      assert.equal(state.$error?.message, "failure");
    });

    it("converts non-Error rejections to Error objects", async () => {
      const store = new SignalStore();
      const fn = () => Promise.reject("string error");
      const state = store.$resolve(fn);

      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.ok(state.$error instanceof Error);
      assert.equal(state.$error?.message, "string error");
    });

    it("passes options to the function", async () => {
      const store = new SignalStore();
      let receivedOptions: any = null;
      const fn = (options: any) => {
        receivedOptions = options;
        return Promise.resolve("done");
      };

      store.$resolve(fn, { path: { id: "123" }, query: { limit: 10 } });
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.deepEqual(receivedOptions, { path: { id: "123" }, query: { limit: 10 } });
    });

    it("works without options", async () => {
      const store = new SignalStore();
      let receivedOptions: any = "not-called";
      const fn = (options?: any) => {
        receivedOptions = options;
        return Promise.resolve("done");
      };

      store.$resolve(fn);
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(receivedOptions, undefined);
    });

    it("resolves with complex object result", async () => {
      const store = new SignalStore();
      const data = { users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] };
      const fn = () => Promise.resolve(data);
      const state = store.$resolve(fn);

      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.deepEqual(state.$result, data);
    });

    it("multiple resolves are independent", async () => {
      const store = new SignalStore();
      const fn1 = () => Promise.resolve("first");
      const fn2 = () => Promise.resolve("second");

      const state1 = store.$resolve(fn1);
      const state2 = store.$resolve(fn2);

      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(state1.$result, "first");
      assert.equal(state2.$result, "second");
    });

    it("handles slow async functions", async () => {
      const store = new SignalStore();
      const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve("slow"), 50));
      const state = store.$resolve(fn);

      // Still pending after 10ms.
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(state.$pending, true);
      assert.equal(state.$result, null);

      // Resolved after 60ms.
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(state.$pending, false);
      assert.equal(state.$result, "slow");
    });

    it("state properties update correctly after resolution", async () => {
      const store = new SignalStore();
      const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve("done"), 10));
      const state = store.$resolve(fn);

      // Initially pending.
      assert.equal(state.$pending, true);
      assert.equal(state.$result, null);

      // Wait for promise to resolve.
      await new Promise((resolve) => setTimeout(resolve, 30));

      // State should be updated.
      assert.equal(state.$pending, false);
      assert.equal(state.$result, "done");
    });

    it("integrates with store assignment for reactivity", async () => {
      const store = new SignalStore({ myState: null });
      const fn = () => Promise.resolve("resolved");

      let observerCalls = 0;
      store.effect(function () {
        this.myState;
        observerCalls++;
      });

      // Initial call.
      assert.ok(observerCalls >= 1);

      // Assign $resolve result to store - this triggers reactivity.
      const initialCalls = observerCalls;
      await store.set("myState", store.$resolve(fn));

      // Observer should have been called due to assignment.
      assert.ok(observerCalls > initialCalls);
    });

    it("can be used via $ proxy", async () => {
      const store = new SignalStore();
      const fn = () => Promise.resolve("via-proxy");

      // Access $resolve via the $ proxy.
      const state = store.$.$resolve(fn);

      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(state.$result, "via-proxy");
    });

    it("works with typed-routes-like client signature", async () => {
      // Simulate typed-routes client method signature.
      interface User {
        id: string;
        name: string;
      }

      const mockClient = {
        getUser: (options: { path: { id: string } }): Promise<User> => {
          return Promise.resolve({ id: options.path.id, name: "Test User" });
        },
        listUsers: (options?: { query?: { limit?: number } }): Promise<User[]> => {
          const limit = options?.query?.limit ?? 10;
          return Promise.resolve(
            Array.from({ length: limit }, (_, i) => ({ id: String(i), name: `User ${i}` }))
          );
        },
        deleteUser: (options: { path: { id: string } }): Promise<{ success: boolean }> => {
          return Promise.resolve({ success: true });
        },
      };

      const store = new SignalStore();

      // Test getUser with path params.
      const userState = store.$resolve(mockClient.getUser, { path: { id: "42" } });
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.deepEqual(userState.$result, { id: "42", name: "Test User" });

      // Test listUsers with query params.
      const listState = store.$resolve(mockClient.listUsers, { query: { limit: 3 } });
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(listState.$result?.length, 3);

      // Test listUsers without params.
      const defaultListState = store.$resolve(mockClient.listUsers);
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(defaultListState.$result?.length, 10);

      // Test deleteUser.
      const deleteState = store.$resolve(mockClient.deleteUser, { path: { id: "42" } });
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.deepEqual(deleteState.$result, { success: true });
    });

    it("handles function that throws synchronously", async () => {
      const store = new SignalStore();
      const fn = () => {
        throw new Error("sync error");
      };

      // The function throws, but $resolve should catch it.
      const state = store.$resolve(fn as any);

      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(state.$pending, false);
      assert.ok(state.$error instanceof Error);
      assert.equal(state.$error?.message, "sync error");
    });

    it("clears error state from previous pending state", async () => {
      const store = new SignalStore();
      const fn = () => Promise.reject(new Error("failed"));
      const state = store.$resolve(fn);

      // Initial state.
      assert.equal(state.$pending, true);
      assert.equal(state.$error, null);

      await new Promise((resolve) => setTimeout(resolve, 20));

      // After rejection.
      assert.equal(state.$pending, false);
      assert.ok(state.$error !== null);
    });

    it("returns correct types for result", async () => {
      const store = new SignalStore();

      // Number result.
      const numState = store.$resolve(() => Promise.resolve(42));
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(numState.$result, 42);

      // Boolean result.
      const boolState = store.$resolve(() => Promise.resolve(true));
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(boolState.$result, true);

      // Array result.
      const arrState = store.$resolve(() => Promise.resolve([1, 2, 3]));
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.deepEqual(arrState.$result, [1, 2, 3]);

      // Null result (valid).
      const nullState = store.$resolve(() => Promise.resolve(null));
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(nullState.$result, null);
      assert.equal(nullState.$pending, false);
      assert.equal(nullState.$error, null);
    });
  });

  // TODO: Test setting objects and arrays as store values.
});
