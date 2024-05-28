import * as assert from "assert";
import { describe, it } from "mocha";
import { InertProxy, REACTIVE_DEBOUNCE_MILLIS, ReactiveProxy, ReactiveProxyStore, proxifyStore, proxifyObject, } from "./reactive.js";
describe("Reactive", () => {
    describe("ReactiveProxy", () => {
        it("get, set and watch", async () => {
            const proxy = ReactiveProxy.from(0);
            assert.equal(proxy.get(), 0);
            const watched = new Promise((resolve) => proxy.watch((val) => resolve(val)));
            proxy.set(1);
            assert.equal(await watched, 1);
            assert.equal(proxy.get(), 1);
        });
        it("set and watch nested property", async () => {
            const proxy = ReactiveProxy.from({ a: 1, b: 2 });
            assert.equal(proxy.get()?.a, 1);
            assert.equal(proxy.get()?.b, 2);
            let ops = 0;
            proxy.watch(() => ops++);
            await proxy.set({ a: 1, b: 3 });
            assert.ok(ops > 0);
            assert.equal(proxy.get()?.b, 3);
        });
        it("unwatch a property", async () => {
            const proxy = ReactiveProxy.from(0);
            let ops = 0;
            const listener = () => ops++;
            proxy.watch(listener);
            await proxy.set(1);
            assert.ok(ops > 0);
            ops = 0;
            proxy.unwatch(listener);
            await proxy.set(2);
            assert.equal(ops, 0);
        });
        it("manually trigger listeners", async () => {
            const arr = [1, 2, 3];
            let join = arr.join(",");
            const proxy = ReactiveProxy.from(arr);
            proxy.watch(async (val) => {
                await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
                join = val.join(",");
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
            let value = proxy.get();
            proxy.watch(async (val) => {
                await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
                value = val;
            });
            const promise = proxy.set(1);
            assert.equal(value, 0);
            await promise;
            assert.equal(value, 1);
        });
        it("does not proxify a promise", () => {
            const promise = Promise.resolve(0);
            const proxy = ReactiveProxy.from(promise);
            assert.equal(proxy.get(), promise);
        });
    });
    describe("InertProxy", () => {
        it("watch is ignored", async () => {
            const proxy = InertProxy.from(0);
            proxy.watch(() => assert.fail());
            proxy.listeners.length = 0;
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
            assert.equal(store.get("b")?.c, 2);
        });
        it("watch nested property", async () => {
            const store = new ReactiveProxyStore({ x: { a: 1, b: 2 } });
            assert.equal(store.get("x")?.a, 1);
            assert.equal(store.get("x")?.b, 2);
            let ops = 0;
            store.watch(["x"], () => ops++);
            ops = 0;
            await store.set("x", { a: 1, b: 3 });
            assert.equal(ops, 1);
            assert.equal(store.get("x")?.b, 3);
            ops = 0;
            store.get("x").b = 2;
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(ops, 1);
            assert.equal(store.get("x")?.b, 2);
        });
        it("unwatch a property", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            let ops = 0;
            const listener = () => ops++;
            store.watch(["a"], listener);
            await store.set("a", 2);
            assert.equal(ops, 1);
            ops = 0;
            store.unwatch(["a"], listener);
            await store.set("a", 3);
            assert.equal(ops, 0);
        });
        it("manually trigger listeners", async () => {
            const arr = [1, 2, 3];
            let join = arr.join(",");
            const store = new ReactiveProxyStore({ arr: arr });
            store.watch(["arr"], async (val) => {
                await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
                join = val.join(",");
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
            let value = store.get("b");
            store.watch(["b"], async (val) => {
                await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
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
        it("trace a single property (direct access)", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            store.get("b");
            const [result, keys] = await store.trace(function () {
                return this.a;
            });
            store.get("b");
            assert.equal(result, 1);
            assert.deepEqual(keys, ["a"]);
        });
        it("trace a single property (using getter)", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            store.get("b");
            const [result, keys] = await store.trace(function () {
                return this.get("a");
            });
            store.get("b");
            assert.equal(result, 1);
            assert.deepEqual(keys, ["a"]);
        });
        it("trace a single property fails with arrow functions", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            const [result, keys] = await store.trace(() => store.get("a"));
            assert.equal(result, 1);
            assert.deepEqual(keys, []);
        });
        it("trace multiple properties", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            const [result, keys] = await store.trace(function () {
                return this.get("a") + this.get("b");
            });
            assert.equal(result, 3);
            assert.deepEqual(keys, ["a", "b"]);
        });
        it("trace async function", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            const [result, keys] = await store.trace(async function () {
                return this.get("a") + this.get("b");
            });
            assert.equal(result, 3);
            assert.deepEqual(keys, ["a", "b"]);
        });
        it("trace function that throws", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            await assert.rejects(async () => {
                await store.trace(function () {
                    this.get("a") + this.get("b");
                    throw new Error();
                });
            });
        });
        it("trace function with short-circuit behavior", async () => {
            const store = new ReactiveProxyStore({ a: true, b: false });
            const [result, keys] = await store.trace(function () {
                return this.get("a") || this.get("b");
            });
            assert.equal(result, true);
            assert.deepEqual(keys, ["a"]);
        });
        it("automatically updates computed properties", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            await store.computed("sum", function () {
                return this.get("a") + this.get("b");
            });
            assert.equal(store.get("sum"), 3);
            await store.set("b", 3);
            assert.equal(store.get("sum"), 4);
        });
        it("computed callback can use `this` to reference store", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            await store.computed("sum", function () {
                return this.a + this.b;
            });
            assert.equal(store.get("sum"), 3);
            await store.set("b", 3);
            assert.equal(store.get("sum"), 4);
        });
        it("property of type function automatically binds to `this`", () => {
            const store = new ReactiveProxyStore({
                a: 1,
                b: 2,
                fn: function () {
                    return this.a + this.b;
                },
            });
            assert.equal(store.get("fn")(), 3);
        });
        it("references proxy via $", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            store.$.a++;
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            assert.equal(store.$.a, 2);
            assert.equal(store.get("a"), 2);
        });
        it("adds new properties via $", async () => {
            const store = new ReactiveProxyStore({ a: 1 });
            store.$.b = 2;
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            assert.equal(store.$.b, 2);
            assert.equal(store.get("b"), 2);
        });
        it("calls methods via $", async () => {
            const { $ } = new ReactiveProxyStore();
            await $.set("a", 1);
            assert.equal($.a, 1);
        });
        it("sets a debouncer for property watches", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            let ops = 0;
            store.watch(["a"], () => ops++);
            store.set("a", 2);
            store.set("a", 3);
            store.set("a", 4);
            assert.equal(ops, 0);
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS / 2));
            assert.equal(ops, 0);
            await store.set("a", 5);
            assert.equal(ops, 1);
        });
        it("debounces arbitrary functions", async () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            let ops = 0;
            const millis = 50;
            store.debounce(millis, () => ops++);
            assert.equal(ops, 0);
            await new Promise((resolve) => setTimeout(resolve, millis / 2));
            assert.equal(ops, 0);
            await new Promise((resolve) => setTimeout(resolve, millis / 2));
            assert.equal(ops, 1);
        });
    });
    describe("proxify", () => {
        it("creates a proxy for ReactiveProxyStore", () => {
            const store = new ReactiveProxyStore({ a: 1, b: 2 });
            const proxy = proxifyStore(store);
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
            const obj = { a: 1, b: 2 };
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
            const obj = { a: 1, b: 2 };
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
            const obj = { a: 1, b: 2 };
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
            const obj = { x: { a: 1, b: 2 } };
            const proxy = proxifyObject(obj, () => ops++, true);
            assert.equal(ops, 0);
            ops = 0;
            proxy.x.a++;
            assert.ok(ops > 0);
            assert.deepEqual(obj, { x: { a: 2, b: 2 } });
        });
        it("does not proxify existing properties when deep = false", () => {
            let ops = 0;
            const obj = { x: { a: 1, b: 2 } };
            const proxy = proxifyObject(obj, () => ops++, false);
            assert.equal(ops, 0);
            ops = 0;
            proxy.x.a++;
            assert.equal(ops, 0);
            assert.deepEqual(obj, { x: { a: 2, b: 2 } });
        });
    });
});
