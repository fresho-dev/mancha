/*
 * @license
 * Portions Copyright (c) 2013, the Dart project authors.
 */

import type { Expression, ID, Invoke } from "./ast.js";
import type { AstFactory } from "./ast_factory.js";
import { BINARY_OPERATORS, KEYWORDS, POSTFIX_PRECEDENCE, UNARY_OPERATORS } from "./constants.js";
import { Kind, type Token, Tokenizer } from "./tokenizer.js";

export const parse = <E extends Expression>(
	expr: string,
	astFactory: AstFactory<E>,
): E | undefined => new Parser<E>(expr, astFactory).parse();

export class Parser<N extends Expression> {
	private _kind?: Kind;
	private _tokenizer: Tokenizer;
	private _ast: AstFactory<N>;
	private _token?: Token;
	private _value?: string;

	constructor(input: string, astFactory: AstFactory<N>) {
		this._tokenizer = new Tokenizer(input);
		this._ast = astFactory;
	}

	parse(): N | undefined {
		this._advance();
		const result = this._parseExpression();
		// Ensure all input was consumed.
		if (this._token) {
			throw new Error(`Unexpected token: ${this._token.value}`);
		}
		return result;
	}

	private _advance(kind?: Kind, value?: string) {
		if (!this._matches(kind, value)) {
			throw new Error(
				`Expected kind ${kind} (${value}), was ${this._token?.kind} (${this._token?.value})`,
			);
		}
		const t = this._tokenizer.nextToken();
		this._token = t;
		this._kind = t?.kind;
		this._value = t?.value;
	}

	_matches(kind?: Kind, value?: string) {
		return !((kind && this._kind !== kind) || (value && this._value !== value));
	}

	private _parseExpression(): N | undefined {
		if (!this._token) return this._ast.empty();
		const expr = this._parseUnary();
		return expr === undefined ? undefined : this._parsePrecedence(expr, 0);
	}

	// _parsePrecedence and _parseBinary implement the precedence climbing
	// algorithm as described in:
	// http://en.wikipedia.org/wiki/Operator-precedence_parser#Precedence_climbing_method
	private _parsePrecedence(left: N | undefined, precedence: number) {
		if (left === undefined) {
			throw new Error("Expected left to be defined.");
		}
		while (this._token) {
			if (this._matches(Kind.GROUPER, "(")) {
				const args = this._parseArguments();
				left = this._ast.invoke(left, undefined, args);
			} else if (this._matches(Kind.GROUPER, "[")) {
				const indexExpr = this._parseIndex();
				left = this._ast.index(left, indexExpr);
			} else if (this._matches(Kind.DOT) || this._matches(Kind.OPTIONAL_DOT)) {
				const optional = this._kind === Kind.OPTIONAL_DOT;
				this._advance();
				if (optional && this._matches(Kind.GROUPER, "[")) {
					const indexExpr = this._parseIndex();
					left = this._ast.index(left, indexExpr, true);
				} else if (optional && this._matches(Kind.GROUPER, "(")) {
					const args = this._parseArguments();
					left = this._ast.invoke(left, undefined, args, true);
				} else {
					const right = this._parseUnary();
					left = this._makeInvokeOrGetter(left, right, optional);
				}
			} else if (this._matches(Kind.KEYWORD)) {
				break;
			} else if (this._matches(Kind.OPERATOR) && this._token.precedence >= precedence) {
				left =
					this._value === "?" ? this._parseTernary(left) : this._parseBinary(left, this._token);
			} else {
				break;
			}
		}
		return left;
	}

	private _makeInvokeOrGetter(left: N, right: N | undefined, optional?: boolean) {
		if (right === undefined) {
			throw new Error("expected identifier");
		}
		if (right.type === "ID") {
			return this._ast.getter(left, (right as ID).value, optional);
		} else if (right.type === "Invoke" && (right as Invoke).receiver.type === "ID") {
			const method = (right as Invoke).receiver as ID;
			// biome-ignore lint/suspicious/noExplicitAny: arguments array type is complex
			return this._ast.invoke(left, method.value, (right as Invoke).arguments as any, optional);
		} else {
			throw new Error(`expected identifier: ${right}`);
		}
	}

	private _parseBinary(left: N, op: Token) {
		if (!BINARY_OPERATORS.has(op.value)) {
			throw new Error(`unknown operator: ${op.value}`);
		}
		this._advance();
		let right = this._parseUnary();
		while (
			(this._kind === Kind.OPERATOR || this._kind === Kind.DOT || this._kind === Kind.GROUPER) &&
			this._token &&
			(this._token.precedence ?? 0) > op.precedence
		) {
			right = this._parsePrecedence(right, this._token?.precedence ?? 0);
		}
		if (right === undefined) {
			throw new Error(`Expected expression after ${op.value}`);
		}
		return this._ast.binary(left, op.value, right);
	}

	private _parseUnary(): N | undefined {
		// Handle keyword-based unary operators like 'typeof'.
		if (this._matches(Kind.KEYWORD, "typeof")) {
			this._advance();
			const expr = this._parsePrecedence(this._parsePrimary(), POSTFIX_PRECEDENCE);
			return this._ast.unary("typeof", expr);
		}
		if (this._matches(Kind.OPERATOR)) {
			const value = this._value;
			this._advance();
			// Handle unary + and - on numbers as part of the literal, not as a
			// unary operator.
			if (value === "+" || value === "-") {
				if (this._matches(Kind.INTEGER)) {
					return this._parseInteger(value);
				} else if (this._matches(Kind.DECIMAL)) {
					return this._parseDecimal(value);
				}
			}
			if (!value || !UNARY_OPERATORS.has(value)) throw new Error(`unexpected token: ${value}`);
			const expr = this._parsePrecedence(this._parsePrimary(), POSTFIX_PRECEDENCE);
			return this._ast.unary(value, expr);
		}
		return this._parsePrimary();
	}

