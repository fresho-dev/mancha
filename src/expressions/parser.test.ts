import { assert } from "../test_utils.js";
import { parse } from './parser.js';
import { DefaultAstFactory } from './ast_factory.js';

describe("Parser", () => {
  const factory = new DefaultAstFactory();
  const parseExpr = (expr: string) => parse(expr, factory);

  it("should parse literals", () => {
    assert.deepEqual(parseExpr("123"), factory.literal(123));
    assert.deepEqual(parseExpr("'hello'"), factory.literal("hello"));
    assert.deepEqual(parseExpr("true"), factory.literal(true));
    assert.deepEqual(parseExpr("false"), factory.literal(false));
    assert.deepEqual(parseExpr("null"), factory.literal(null));
    assert.deepEqual(parseExpr("undefined"), factory.literal(undefined));
  });

  it("should parse identifiers", () => {
    assert.deepEqual(parseExpr("foo"), factory.id("foo"));
  });

  it("should parse unary expressions", () => {
    assert.deepEqual(parseExpr("-x"), factory.unary("-", factory.id("x")));
    assert.deepEqual(parseExpr("!x"), factory.unary("!", factory.id("x")));
  });

  it("should parse binary expressions", () => {
    assert.deepEqual(parseExpr("1 + 2"), factory.binary(factory.literal(1), "+", factory.literal(2)));
    assert.deepEqual(parseExpr("x * y"), factory.binary(factory.id("x"), "*", factory.id("y")));
  });

  it("should respect precedence", () => {
    assert.deepEqual(
      parseExpr("1 + 2 * 3"),
      factory.binary(factory.literal(1), "+", factory.binary(factory.literal(2), "*", factory.literal(3)))
    );
    assert.deepEqual(
      parseExpr("(1 + 2) * 3"),
      factory.binary(factory.paren(factory.binary(factory.literal(1), "+", factory.literal(2))), "*", factory.literal(3))
    );
  });

  it("should parse ternary expressions", () => {
    assert.deepEqual(
      parseExpr("a ? b : c"),
      factory.ternary(factory.id("a"), factory.id("b"), factory.id("c"))
    );
  });

  it("should parse property access", () => {
    assert.deepEqual(parseExpr("obj.prop"), factory.getter(factory.id("obj"), "prop", false));
  });

  it("should parse method invocation", () => {
    assert.deepEqual(parseExpr("obj.method()"), factory.invoke(factory.id("obj"), "method", [], false));
    assert.deepEqual(
      parseExpr("obj.method(1, 2)"),
      factory.invoke(factory.id("obj"), "method", [factory.literal(1), factory.literal(2)], false)
    );
  });

  it("should parse function invocation", () => {
    assert.deepEqual(parseExpr("func()"), factory.invoke(factory.id("func"), undefined, []));
    assert.deepEqual(
      parseExpr("func(1, 2)"),
      factory.invoke(factory.id("func"), undefined, [factory.literal(1), factory.literal(2)])
    );
  });

  it("should parse index access", () => {
    assert.deepEqual(parseExpr("arr[0]"), factory.index(factory.id("arr"), factory.literal(0)));
  });

  it("should parse optional chaining", () => {
    assert.deepEqual(parseExpr("obj?.prop"), factory.getter(factory.id("obj"), "prop", true));
    assert.deepEqual(parseExpr("obj?.method()"), factory.invoke(factory.id("obj"), "method", [], true));
    assert.deepEqual(parseExpr("func?.()"), factory.invoke(factory.id("func"), undefined, [], true));
    assert.deepEqual(parseExpr("arr?.[0]"), factory.index(factory.id("arr"), factory.literal(0), true));
  });

  it("should parse array literals", () => {
    assert.deepEqual(parseExpr("[]"), factory.list([]));
    assert.deepEqual(parseExpr("[1, 2]"), factory.list([factory.literal(1), factory.literal(2)]));
  });

  it("should parse object literals", () => {
    assert.deepEqual(parseExpr("{}"), factory.map([]));
    assert.deepEqual(
      parseExpr("{a: 1, b: 2}"),
      factory.map([
        factory.property("a", factory.literal(1)),
        factory.property("b", factory.literal(2)),
      ])
    );
  });

  it("should parse spread operator in array", () => {
    assert.deepEqual(
      parseExpr("[...arr]"),
      factory.list([factory.spreadElement(factory.id("arr"))])
    );
    assert.deepEqual(
      parseExpr("[1, ...arr, 2]"),
      factory.list([
        factory.literal(1),
        factory.spreadElement(factory.id("arr")),
        factory.literal(2),
      ])
    );
  });

  it("should parse spread operator in object", () => {
    assert.deepEqual(
      parseExpr("{...obj}"),
      factory.map([factory.spreadProperty(factory.id("obj"))])
    );
    assert.deepEqual(
      parseExpr("{a: 1, ...obj, b: 2}"),
      factory.map([
        factory.property("a", factory.literal(1)),
        factory.spreadProperty(factory.id("obj")),
        factory.property("b", factory.literal(2)),
      ])
    );
  });

  it("should parse spread operator in function arguments", () => {
    assert.deepEqual(
      parseExpr("func(...args)"),
      factory.invoke(factory.id("func"), undefined, [factory.spreadElement(factory.id("args"))])
    );
  });

  it("should parse arrow functions", () => {
    assert.deepEqual(
      parseExpr("() => 1"),
      factory.arrowFunction([], factory.literal(1))
    );
    assert.deepEqual(
      parseExpr("(x) => x + 1"),
      factory.arrowFunction(["x"], factory.binary(factory.id("x"), "+", factory.literal(1)))
    );
    assert.deepEqual(
      parseExpr("(x, y) => x + y"),
      factory.arrowFunction(["x", "y"], factory.binary(factory.id("x"), "+", factory.id("y")))
    );
  });

  it("should throw on invalid syntax", () => {
    assert.throws(() => parseExpr("1 +"), "Expected expression after +");
  });
});
