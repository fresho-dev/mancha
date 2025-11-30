# Expressions Module

This module provides a JavaScript expression parser and evaluator for the mancha templating system.

## Origin

This code is derived from [jexpr](https://github.com/justinfagnani/jexpr), which was itself a fork of a component from the [Dart project](https://github.com/niclasl/jexpr). The original implementation was a JavaScript port of Dart's expression parser.

See the [LICENSE](./LICENSE) file for licensing information (BSD 3-Clause License).

## Purpose

The expressions module parses and evaluates a safe subset of JavaScript expressions. It is used by mancha to evaluate template bindings like `{{ user.name }}`, `:text="count + 1"`, and `:for="item in items"`.

Key features:
- Parses expressions into an Abstract Syntax Tree (AST)
- Evaluates expressions against a scope object
- Supports optional chaining (`?.`)
- Supports arrow functions (`(x) => x + 1`)
- Supports spread operator (`...arr`)
- Does **not** support statements, only expressions

## Supported Syntax

### Keywords

| Keyword  | Description |
|----------|-------------|
| `this`   | Reference to the current scope |
| `typeof` | Unary operator returning the type of an operand |

### Literals

| Literal     | Example |
|-------------|---------|
| `true`      | Boolean true |
| `false`     | Boolean false |
| `null`      | Null value |
| `undefined` | Undefined value |
| Numbers     | `42`, `3.14`, `-5` |
| Strings     | `'hello'`, `"world"` |
| Arrays      | `[1, 2, 3]` |
| Objects     | `{a: 1, b: 2}` |

### Unary Operators

| Operator | Description |
|----------|-------------|
| `+`      | Unary plus |
| `-`      | Unary minus (negation) |
| `!`      | Logical NOT |
| `typeof` | Type of operand |

### Binary Operators

Operators are listed in order of precedence (lowest to highest):

| Precedence | Operators | Description |
|------------|-----------|-------------|
| 2          | `?`       | Ternary conditional |
| 3          | `??`      | Nullish coalescing |
| 4          | `\|\|`    | Logical OR |
| 5          | `&&`      | Logical AND |
| 6          | `\|`      | Pipe (function application) |
| 7          | `^`       | Bitwise XOR |
| 8          | `&`       | Bitwise AND |
| 9          | `==` `!=` `===` `!==` | Equality |
| 10         | `>` `<` `>=` `<=` `in` | Relational |
| 11         | `+` `-`   | Additive |
| 12         | `*` `/` `%` | Multiplicative |
| 13         | `.` `?.` `()` `[]` | Member access, call, index |

### Special Syntax

| Syntax | Example | Description |
|--------|---------|-------------|
| Property access | `obj.prop` | Access object property |
| Optional chaining | `obj?.prop` | Safe property access (returns undefined if null/undefined) |
| Method call | `obj.method()` | Call object method |
| Optional call | `obj?.method()` | Safe method call |
| Index access | `arr[0]` | Access array/object by index |
| Optional index | `arr?.[0]` | Safe index access |
| Function call | `fn(arg)` | Call a function |
| Arrow function | `(x) => x + 1` | Anonymous function |
| Spread | `[...arr]`, `{...obj}`, `fn(...args)` | Spread elements |
| Ternary | `a ? b : c` | Conditional expression |
| Assignment | `x = 5` | Assignment (within expressions) |

## Architecture

The module consists of these components:

| File | Description |
|------|-------------|
| `tokenizer.ts` | Lexer that converts input string into tokens |
| `parser.ts` | Parser that builds an AST from tokens |
| `ast.ts` | AST node type definitions |
| `ast_factory.ts` | Factory for creating AST nodes |
| `eval.ts` | Evaluator that executes AST against a scope |
| `constants.ts` | Operator and keyword definitions |
| `index.ts` | Public API exports |

## Usage

```typescript
import { parse } from './expressions/parser.js';
import { DefaultAstFactory } from './expressions/ast_factory.js';
import { EvalAstFactory } from './expressions/eval.js';

// Parse and evaluate an expression
const factory = new EvalAstFactory();
const ast = parse('user.name', factory);
const result = ast.evaluate({ user: { name: 'Alice' } });
// result: 'Alice'
```
