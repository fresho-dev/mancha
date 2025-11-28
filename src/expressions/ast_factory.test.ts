import { assert } from "../test_utils.js";
import { DefaultAstFactory } from './ast_factory.js';
import * as AST from './ast.js';

describe("DefaultAstFactory", () => {
  let factory: DefaultAstFactory;

  beforeEach(() => {
    factory = new DefaultAstFactory();
  });

  it("should create Literal nodes", () => {
    const node = factory.literal(123);
    assert.deepEqual(node, { type: 'Literal', value: 123 });
  });

  it("should create ID nodes", () => {
    const node = factory.id('myVar');
    assert.deepEqual(node, { type: 'ID', value: 'myVar' });
  });

  it("should create Unary nodes", () => {
    const child = factory.id('x');
    const node = factory.unary('-', child);
    assert.deepEqual(node, { type: 'Unary', operator: '-', child });
  });

  it("should create Binary nodes", () => {
    const left = factory.id('x');
    const right = factory.id('y');
    const node = factory.binary(left, '+', right);
    assert.deepEqual(node, { type: 'Binary', operator: '+', left, right });
  });

  it("should create Getter nodes", () => {
    const receiver = factory.id('obj');
    const node = factory.getter(receiver, 'prop', true);
    assert.deepEqual(node, { type: 'Getter', receiver, name: 'prop', optional: true });
  });

  it("should create Invoke nodes", () => {
    const receiver = factory.id('fn');
    const arg = factory.literal(1);
    const node = factory.invoke(receiver, 'callMe', [arg], true);
    assert.deepEqual(node, { type: 'Invoke', receiver, method: 'callMe', arguments: [arg], optional: true });
  });

  it("should create Index nodes", () => {
    const receiver = factory.id('arr');
    const argument = factory.literal(0);
    const node = factory.index(receiver, argument, true);
    assert.deepEqual(node, { type: 'Index', receiver, argument, optional: true });
  });

  it("should create Ternary nodes", () => {
    const condition = factory.id('x');
    const trueExpr = factory.literal(1);
    const falseExpr = factory.literal(0);
    const node = factory.ternary(condition, trueExpr, falseExpr);
    assert.deepEqual(node, { type: 'Ternary', condition, trueExpr, falseExpr });
  });

  it("should create Map nodes", () => {
    const prop1 = factory.property('a', factory.literal(1));
    const prop2 = factory.spreadProperty(factory.id('obj'));
    const node = factory.map([prop1, prop2]);
    assert.deepEqual(node, { type: 'Map', properties: [prop1, prop2] });
  });

  it("should create List nodes", () => {
    const item1 = factory.literal(1);
    const item2 = factory.spreadElement(factory.id('arr'));
    const node = factory.list([item1, item2]);
    assert.deepEqual(node, { type: 'List', items: [item1, item2] });
  });

  it("should create ArrowFunction nodes", () => {
    const body = factory.binary(factory.id('x'), '+', factory.id('y'));
    const node = factory.arrowFunction(['x', 'y'], body);
    assert.deepEqual(node, { type: 'ArrowFunction', params: ['x', 'y'], body });
  });

  it("should create SpreadProperty nodes", () => {
    const expr = factory.id('obj');
    const node = factory.spreadProperty(expr);
    assert.deepEqual(node, { type: 'SpreadProperty', expression: expr });
  });

  it("should create SpreadElement nodes", () => {
    const expr = factory.id('arr');
    const node = factory.spreadElement(expr);
    assert.deepEqual(node, { type: 'SpreadElement', expression: expr });
  });

  it("should create Property nodes", () => {
    const value = factory.literal(1);
    const node = factory.property('key', value);
    assert.deepEqual(node, { type: 'Property', key: 'key', value });
  });

  it("should create Empty node", () => {
    const node = factory.empty();
    assert.deepEqual(node, { type: 'Empty' });
  });
});
