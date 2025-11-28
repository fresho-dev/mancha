import { assert } from "../test_utils.js";
import * as AST from './ast.js';

describe("AST Node Interfaces", () => {
  it("should define Literal node correctly", () => {
    const node: AST.Literal = { type: 'Literal', value: 123 };
    assert.equal(node.type, 'Literal');
    assert.equal(node.value, 123);
  });

  it("should define ID node correctly", () => {
    const node: AST.ID = { type: 'ID', value: 'myVar' };
    assert.equal(node.type, 'ID');
    assert.equal(node.value, 'myVar');
  });

  it("should define Unary node correctly", () => {
    const node: AST.Unary = { type: 'Unary', operator: '-', child: { type: 'ID', value: 'x' } };
    assert.equal(node.type, 'Unary');
    assert.equal(node.operator, '-');
    assert.equal((node.child as AST.ID).value, 'x');
  });

  it("should define Binary node correctly", () => {
    const node: AST.Binary = {
      type: 'Binary',
      operator: '+',
      left: { type: 'ID', value: 'x' },
      right: { type: 'ID', value: 'y' },
    };
    assert.equal(node.type, 'Binary');
    assert.equal(node.operator, '+');
    assert.equal((node.left as AST.ID).value, 'x');
    assert.equal((node.right as AST.ID).value, 'y');
  });

  it("should define Getter node correctly", () => {
    const node: AST.Getter = { type: 'Getter', receiver: { type: 'ID', value: 'obj' }, name: 'prop', optional: true };
    assert.equal(node.type, 'Getter');
    assert.equal((node.receiver as AST.ID).value, 'obj');
    assert.equal(node.name, 'prop');
    assert.equal(node.optional, true);
  });

  it("should define Invoke node correctly", () => {
    const node: AST.Invoke = {
      type: 'Invoke',
      receiver: { type: 'ID', value: 'fn' },
      method: 'callMe',
      arguments: [{ type: 'Literal', value: 1 }],
      optional: true,
    };
    assert.equal(node.type, 'Invoke');
    assert.equal((node.receiver as AST.ID).value, 'fn');
    assert.equal(node.method, 'callMe');
    assert.equal((node.arguments![0] as AST.Literal).value, 1);
    assert.equal(node.optional, true);
  });

  it("should define Index node correctly", () => {
    const node: AST.Index = { type: 'Index', receiver: { type: 'ID', value: 'arr' }, argument: { type: 'Literal', value: 0 }, optional: true };
    assert.equal(node.type, 'Index');
    assert.equal((node.receiver as AST.ID).value, 'arr');
    assert.equal((node.argument as AST.Literal).value, 0);
    assert.equal(node.optional, true);
  });

  it("should define Ternary node correctly", () => {
    const node: AST.Ternary = {
      type: 'Ternary',
      condition: { type: 'ID', value: 'x' },
      trueExpr: { type: 'Literal', value: 1 },
      falseExpr: { type: 'Literal', value: 0 },
    };
    assert.equal(node.type, 'Ternary');
    assert.equal((node.condition as AST.ID).value, 'x');
  });

  it("should define Map node correctly", () => {
    const node: AST.Map = {
      type: 'Map',
      properties: [
        { type: 'Property', key: 'a', value: { type: 'Literal', value: 1 } },
        { type: 'SpreadProperty', expression: { type: 'ID', value: 'obj' } },
      ],
    };
    assert.equal(node.type, 'Map');
    assert.equal(node.properties?.length, 2);
    assert.equal(node.properties![0].type, 'Property');
    assert.equal(node.properties![1].type, 'SpreadProperty');
  });

  it("should define List node correctly", () => {
    const node: AST.List = {
      type: 'List',
      items: [
        { type: 'Literal', value: 1 },
        { type: 'SpreadElement', expression: { type: 'ID', value: 'arr' } },
      ],
    };
    assert.equal(node.type, 'List');
    assert.equal(node.items?.length, 2);
    assert.equal(node.items![0]?.type, 'Literal');
    assert.equal(node.items![1]?.type, 'SpreadElement');
  });

  it("should define ArrowFunction node correctly", () => {
    const node: AST.ArrowFunction = {
      type: 'ArrowFunction',
      params: ['x', 'y'],
      body: { type: 'Binary', operator: '+', left: { type: 'ID', value: 'x' }, right: { type: 'ID', value: 'y' } },
    };
    assert.equal(node.type, 'ArrowFunction');
    assert.deepEqual(node.params, ['x', 'y']);
    assert.equal(node.body.type, 'Binary');
  });

  it("should define SpreadProperty node correctly", () => {
    const node: AST.SpreadProperty = { type: 'SpreadProperty', expression: { type: 'ID', value: 'obj' } };
    assert.equal(node.type, 'SpreadProperty');
    assert.equal((node.expression as AST.ID).value, 'obj');
  });

  it("should define SpreadElement node correctly", () => {
    const node: AST.SpreadElement = { type: 'SpreadElement', expression: { type: 'ID', value: 'arr' } };
    assert.equal(node.type, 'SpreadElement');
    assert.equal((node.expression as AST.ID).value, 'arr');
  });

  it("should define Property node correctly", () => {
    const node: AST.Property = { type: 'Property', key: 'key', value: { type: 'Literal', value: 1 } };
    assert.equal(node.type, 'Property');
    assert.equal(node.key, 'key');
    assert.equal((node.value as AST.Literal).value, 1);
  });
});