	private _parseTernary(condition: N) {
		this._advance(Kind.OPERATOR, "?");
		const trueExpr = this._parseExpression();
		this._advance(Kind.COLON);
		const falseExpr = this._parseExpression();
		return this._ast.ternary(condition, trueExpr, falseExpr);
	}

	private _parsePrimary() {
		switch (this._kind) {
			case Kind.KEYWORD: {
				const keyword = this._value ?? "";
				if (keyword === "this") {
					this._advance();
					// TODO(justin): return keyword node
					return this._ast.id(keyword);
				} else if (KEYWORDS.has(keyword)) {
					throw new Error(`unexpected keyword: ${keyword}`);
				}
				throw new Error(`unrecognized keyword: ${keyword}`);
			}
			case Kind.IDENTIFIER:
				return this._parseInvokeOrIdentifier();
			case Kind.STRING:
				return this._parseString();
			case Kind.INTEGER:
				return this._parseInteger();
			case Kind.DECIMAL:
				return this._parseDecimal();
			case Kind.GROUPER:
				if (this._value === "(") {
					return this._parseParenOrFunction();
				} else if (this._value === "{") {
					return this._parseMap();
				} else if (this._value === "[") {
					return this._parseList();
				}
				return undefined;
			case Kind.COLON:
				throw new Error('unexpected token ":"');
			default:
				return undefined;
		}
	}

	private _parseList() {
		const items: (N | undefined)[] = [];
		do {
			this._advance();
			if (this._matches(Kind.GROUPER, "]")) break;
			if (this._matches(Kind.SPREAD)) {
				this._advance();
				const expr = this._parseExpression();
				if (expr) {
					items.push(this._ast.spreadElement(expr));
				}
			} else {
				items.push(this._parseExpression());
			}
		} while (this._matches(Kind.COMMA));
		this._advance(Kind.GROUPER, "]");
		return this._ast.list(items);
	}

	private _parseMap() {
		const properties: (N | undefined)[] = [];
		do {
			this._advance();
			if (this._matches(Kind.GROUPER, "}")) break;

			if (this._matches(Kind.SPREAD)) {
				this._advance();
				const expr = this._parseExpression();
				if (expr) {
					properties.push(this._ast.spreadProperty(expr));
				}
			} else {
				const key = this._value ?? "";
				if (this._matches(Kind.STRING) || this._matches(Kind.IDENTIFIER)) {
					this._advance();
				}
				if (this._matches(Kind.COLON)) {
					this._advance(Kind.COLON);
					const value = this._parseExpression();
					if (value) {
						properties.push(this._ast.property(key, value));
					}
				} else {
					// Shorthand property
					properties.push(this._ast.property(key, this._ast.id(key)));
				}
			}
		} while (this._matches(Kind.COMMA));
		this._advance(Kind.GROUPER, "}");
		// biome-ignore lint/suspicious/noExplicitAny: properties array type is complex
		return this._ast.map(properties as any);
	}

	private _parseInvokeOrIdentifier() {
		const value = this._value;
		if (value === "true") {
			this._advance();
			return this._ast.literal(true);
		}
		if (value === "false") {
			this._advance();
			return this._ast.literal(false);
		}
		if (value === "null") {
			this._advance();
			return this._ast.literal(null);
		}
		if (value === "undefined") {
			this._advance();
			return this._ast.literal(undefined);
		}
		const identifier = this._parseIdentifier();
		const args = this._parseArguments();
		return !args ? identifier : this._ast.invoke(identifier, undefined, args);
	}

	private _parseIdentifier() {
		if (!this._matches(Kind.IDENTIFIER)) {
			throw new Error(`expected identifier: ${this._value}`);
		}
		const value = this._value;
		this._advance();
		return this._ast.id(value ?? "");
	}

	private _parseArguments() {
		if (!this._matches(Kind.GROUPER, "(")) {
			return undefined;
		}
		const args: Array<N | undefined> = [];
		do {
			this._advance();
			if (this._matches(Kind.GROUPER, ")")) {
				break;
			}
			if (this._matches(Kind.SPREAD)) {
				this._advance();
				const expr = this._parseExpression();
				if (expr) {
					args.push(this._ast.spreadElement(expr));
				}
			} else {
				const expr = this._parseExpression();
				args.push(expr);
			}
		} while (this._matches(Kind.COMMA));
		this._advance(Kind.GROUPER, ")");
		return args;
	}

	private _parseIndex() {
		// console.assert(this._matches(Kind.GROUPER, '['));
		this._advance();
		const expr = this._parseExpression();
		this._advance(Kind.GROUPER, "]");
		return expr;
	}

	private _parseParenOrFunction() {
		const expressions = this._parseArguments();
		if (this._matches(Kind.ARROW)) {
			this._advance();
			const body = this._parseExpression();
			const params = expressions?.map((e) => (e as ID).value) ?? [];
			return this._ast.arrowFunction(params, body);
		} else {
			return this._ast.paren(expressions?.[0]);
		}
	}

	private _parseString() {
		const value = this._ast.literal(this._value ?? "");
		this._advance();
		return value;
	}

	private _parseInteger(prefix: string = "") {
		const value = this._ast.literal(parseInt(`${prefix}${this._value}`, 10));
		this._advance();
		return value;
	}

	private _parseDecimal(prefix: string = "") {
		const value = this._ast.literal(parseFloat(`${prefix}${this._value}`));
		this._advance();
		return value;
	}
}
