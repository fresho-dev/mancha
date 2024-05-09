import * as assert from "assert";
import { InertProxy, ReactiveProxy, ReactiveProxyStore, proxify, proxifyObject } from "./reactive";

describe("Mancha reactive module", () => {
  describe("ReactiveProxy", () => {
    it("get, set and watch", async () => {
      const proxy = ReactiveProxy.from(0);
      assert.equal(proxy.get(), 0);
      const watched = new Promise((resolve) => proxy.watch((val) => resolve(val)));
      proxy.set(1);
      assert.equal(await watched, 1);
      assert.equal(proxy.get(), 1);
    });

    it("get nested property", () => {
      const proxy = ReactiveProxy.from({ a: 1, b: { c: 2 } });
      assert.equal(proxy.get("a"), 1);
      assert.equal(proxy.get("b", "c"), 2);
    });

    it("set and watch nested property", async () => {
      const proxy = ReactiveProxy.from({ a: 1, b: 2 });
      assert.equal(proxy.get("a"), 1);
      assert.equal(proxy.get("b"), 2);

      let ops = 0;
      proxy.watch(() => ops++);
      await proxy.set({ a: 1, b: 3 });
      assert.ok(ops > 0);
      assert.equal(proxy.get("b"), 3);
    });

    it("manually trigger listeners", async () => {
      const arr = [1, 2, 3];
      let join = arr.join(",");
      const proxy = ReactiveProxy.from(arr);
      proxy.watch(async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        join = val!!.join(",");
      });

      arr.push(4);
      assert.equal(join, "1,2,3");
      const promise = proxy.trigger();
      assert.equal(join, "1,2,3");
      await promise;
      assert.equal(join, "1,2,3,4");
    });

    it("calling set awaits listeners", async () => {
      const proxy = ReactiveProxy.from(0);
      let value: number | null = proxy.get();
      proxy.watch(async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        value = val;
      });
      const promise = proxy.set(1);
      assert.equal(value, 0);
      await promise;
      assert.equal(value, 1);
    });
  });

  describe("InertProxy", () => {
    it("watch is ignored", async () => {
      const proxy = InertProxy.from(0);
      proxy.watch(() => assert.fail());
      (proxy as any).listeners.length = 0;
    });

    it("trigger is ignored", async () => {
      const proxy = InertProxy.from(0);
      proxy.watch(() => assert.fail());
      await proxy.trigger();
    });

    it("get, set and watch", async () => {
      const proxy = InertProxy.from(0);

      let ops = 0;
      proxy.watch(() => ops++);
      assert.equal(ops, 0);
      await proxy.set(1);
      assert.equal(ops, 0);
    });
  });

  describe("ReactiveProxyStore", () => {
    it("get, set and watch", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b"), 2);

      const watched = new Promise((resolve) => store.watch(["b"], (b) => resolve(b)));
      store.set("b", 3);
      assert.equal(await watched, 3);
      assert.equal(store.get("b"), 3);
    });

    it("set a value with a ReactiveProxy instance", () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      const proxy = ReactiveProxy.from(3);
      store.set("c", proxy);
      assert.equal(store.get("c"), proxy.get());
    });

    it("get nested property", () => {
      const store = new ReactiveProxyStore({ a: 1, b: { c: 2 } });
      assert.equal(store.get("a"), 1);
      assert.equal(store.get("b", "c"), 2);
    });

    it("watch nested property", async () => {
      const store = new ReactiveProxyStore({ x: { a: 1, b: 2 } });
      assert.equal(store.get("x", "a"), 1);
      assert.equal(store.get("x", "b"), 2);

      let ops = 0;
      store.watch(["x"], () => ops++);

      ops = 0;
      await store.set("x", { a: 1, b: 3 });
      assert.ok(ops > 0);
      assert.equal(store.get("x", "b"), 3);

      ops = 0;
      store.get("x").b = 2;
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(ops > 0);
      assert.equal(store.get("x", "b"), 2);
    });

    it("manually trigger listeners", async () => {
      const arr = [1, 2, 3];
      let join = arr.join(",");
      const store = new ReactiveProxyStore({ arr: arr });
      store.watch(["arr"], async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        join = val!!.join(",");
      });

      arr.push(4);
      assert.equal(join, "1,2,3");
      const promise = store.trigger(["arr"]);
      assert.equal(join, "1,2,3");
      await promise;
      assert.equal(join, "1,2,3,4");
    });

    it("calling set awaits listeners", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      let value: number | null = store.get("b");
      store.watch(["b"], async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        value = val;
      });
      const promise = store.set("b", 3);
      assert.equal(value, 2);
      await promise;
      assert.equal(value, 3);
    });

    it("entries() returns the ReactiveProxy instances", () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      const entries = Array.from(store.entries());
      assert.equal(entries.length, 2);
      assert.equal(entries[0][1] instanceof ReactiveProxy, true);
      assert.equal(entries[1][1] instanceof ReactiveProxy, true);
    });

    it("can be cloned from entries", () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      const clone = new ReactiveProxyStore(Object.fromEntries(store.entries()));
      assert.deepEqual(Array.from(clone.entries()), Array.from(store.entries()));
    });

    it("trace a single property", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      store.get("b");
      const [result, keys] = await store.trace(() => store.get("a"));
      store.get("b");
      assert.equal(result, 1);
      assert.deepEqual(keys, ["a"]);
    });

    it("trace multiple properties", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      const [result, keys] = await store.trace(() => store.get("a") + store.get("b"));
      assert.equal(result, 3);
      assert.deepEqual(keys, ["a", "b"]);
    });

    it("trace async function", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      const [result, keys] = await store.trace(async () => store.get("a") + store.get("b"));
      assert.equal(result, 3);
      assert.deepEqual(keys, ["a", "b"]);
    });

    it("trace function that throws", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      assert.rejects(async () => {
        await store.trace(() => {
          store.get("a") + store.get("b");
          throw new Error();
        });
      });
    });

    it("automatically updates computed properties", async () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      await store.computed("sum", () => store.get("a") + store.get("b"));
      assert.equal(store.get("sum"), 3);
      store.set("b", 3);
      await new Promise((resolve) => setTimeout(resolve, 1));
      assert.equal(store.get("sum"), 4);
    });
  });

  describe("proxify", () => {
    it("creates a proxy for ReactiveProxyStore", () => {
      const store = new ReactiveProxyStore({ a: 1, b: 2 });
      const proxy = proxify(store);

      assert.equal(proxy.a, 1);
      assert.equal(proxy.b, 2);

      proxy.a++;
      assert.equal(proxy.a, 2);
      assert.equal(store.get("a"), 2);
    });

    it("creates a proxy for array", () => {
      let ops = 0;
      const arr = [1, 2, 3];
      const proxy = proxifyObject(arr, () => ops++);
      assert.equal(ops, 0);

      // Operations that should trigger a callback.

      ops = 0;
      proxy.push(4);
      assert.ok(ops > 0);
      assert.deepEqual(arr, [1, 2, 3, 4]);

      ops = 0;
      proxy.pop();
      assert.ok(ops > 0);
      assert.deepEqual(arr, [1, 2, 3]);

      ops = 0;
      proxy.shift();
      assert.ok(ops > 0);
      assert.deepEqual(arr, [2, 3]);

      ops = 0;
      proxy.unshift(1);
      assert.ok(ops > 0);
      assert.deepEqual(arr, [1, 2, 3]);

      ops = 0;
      proxy.splice(1, 1);
      assert.ok(ops > 0);
      assert.deepEqual(arr, [1, 3]);

      ops = 0;
      proxy.splice(1, 0, 2);
      assert.ok(ops > 0);
      assert.deepEqual(arr, [1, 2, 3]);

      // Operations that should not trigger a callback.

      ops = 0;
      proxy.slice(1, 2);
      assert.equal(ops, 0);
      assert.deepEqual(arr, [1, 2, 3]);
    });

    it("creates a proxy for object", () => {
      let ops = 0;
      const obj: any = { a: 1, b: 2 };
      const proxy = proxifyObject(obj, () => ops++);
      assert.equal(ops, 0);

      // Operations that should trigger a callback.

      ops = 0;
      proxy.a++;
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 2, b: 2 });

      ops = 0;
      delete proxy["b"];
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 2 });
    });

    it("creates a deep proxy for object", () => {
      let ops = 0;
      const obj: any = { a: 1, b: 2 };
      const proxy = proxifyObject(obj, () => ops++, true);
      assert.equal(ops, 0);

      // Insert an object and modify it.

      ops = 0;
      proxy.c = { d: 4 };
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 4 } });

      ops = 0;
      proxy.c.d++;
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 5 } });

      // Insert an array and modify it.

      ops = 0;
      proxy.e = [null];
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 5 }, e: [null] });

      ops = 0;
      proxy.e[0] = 6;
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 5 }, e: [6] });
    });

    it("creates a shallow proxy for object", () => {
      let ops = 0;
      const obj: any = { a: 1, b: 2 };
      const proxy = proxifyObject(obj, () => ops++, false);
      assert.equal(ops, 0);

      // Insert an object and modify it.

      ops = 0;
      proxy.c = { d: 4 };
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 4 } });

      ops = 0;
      proxy.c.d++;
      assert.equal(ops, 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 5 } });

      // Insert an array and modify it.

      ops = 0;
      proxy.e = [null];
      assert.ok(ops > 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 5 }, e: [null] });

      ops = 0;
      proxy.e[0] = 6;
      assert.equal(ops, 0);
      assert.deepEqual(obj, { a: 1, b: 2, c: { d: 5 }, e: [6] });
    });

    it("proxifies existing properties when deep = true", () => {
      let ops = 0;
      const obj: any = { x: { a: 1, b: 2 } };
      const proxy = proxifyObject(obj, () => ops++, true);
      assert.equal(ops, 0);

      ops = 0;
      proxy.x.a++;
      assert.ok(ops > 0);
      assert.deepEqual(obj, { x: { a: 2, b: 2 } });
    });

    it("does not proxify existing properties when deep = false", () => {
      let ops = 0;
      const obj: any = { x: { a: 1, b: 2 } };
      const proxy = proxifyObject(obj, () => ops++, false);
      assert.equal(ops, 0);

      ops = 0;
      proxy.x.a++;
      assert.equal(ops, 0);
      assert.deepEqual(obj, { x: { a: 2, b: 2 } });
    });
  });
});
