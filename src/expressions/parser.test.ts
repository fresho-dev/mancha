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

  it("should parse object literals with shorthand properties", () => {
    assert.deepEqual(
      parseExpr("{obj}"),
      factory.map([factory.property("obj", factory.id("obj"))])
    );
    assert.deepEqual(
      parseExpr("{a, b}"),
      factory.map([
        factory.property("a", factory.id("a")),
        factory.property("b", factory.id("b")),
      ])
    );
  });

  it("should parse object literals with mixed shorthand and full properties", () => {
    assert.deepEqual(
      parseExpr("{a: 1, b, c: 2}"),
      factory.map([
        factory.property("a", factory.literal(1)),
        factory.property("b", factory.id("b")),
        factory.property("c", factory.literal(2)),
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

  it("should parse typeof expressions", () => {
    assert.deepEqual(
      parseExpr("typeof x"),
      factory.unary("typeof", factory.id("x"))
    );
    assert.deepEqual(
      parseExpr("typeof x === 'string'"),
      factory.binary(
        factory.unary("typeof", factory.id("x")),
        "===",
        factory.literal("string")
      )
    );
  });

  it("should throw on invalid syntax", () => {
    assert.throws(() => parseExpr("1 +"), "Expected expression after +");
  });

  it("should throw on unconsumed tokens", () => {
    // Parser must consume all input or throw an error.
    assert.throws(() => parseExpr("1 2"));
    assert.throws(() => parseExpr("x y"));
  });

  it("should not parse arrow functions with unparenthesized single parameter", () => {
    // Parser requires parentheses around arrow function parameters.
    assert.throws(() => parseExpr("x => x + 1"));
  });

  describe("'in' operator", () => {
    it("should parse simple 'in' expression", () => {
      assert.deepEqual(
        parseExpr("'name' in obj"),
        factory.binary(factory.literal("name"), "in", factory.id("obj"))
      );
    });

    it("should parse 'in' with identifier on left side", () => {
      assert.deepEqual(
        parseExpr("key in obj"),
        factory.binary(factory.id("key"), "in", factory.id("obj"))
      );
    });

    it("should parse 'in' with number on left side", () => {
      assert.deepEqual(
        parseExpr("0 in arr"),
        factory.binary(factory.literal(0), "in", factory.id("arr"))
      );
    });

    it("should parse 'in' with correct precedence vs comparison operators", () => {
      // 'in' has the same precedence as relational operators (< > <= >=)
      assert.deepEqual(
        parseExpr("'a' in obj === true"),
        factory.binary(
          factory.binary(factory.literal("a"), "in", factory.id("obj")),
          "===",
          factory.literal(true)
        )
      );
    });

    it("should parse 'in' with correct precedence vs logical operators", () => {
      assert.deepEqual(
        parseExpr("'a' in obj && 'b' in obj"),
        factory.binary(
          factory.binary(factory.literal("a"), "in", factory.id("obj")),
          "&&",
          factory.binary(factory.literal("b"), "in", factory.id("obj"))
        )
      );
    });

    it("should parse 'in' in ternary expression", () => {
      assert.deepEqual(
        parseExpr("'a' in obj ? 1 : 0"),
        factory.ternary(
          factory.binary(factory.literal("a"), "in", factory.id("obj")),
          factory.literal(1),
          factory.literal(0)
        )
      );
    });

    it("should parse 'in' with property access on right side", () => {
      assert.deepEqual(
        parseExpr("'key' in obj.nested"),
        factory.binary(
          factory.literal("key"),
          "in",
          factory.getter(factory.id("obj"), "nested", false)
        )
      );
    });

    it("should parse 'in' with parenthesized expressions", () => {
      assert.deepEqual(
        parseExpr("('key') in (obj)"),
        factory.binary(
          factory.paren(factory.literal("key")),
          "in",
          factory.paren(factory.id("obj"))
        )
      );
    });
  });
});
