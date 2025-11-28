import { assert } from "../test_utils.js";
import {
  KEYWORDS,
  UNARY_OPERATORS,
  BINARY_OPERATORS,
  PRECEDENCE,
  POSTFIX_PRECEDENCE,
} from './constants.js';

describe("Expression Constants", () => {
  it("should define KEYWORDS correctly", () => {
    assert.deepEqual(KEYWORDS, ['this', 'typeof']);
  });

  it("should define UNARY_OPERATORS correctly", () => {
    assert.deepEqual(UNARY_OPERATORS, ['+', '-', '!', 'typeof']);
  });

  it("should define BINARY_OPERATORS correctly", () => {
    assert.deepEqual(BINARY_OPERATORS, [
      '=',
      '+',
      '-',
      '*',
      '/',
      '%',
      '^',
      '==',
      '!=',
      '>',
      '<',
      '>=',
      '<=',
      '||',
      '&&',
      '??',
      '&',
      '===',
      '!==',
      '|',
    ]);
  });

  it("should define PRECEDENCE correctly", () => {
    const expectedPrecedence: Record<string, number> = {
      '!': 0,
      ':': 0,
      ',': 0,
      ')': 0,
      ']': 0,
      '}': 0,

      '?': 2,
      '??': 3,
      '||': 4,
      '&&': 5,
      '|': 6,
      '^': 7,
      '&': 8,

      // equality
      '!=': 9,
      '==': 9,
      '!==': 9,
      '===': 9,

      // relational
      '>=': 10,
      '>': 10,
      '<=': 10,
      '<': 10,

      // additive
      '+': 11,
      '-': 11,

      // multiplicative
      '%': 12,
      '/': 12,
      '*': 12,

      // postfix
      '(': 13,
      '[': 13,
      '.': 13,
      '?.': 13,
      '{': 13,
    };
    assert.deepEqual(PRECEDENCE, expectedPrecedence);
  });

  it("should define POSTFIX_PRECEDENCE correctly", () => {
    assert.equal(POSTFIX_PRECEDENCE, 13);
  });
});
