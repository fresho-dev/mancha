import { SignalStore } from "./store.js";
import { assert, sleepForReactivity } from "./test_utils.js";

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
			// Child inherits `a` from parent via $parent chain. Type includes inherited property.
			const child = new SignalStore<{ a: number }>({ $parent: parent } as unknown as { a: number });
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

		it("sets proxified ancestor value", async () => {
			const parent = new SignalStore({ a: 1 });
			// Child inherits `a` from parent via $parent chain. Type includes inherited property.
			const child = new SignalStore<{ a: number }>({ $parent: parent } as unknown as { a: number });
			child.$.a = 2;
			const value1 = child.get("a");
			const value2 = parent.get("a");
			assert.equal(value1, 2);
			assert.equal(value2, 2);
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
				error.message,
			);
		});
	});

	describe("eval", () => {
		describe("basics", () => {
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
				(globalThis as unknown as Record<string, unknown>).foo = "bar";
				const result = store.eval("foo");
				assert.equal(result, "bar");
				delete (globalThis as unknown as Record<string, unknown>).foo;
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
		});

		describe("reactivity", () => {
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
				// const { $ } = store;
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
		});

		describe("optional chaining", () => {
			it("optional property access", async () => {
				const store = new SignalStore({ a: { b: 1 }, c: null });
				assert.equal(store.eval("a?.b"), 1);
				assert.equal(store.eval("c?.b"), undefined);
				assert.equal(store.eval("d?.b"), undefined);
			});

			it("optional method call", async () => {
				const store = new SignalStore({
					a: { fn: () => 1 },
					b: null,
				});
				assert.equal(store.eval("a.fn?.()"), 1);
				assert.equal(store.eval("b?.fn()"), undefined);
				assert.equal(store.eval("a?.fn()"), 1);
				assert.equal(store.eval("a.missing?.()"), undefined);
			});

			it("optional call", async () => {
				const store = new SignalStore({ fn: () => 1 });
				assert.equal(store.eval("fn?.()"), 1);
				assert.equal(store.eval("missing?.()"), undefined);
			});

			it("optional index", async () => {
				const store = new SignalStore({ a: [1, 2], b: null });
				assert.equal(store.eval("a?.[0]"), 1);
				assert.equal(store.eval("b?.[0]"), undefined);
			});
		});

		describe("arrow functions", () => {
			it("simple arrow function", async () => {
				const store = new SignalStore();
				const result = store.eval("((x) => x + 1)(1)");
				assert.equal(result, 2);
			});

			it("arrow function with multiple params", async () => {
				const store = new SignalStore();
				const result = store.eval("((x, y) => x + y)(1, 2)");
				assert.equal(result, 3);
			});

			it("arrow function used in map", async () => {
				const store = new SignalStore({ items: [1, 2, 3] });
				const result = store.eval("items.map((x) => x * 2)");
				assert.deepEqual(result, [2, 4, 6]);
			});

			it("arrow function with scope access", async () => {
				const store = new SignalStore({ factor: 3 });
				const result = store.eval("((x) => x * factor)(2)");
				assert.equal(result, 6);
			});

			it("should return null for arrow function without parentheses", () => {
				const store = new SignalStore();
				// Unparenthesized arrow function parameters are not supported.
				// store.eval logs the error and returns null on parse failure.
				const result = store.eval("((x => x + 1))(1)");
				assert.equal(result, null);
			});
		});

		describe("spread operator", () => {
			describe("Array Literals", () => {
				it("should spread an array into another array", () => {
					const store = new SignalStore({ arr: [1, 2, 3] });
					const result = store.eval("[0, ...arr, 4]");
					assert.deepEqual(result, [0, 1, 2, 3, 4]);
				});

				it("should spread multiple arrays", () => {
					const store = new SignalStore({ arr1: [1, 2], arr2: [3, 4] });
					const result = store.eval("[...arr1, ...arr2]");
					assert.deepEqual(result, [1, 2, 3, 4]);
				});

				it("should handle empty array spread", () => {
					const store = new SignalStore({ arr: [] });
					const result = store.eval("[1, ...arr, 2]");
					assert.deepEqual(result, [1, 2]);
				});
			});

			describe("Object Literals", () => {
				it("should spread an object into another object", () => {
					const store = new SignalStore({ obj: { a: 1, b: 2 } });
					const result = store.eval("{ ...obj, c: 3 }");
					assert.deepEqual(result, { a: 1, b: 2, c: 3 });
				});

				it("should override properties", () => {
					const store = new SignalStore({ obj: { a: 1, b: 2 } });
					const result = store.eval("{ ...obj, b: 3 }");
					assert.deepEqual(result, { a: 1, b: 3 });
				});

				it("should spread multiple objects", () => {
					const store = new SignalStore({ obj1: { a: 1 }, obj2: { b: 2 } });
					const result = store.eval("{ ...obj1, ...obj2 }");
					assert.deepEqual(result, { a: 1, b: 2 });
				});
			});

			describe("Function Arguments", () => {
				it("should spread arguments to a function call", () => {
					const store = new SignalStore({
						args: [1, 2],
						fn: (a: number, b: number) => a + b,
					});
					const result = store.eval("fn(...args)");
					assert.equal(result, 3);
				});

				it("should mix spread and positional arguments", () => {
					const store = new SignalStore({
						args: [2, 3],
						fn: (a: number, b: number, c: number, d: number) => a + b + c + d,
					});
					const result = store.eval("fn(1, ...args, 4)");
					assert.equal(result, 10);
				});
			});
		});

		describe("assignment", () => {
			it("simple assignment", async () => {
				const store = new SignalStore({ a: 1 });
				store.eval("a = 2");
				assert.equal(store.get("a"), 2);
			});

			it("assignment with spaces around =", async () => {
				const store = new SignalStore({ a: 1 });
				store.eval("a = 2");
				assert.equal(store.get("a"), 2);
			});

			it("assignment in complex expression", async () => {
				const store = new SignalStore({ a: 1, b: 2 });
				store.eval("a = b + 1");
				assert.equal(store.get("a"), 3);
			});

			it("assign to new variable (in store)", async () => {
				const store = new SignalStore({});
				store.eval("a = 1");
				assert.equal(store.get("a"), 1);
			});

			it("local scope assignment", async () => {
				const store = new SignalStore({ a: 1 });
				const _result = store.eval("a = x", { x: 2 });
				assert.equal(store.get("a"), 2);
			});

			it("modifies variables", async () => {
				const object = { a: 1 };
				const fn = "a = a + 1";
				const store = new SignalStore(object);
				const result = store.eval(fn);
				assert.equal(result, 2);
				assert.equal(store.get("a"), 2);
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
				assert.equal(result, 1);
				assert.deepEqual(store.get("x"), { a: 1 });
				await sleepForReactivity();
				assert.equal(notified, 2);
			});

			it("allows semicolons in string literals", async () => {
				const store = new SignalStore({ a: "initial" });
				store.eval("a = 'foo;bar'");
				assert.equal(store.get("a"), "foo;bar");
			});

			it("fails on multiple statements (semicolon separator)", async () => {
				const store = new SignalStore({ a: 1, b: 2 });
				// This should fail to parse and return null (and log an error)
				// The tokenizer throws "Expected end of input" or similar because ';' is not a token
				const result = store.eval("a = 10; b = 20");
				assert.equal(result, null);
				assert.equal(store.get("a"), 1); // Should not have changed
				assert.equal(store.get("b"), 2); // Should not have changed
			});
		});
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
			let receivedOptions: unknown = null;
			const fn = (options: unknown) => {
				receivedOptions = options;
				return Promise.resolve("done");
			};

			store.$resolve(fn, { path: { id: "123" }, query: { limit: 10 } });
			await new Promise((resolve) => setTimeout(resolve, 20));

			assert.deepEqual(receivedOptions, { path: { id: "123" }, query: { limit: 10 } });
		});

		it("works without options", async () => {
			const store = new SignalStore();
			let receivedOptions: unknown = "not-called";
			const fn = (options?: unknown) => {
				receivedOptions = options;
				return Promise.resolve("done");
			};

			store.$resolve(fn);
			await new Promise((resolve) => setTimeout(resolve, 20));

			assert.equal(receivedOptions, undefined);
		});

		it("resolves with complex object result", async () => {
			const store = new SignalStore();
			const data = {
				users: [
					{ id: 1, name: "Alice" },
					{ id: 2, name: "Bob" },
				],
			};
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
				getUser: (options?: { path: { id: string } }): Promise<User> => {
					return Promise.resolve({ id: options?.path.id ?? "", name: "Test User" });
				},
				listUsers: (options?: { query?: { limit?: number } }): Promise<User[]> => {
					const limit = options?.query?.limit ?? 10;
					return Promise.resolve(
						Array.from({ length: limit }, (_, i) => ({ id: String(i), name: `User ${i}` })),
					);
				},
				deleteUser: (_options?: { path: { id: string } }): Promise<{ success: boolean }> => {
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
			// biome-ignore lint/suspicious/noExplicitAny: testing throw behavior
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

	describe("wrapped object reactivity", () => {
		it("does not trigger observer when setting same primitive value on nested object", async () => {
			const store = new SignalStore({ obj: { count: 0 } });
			let observerCalls = 0;

			store.effect(function () {
				this.obj.count;
				observerCalls++;
			});

			// Initial call during effect setup.
			assert.equal(observerCalls, 1);

			// Setting the same value should NOT trigger the observer.
			store.$.obj.count = 0;
			await sleepForReactivity();
			assert.equal(observerCalls, 1, "Observer should not trigger when setting same value");
		});

		it("does not trigger observer when clearing an already empty array", async () => {
			const store = new SignalStore({ items: [] as number[] });
			let observerCalls = 0;

			store.effect(function () {
				this.items.length;
				observerCalls++;
			});

			// Initial call during effect setup.
			assert.equal(observerCalls, 1);

			// Clearing an already empty array should NOT trigger the observer.
			store.$.items.length = 0;
			await sleepForReactivity();
			assert.equal(observerCalls, 1, "Observer should not trigger when array is already empty");
		});

		it("still triggers observer when value actually changes", async () => {
			const store = new SignalStore({ obj: { count: 0 } });
			let observerCalls = 0;

			store.effect(function () {
				this.obj.count;
				observerCalls++;
			});

			assert.equal(observerCalls, 1);

			// Setting a different value SHOULD trigger the observer.
			store.$.obj.count = 1;
			await sleepForReactivity();
			assert.equal(observerCalls, 2, "Observer should trigger when value changes");
		});
	});

	describe("typed store", () => {
		it("provides typed access via $ proxy", () => {
			// Create a store with a specific type.
			interface MyState {
				count: number;
				name: string;
				items: string[];
			}

			const store = new SignalStore<MyState>({ count: 0, name: "test", items: ["a", "b"] });

			// Access values via $ proxy - these should be typed.
			const count: number = store.$.count;
			const name: string = store.$.name;
			const items: string[] = store.$.items;

			assert.equal(count, 0);
			assert.equal(name, "test");
			assert.deepEqual(items, ["a", "b"]);
		});

		it("allows assignment via typed $ proxy", async () => {
			interface MyState {
				value: number;
			}

			const store = new SignalStore<MyState>({ value: 1 });
			assert.equal(store.$.value, 1);

			store.$.value = 42;
			await sleepForReactivity();
			assert.equal(store.$.value, 42);
		});

		it("works with nested objects", () => {
			interface MyState {
				user: {
					id: number;
					profile: {
						name: string;
					};
				};
			}

			const store = new SignalStore<MyState>({
				user: { id: 1, profile: { name: "Alice" } },
			});

			const userId: number = store.$.user.id;
			const userName: string = store.$.user.profile.name;

			assert.equal(userId, 1);
			assert.equal(userName, "Alice");
		});

		it("allows untyped store with default parameter", () => {
			// Default store behavior (no type parameter).
			const store = new SignalStore({ foo: "bar", count: 42 });

			// Should still work as before.
			assert.equal(store.$.foo, "bar");
			assert.equal(store.$.count, 42);
		});

		it("effect callback can access typed values", () => {
			interface MyState {
				x: number;
				y: number;
			}

			const store = new SignalStore<MyState>({ x: 1, y: 2 });
			let sum = 0;

			store.effect(function () {
				sum = this.x + this.y;
			});

			assert.equal(sum, 3);
		});
	});

	describe("undefined variable auto-initialization", () => {
		it("initializes undefined variables to undefined during effect", async () => {
			const store = new SignalStore({ existing: 1 });
			let accessed: unknown = "not-accessed";

			store.effect(function () {
				accessed = this.nonExistent;
			});

			// The variable should be initialized to undefined, not null.
			assert.equal(accessed, undefined);
			assert.ok(store.has("nonExistent"));
			assert.equal(store.get("nonExistent"), undefined);
		});

		it("attaches observer to auto-initialized variables", async () => {
			const store = new SignalStore({});
			let value: unknown = "initial";
			let callCount = 0;

			store.effect(function () {
				value = this.laterDefined;
				callCount++;
			});

			// Initial call during effect setup.
			assert.equal(callCount, 1);
			assert.equal(value, undefined);

			// Setting the variable should trigger the observer.
			await store.set("laterDefined", "hello");
			assert.equal(callCount, 2);
			assert.equal(value, "hello");
		});

		it("does not auto-initialize variables when not observing", () => {
			const store = new SignalStore<{ nonExistent?: unknown }>({});

			// Access via $ proxy without effect should not auto-initialize.
			const value = store.$.nonExistent;

			// Without an observer, accessing should return undefined but not add to store.
			assert.equal(value, undefined);
			assert.ok(!store.has("nonExistent"));
		});

		it("works with render callback pattern", async () => {
			const store = new SignalStore({ items: [1, 2, 3] });
			const results: unknown[] = [];
			let renderCount = 0;

			// Simulate a :render callback that uses a variable not defined in :data.
			store.effect(function () {
				renderCount++;
				// This variable is expected to be set by :render callback.
				results.push(this.renderOutput);
			});

			assert.equal(renderCount, 1);
			assert.deepEqual(results, [undefined]);

			// Simulate the :render callback setting the variable.
			await store.set("renderOutput", "rendered content");
			assert.equal(renderCount, 2);
			assert.deepEqual(results, [undefined, "rendered content"]);
		});

		it("allows setting undefined explicitly", async () => {
			const store = new SignalStore({});
			await store.set("explicit", undefined);

			assert.ok(store.has("explicit"));
			assert.equal(store.get("explicit"), undefined);
		});

		it("triggers observer when changing from undefined to a value", async () => {
			const store = new SignalStore({});
			let observerCalls = 0;

			store.effect(function () {
				this.dynamicVar;
				observerCalls++;
			});

			// Initial call.
			assert.equal(observerCalls, 1);

			// Change from undefined to a value.
			await store.set("dynamicVar", "value1");
			assert.equal(observerCalls, 2);
			assert.equal(store.get("dynamicVar"), "value1");

			// Change again.
			await store.set("dynamicVar", "value2");
			assert.equal(observerCalls, 3);
			assert.equal(store.get("dynamicVar"), "value2");
		});

		it("works with eval expressions referencing undefined variables", async () => {
			const store = new SignalStore({});
			let result: unknown = "initial";

			store.effect(function () {
				result = this.eval("futureVar");
			});

			// Initially undefined.
			assert.equal(result, undefined);

			// Set the variable and verify reactivity.
			await store.set("futureVar", 42);
			assert.equal(result, 42);
		});

		it("auto-initializes multiple undefined variables in same effect", async () => {
			const store = new SignalStore({});
			let a: unknown, b: unknown, c: unknown;
			let callCount = 0;

			store.effect(function () {
				a = this.varA;
				b = this.varB;
				c = this.varC;
				callCount++;
			});

			assert.equal(callCount, 1);
			assert.equal(a, undefined);
			assert.equal(b, undefined);
			assert.equal(c, undefined);
			assert.ok(store.has("varA"));
			assert.ok(store.has("varB"));
			assert.ok(store.has("varC"));

			// Setting any of them should trigger the effect.
			await store.set("varB", "B");
			assert.equal(callCount, 2);
			assert.equal(b, "B");
		});

		it("does not interfere with existing store methods", () => {
			const store = new SignalStore({});

			// Accessing store methods during effect should not auto-initialize them.
			let evalResult: unknown;
			store.effect(function () {
				evalResult = this.eval("1 + 1");
				this.get("someKey");
				this.has("anotherKey");
			});

			// Methods should work normally.
			assert.equal(evalResult, 2);

			// Method names should not be added to store.
			assert.ok(!store.has("eval"));
			assert.ok(!store.has("get"));
			assert.ok(!store.has("has"));
		});

		it("differentiates undefined from null", async () => {
			const store = new SignalStore({ nullVar: null });
			let value: unknown = "initial";

			store.effect(function () {
				value = this.undefinedVar;
			});

			// Auto-initialized variables should be undefined, not null.
			assert.equal(value, undefined);
			assert.notEqual(value, null);

			// Null variables should remain null.
			assert.equal(store.get("nullVar"), null);
		});
	});
});
