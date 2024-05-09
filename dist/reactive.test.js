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
const reactive_1 = require("./reactive");
describe("Mancha reactive module", () => {
    describe("ReactiveProxy", () => {
        it("get, set and watch", () => __awaiter(void 0, void 0, void 0, function* () {
            const proxy = reactive_1.ReactiveProxy.from(0);
            assert.equal(proxy.get(), 0);
            const watched = new Promise((resolve) => proxy.watch((val) => resolve(val)));
            proxy.set(1);
            assert.equal(yield watched, 1);
            assert.equal(proxy.get(), 1);
        }));
        it("set and watch nested property", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const proxy = reactive_1.ReactiveProxy.from({ a: 1, b: 2 });
            assert.equal((_a = proxy.get()) === null || _a === void 0 ? void 0 : _a.a, 1);
            assert.equal((_b = proxy.get()) === null || _b === void 0 ? void 0 : _b.b, 2);
            let ops = 0;
            proxy.watch(() => ops++);
            yield proxy.set({ a: 1, b: 3 });
            assert.ok(ops > 0);
            assert.equal((_c = proxy.get()) === null || _c === void 0 ? void 0 : _c.b, 3);
        }));
        it("manually trigger listeners", () => __awaiter(void 0, void 0, void 0, function* () {
            const arr = [1, 2, 3];
            let join = arr.join(",");
            const proxy = reactive_1.ReactiveProxy.from(arr);
            proxy.watch((val) => __awaiter(void 0, void 0, void 0, function* () {
                yield new Promise((resolve) => setTimeout(resolve, 10));
                join = val.join(",");
            }));
            arr.push(4);
            assert.equal(join, "1,2,3");
            const promise = proxy.trigger();
            assert.equal(join, "1,2,3");
            yield promise;
            assert.equal(join, "1,2,3,4");
        }));
        it("calling set awaits listeners", () => __awaiter(void 0, void 0, void 0, function* () {
            const proxy = reactive_1.ReactiveProxy.from(0);
            let value = proxy.get();
            proxy.watch((val) => __awaiter(void 0, void 0, void 0, function* () {
                yield new Promise((resolve) => setTimeout(resolve, 10));
                value = val;
            }));
            const promise = proxy.set(1);
            assert.equal(value, 0);
            yield promise;
            assert.equal(value, 1);
        }));
    });
    describe("InertProxy", () => {
        it("watch is ignored", () => __awaiter(void 0, void 0, void 0, function* () {
            const proxy = reactive_1.InertProxy.from(0);
            proxy.watch(() => assert.fail());
            proxy.listeners.length = 0;
        }));
        it("trigger is ignored", () => __awaiter(void 0, void 0, void 0, function* () {
            const proxy = reactive_1.InertProxy.from(0);
            proxy.watch(() => assert.fail());
            yield proxy.trigger();
        }));
        it("get, set and watch", () => __awaiter(void 0, void 0, void 0, function* () {
            const proxy = reactive_1.InertProxy.from(0);
            let ops = 0;
            proxy.watch(() => ops++);
            assert.equal(ops, 0);
            yield proxy.set(1);
            assert.equal(ops, 0);
        }));
    });
    describe("ReactiveProxyStore", () => {
        it("get, set and watch", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            assert.equal(store.get("a"), 1);
            assert.equal(store.get("b"), 2);
            const watched = new Promise((resolve) => store.watch(["b"], (b) => resolve(b)));
            store.set("b", 3);
            assert.equal(yield watched, 3);
            assert.equal(store.get("b"), 3);
        }));
        it("set a value with a ReactiveProxy instance", () => {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            const proxy = reactive_1.ReactiveProxy.from(3);
            store.set("c", proxy);
            assert.equal(store.get("c"), proxy.get());
        });
        it("get nested property", () => {
            var _a;
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: { c: 2 } });
            assert.equal(store.get("a"), 1);
            assert.equal((_a = store.get("b")) === null || _a === void 0 ? void 0 : _a.c, 2);
        });
        it("watch nested property", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const store = new reactive_1.ReactiveProxyStore({ x: { a: 1, b: 2 } });
            assert.equal((_a = store.get("x")) === null || _a === void 0 ? void 0 : _a.a, 1);
            assert.equal((_b = store.get("x")) === null || _b === void 0 ? void 0 : _b.b, 2);
            let ops = 0;
            store.watch(["x"], () => ops++);
            ops = 0;
            yield store.set("x", { a: 1, b: 3 });
            assert.ok(ops > 0);
            assert.equal((_c = store.get("x")) === null || _c === void 0 ? void 0 : _c.b, 3);
            ops = 0;
            store.get("x").b = 2;
            yield new Promise((resolve) => setTimeout(resolve, 10));
            assert.ok(ops > 0);
            assert.equal((_d = store.get("x")) === null || _d === void 0 ? void 0 : _d.b, 2);
        }));
        it("manually trigger listeners", () => __awaiter(void 0, void 0, void 0, function* () {
            const arr = [1, 2, 3];
            let join = arr.join(",");
            const store = new reactive_1.ReactiveProxyStore({ arr: arr });
            store.watch(["arr"], (val) => __awaiter(void 0, void 0, void 0, function* () {
                yield new Promise((resolve) => setTimeout(resolve, 10));
                join = val.join(",");
            }));
            arr.push(4);
            assert.equal(join, "1,2,3");
            const promise = store.trigger(["arr"]);
            assert.equal(join, "1,2,3");
            yield promise;
            assert.equal(join, "1,2,3,4");
        }));
        it("calling set awaits listeners", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            let value = store.get("b");
            store.watch(["b"], (val) => __awaiter(void 0, void 0, void 0, function* () {
                yield new Promise((resolve) => setTimeout(resolve, 100));
                value = val;
            }));
            const promise = store.set("b", 3);
            assert.equal(value, 2);
            yield promise;
            assert.equal(value, 3);
        }));
        it("entries() returns the ReactiveProxy instances", () => {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            const entries = Array.from(store.entries());
            assert.equal(entries.length, 2);
            assert.equal(entries[0][1] instanceof reactive_1.ReactiveProxy, true);
            assert.equal(entries[1][1] instanceof reactive_1.ReactiveProxy, true);
        });
        it("can be cloned from entries", () => {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            const clone = new reactive_1.ReactiveProxyStore(Object.fromEntries(store.entries()));
            assert.deepEqual(Array.from(clone.entries()), Array.from(store.entries()));
        });
        it("trace a single property", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            store.get("b");
            const [result, keys] = yield store.trace(() => store.get("a"));
            store.get("b");
            assert.equal(result, 1);
            assert.deepEqual(keys, ["a"]);
        }));
        it("trace multiple properties", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            const [result, keys] = yield store.trace(() => store.get("a") + store.get("b"));
            assert.equal(result, 3);
            assert.deepEqual(keys, ["a", "b"]);
        }));
        it("trace async function", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            const [result, keys] = yield store.trace(() => __awaiter(void 0, void 0, void 0, function* () { return store.get("a") + store.get("b"); }));
            assert.equal(result, 3);
            assert.deepEqual(keys, ["a", "b"]);
        }));
        it("trace function that throws", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            assert.rejects(() => __awaiter(void 0, void 0, void 0, function* () {
                yield store.trace(() => {
                    store.get("a") + store.get("b");
                    throw new Error();
                });
            }));
        }));
        it("automatically updates computed properties", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            yield store.computed("sum", () => store.get("a") + store.get("b"));
            assert.equal(store.get("sum"), 3);
            store.set("b", 3);
            yield new Promise((resolve) => setTimeout(resolve, 1));
            assert.equal(store.get("sum"), 4);
        }));
        it("computed callback can use `this` to reference store", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            yield store.computed("sum", function () {
                return this.a + this.b;
            });
            assert.equal(store.get("sum"), 3);
            store.set("b", 3);
            yield new Promise((resolve) => setTimeout(resolve, 1));
            assert.equal(store.get("sum"), 4);
        }));
        it("property of type function automatically binds to `this`", () => {
            const store = new reactive_1.ReactiveProxyStore({
                a: 1,
                b: 2,
                fn: function () {
                    return this.a + this.b;
                },
            });
            assert.equal(store.get("fn")(), 3);
        });
    });
    describe("proxify", () => {
        it("creates a proxy for ReactiveProxyStore", () => {
            const store = new reactive_1.ReactiveProxyStore({ a: 1, b: 2 });
            const proxy = (0, reactive_1.proxify)(store);
            assert.equal(proxy.a, 1);
            assert.equal(proxy.b, 2);
            proxy.a++;
            assert.equal(proxy.a, 2);
            assert.equal(store.get("a"), 2);
        });
        it("creates a proxy for array", () => {
            let ops = 0;
            const arr = [1, 2, 3];
            const proxy = (0, reactive_1.proxifyObject)(arr, () => ops++);
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
            const proxy = (0, reactive_1.proxifyObject)(obj, () => ops++);
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
            const proxy = (0, reactive_1.proxifyObject)(obj, () => ops++, true);
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
            const proxy = (0, reactive_1.proxifyObject)(obj, () => ops++, false);
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
            const proxy = (0, reactive_1.proxifyObject)(obj, () => ops++, true);
            assert.equal(ops, 0);
            ops = 0;
            proxy.x.a++;
            assert.ok(ops > 0);
            assert.deepEqual(obj, { x: { a: 2, b: 2 } });
        });
        it("does not proxify existing properties when deep = false", () => {
            let ops = 0;
            const obj = { x: { a: 1, b: 2 } };
            const proxy = (0, reactive_1.proxifyObject)(obj, () => ops++, false);
            assert.equal(ops, 0);
            ops = 0;
            proxy.x.a++;
            assert.equal(ops, 0);
            assert.deepEqual(obj, { x: { a: 2, b: 2 } });
        });
    });
});
