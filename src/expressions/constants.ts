/*
 * @license
 * Portions Copyright (c) 2013, the Dart project authors.
 */

export const KEYWORDS = new Set(['this', 'typeof']);

// Word-based operators (alphabetic tokens that are operators, not keywords)
export const WORD_OPERATORS = new Set(['in']);
export const UNARY_OPERATORS = new Set(['+', '-', '!', 'typeof']);
export const BINARY_OPERATORS = new Set([
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
  'in',
]);

export const PRECEDENCE: Record<string, number> = {
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
  'in': 10,

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
  '{': 13, // not sure this is correct
};

export const POSTFIX_PRECEDENCE = 13;
