import { assert } from "../test_utils.js";
import { EvalAstFactory, Expression } from "./eval.js";
import * as AST from "./ast.js";

describe("Evaluator", () => {
	const factory = new EvalAstFactory();
	const evalNode = (node: Expression, scope: any = {}) => node.evaluate(scope);

	it("should evaluate literals", () => {
		assert.equal(evalNode(factory.literal(123)), 123);
		assert.equal(evalNode(factory.literal("hello")), "hello");
		assert.equal(evalNode(factory.literal(true)), true);
		assert.equal(evalNode(factory.literal(null)), null);
		assert.equal(evalNode(factory.literal(undefined)), undefined);
	});

	it("should evaluate identifiers", () => {
		assert.equal(evalNode(factory.id("x"), { x: 42 }), 42);
		assert.equal(evalNode(factory.id("y"), { x: 42 }), undefined);
	});

	it("should evaluate unary expressions", () => {
		assert.equal(evalNode(factory.unary("-", factory.literal(5))), -5);
		assert.equal(evalNode(factory.unary("!", factory.literal(true))), false);
	});

	it("should evaluate binary expressions", () => {
		assert.equal(evalNode(factory.binary(factory.literal(1), "+", factory.literal(2))), 3);
		assert.equal(evalNode(factory.binary(factory.literal(5), "*", factory.literal(2))), 10);
		assert.equal(
			evalNode(factory.binary(factory.literal(true), "&&", factory.literal(false))),
			false,
		);
	});

	it("should evaluate property access", () => {
		const scope = { obj: { prop: "val" } };
		assert.equal(evalNode(factory.getter(factory.id("obj"), "prop"), scope), "val");
	});

	it("should evaluate optional property access", () => {
		const scope = { obj: null };
		assert.equal(evalNode(factory.getter(factory.id("obj"), "prop", true), scope), undefined);
	});

	it("should evaluate method invocation", () => {
		const scope = {
			obj: {
				method: (a: number) => a * 2,
			},
		};
		assert.equal(
			evalNode(factory.invoke(factory.id("obj"), "method", [factory.literal(21)]), scope),
			42,
		);
	});

	it("should evaluate optional method invocation", () => {
		const scope = { obj: null };
		assert.equal(evalNode(factory.invoke(factory.id("obj"), "method", [], true), scope), undefined);
	});

	it("should evaluate function invocation", () => {
		const scope = { func: (a: number) => a + 1 };
		assert.equal(
			evalNode(factory.invoke(factory.id("func"), undefined, [factory.literal(1)]), scope),
			2,
		);
	});

	it("should evaluate index access", () => {
		const scope = { arr: [1, 2, 3] };
		assert.equal(evalNode(factory.index(factory.id("arr"), factory.literal(1)), scope), 2);
	});

	it("should evaluate optional index access", () => {
		const scope = { arr: null };
		assert.equal(
			evalNode(factory.index(factory.id("arr"), factory.literal(0), true), scope),
			undefined,
		);
	});

	it("should evaluate ternary", () => {
		assert.equal(
			evalNode(factory.ternary(factory.literal(true), factory.literal(1), factory.literal(0))),
			1,
		);
		assert.equal(
			evalNode(factory.ternary(factory.literal(false), factory.literal(1), factory.literal(0))),
			0,
		);
	});

	it("should evaluate list", () => {
		assert.deepEqual(evalNode(factory.list([factory.literal(1), factory.literal(2)])), [1, 2]);
	});

	it("should evaluate list with spread", () => {
		const scope = { arr: [2, 3] };
		const node = factory.list([
			factory.literal(1),
			factory.spreadElement(factory.id("arr")),
			factory.literal(4),
		]);
		assert.deepEqual(evalNode(node, scope), [1, 2, 3, 4]);
	});

	it("should evaluate map", () => {
		const node = factory.map([
			factory.property("a", factory.literal(1)),
			factory.property("b", factory.literal(2)),
		]);
		assert.deepEqual(evalNode(node), { a: 1, b: 2 });
	});

	it("should evaluate map with spread", () => {
		const scope = { obj: { b: 2, c: 3 } };
		const node = factory.map([
			factory.property("a", factory.literal(1)),
			factory.spreadProperty(factory.id("obj")),
			factory.property("d", factory.literal(4)),
		]);
		assert.deepEqual(evalNode(node, scope), { a: 1, b: 2, c: 3, d: 4 });
	});

	it("should evaluate arrow function", () => {
		const node = factory.arrowFunction(
			["x"],
			factory.binary(factory.id("x"), "+", factory.literal(1)),
		);
		const fn = evalNode(node) as Function;
		assert.equal(fn(1), 2);
	});

	it("should evaluate invocation with spread arguments", () => {
		const scope = {
			func: (...args: number[]) => args.reduce((a, b) => a + b, 0),
			arr: [1, 2, 3],
		};
		const node = factory.invoke(factory.id("func"), undefined, [
			factory.spreadElement(factory.id("arr")),
			factory.literal(4),
		]);
		assert.equal(evalNode(node, scope), 10);
	});

	describe("'in' operator", () => {
		it("should return true when property exists in object", () => {
			const node = factory.binary(factory.literal("name"), "in", factory.id("obj"));
			assert.equal(evalNode(node, { obj: { name: "test" } }), true);
		});

		it("should return false when property does not exist in object", () => {
			const node = factory.binary(factory.literal("missing"), "in", factory.id("obj"));
			assert.equal(evalNode(node, { obj: { name: "test" } }), false);
		});

		it("should work with inherited properties", () => {
			const parent = { inherited: true };
			const child = Object.create(parent);
			child.own = true;
			const node = factory.binary(factory.literal("inherited"), "in", factory.id("obj"));
			assert.equal(evalNode(node, { obj: child }), true);
		});

		it("should work with array indices", () => {
			const nodeTrue = factory.binary(factory.literal(0), "in", factory.id("arr"));
			const nodeFalse = factory.binary(factory.literal(10), "in", factory.id("arr"));
			assert.equal(evalNode(nodeTrue, { arr: [1, 2, 3] }), true);
			assert.equal(evalNode(nodeFalse, { arr: [1, 2, 3] }), false);
		});

		it("should work with string indices", () => {
			const node = factory.binary(factory.literal("0"), "in", factory.id("arr"));
			assert.equal(evalNode(node, { arr: ["a", "b"] }), true);
		});

		it("should work with computed property names", () => {
			const node = factory.binary(factory.id("key"), "in", factory.id("obj"));
			assert.equal(evalNode(node, { key: "name", obj: { name: "test" } }), true);
			assert.equal(evalNode(node, { key: "missing", obj: { name: "test" } }), false);
		});

		it("should return false for null and undefined objects", () => {
			const node = factory.binary(factory.literal("key"), "in", factory.id("obj"));
			assert.throws(() => evalNode(node, { obj: null }));
			assert.throws(() => evalNode(node, { obj: undefined }));
		});
	});
});
