/*
 * @license
 * Portions Copyright (c) 2013, the Dart project authors.
 */

import type * as ast from "./ast.js";
import type { AstFactory } from "./ast_factory.js";

type BinaryOp = (a: unknown, b: unknown) => unknown;
const _BINARY_OPERATORS: Record<string, BinaryOp> = {
	"+": (a, b) => (a as number) + (b as number),
	"-": (a, b) => (a as number) - (b as number),
	"*": (a, b) => (a as number) * (b as number),
	"/": (a, b) => (a as number) / (b as number),
	"%": (a, b) => (a as number) % (b as number),
	// biome-ignore lint/suspicious/noDoubleEquals: must be loose equality
	"==": (a, b) => a == b,
	// biome-ignore lint/suspicious/noDoubleEquals: must be loose equality
	"!=": (a, b) => a != b,
	"===": (a, b) => a === b,
	"!==": (a, b) => a !== b,
	">": (a, b) => (a as number) > (b as number),
	">=": (a, b) => (a as number) >= (b as number),
	"<": (a, b) => (a as number) < (b as number),
	"<=": (a, b) => (a as number) <= (b as number),
	"||": (a, b) => a || b,
	"&&": (a, b) => a && b,
	"??": (a, b) => a ?? b,
	"|": (a, f) => (f as (x: unknown) => unknown)(a),
	in: (a, b) => (a as PropertyKey) in (b as object),
};

type UnaryOp = (a: unknown) => unknown;
const _UNARY_OPERATORS: Record<string, UnaryOp> = {
	"+": (a) => a,
	"-": (a) => -(a as number),
	"!": (a) => !a,
	typeof: (a) => typeof a,
};

export interface Scope {
	[key: string]: unknown;
}

export interface Evaluatable {
	evaluate(scope: Scope): unknown;
	getIds(idents: string[]): string[];
}

export type Expression =
	| Literal
	| Empty
	| ID
	| Unary
	| Binary
	| Getter
	| Invoke
	| Index
	| Ternary
	| Map
	| List
	| ArrowFunction
	| SpreadProperty
	| SpreadElement
	| Property;

export interface Literal extends Evaluatable {
	type: "Literal";
	value: ast.LiteralValue;
}
export interface Empty extends Evaluatable {
	type: "Empty";
}
export interface ID extends Evaluatable {
	type: "ID";
	value: string;
}
export interface Unary extends Evaluatable {
	type: "Unary";
	operator: string;
	child: Expression;
}
export interface Binary extends Evaluatable {
	type: "Binary";
	operator: string;
	left: Expression;
	right: Expression;
}
export interface Getter extends Evaluatable {
	type: "Getter";
	receiver: Expression;
	name: string;
	optional?: boolean;
}
export interface Invoke extends Evaluatable {
	type: "Invoke";
	receiver: Expression;
	method: string | undefined;
	arguments: Array<Expression> | undefined;
	optional?: boolean;
}
export interface Index extends Evaluatable {
	type: "Index";
	receiver: Expression;
	argument: Expression;
	optional?: boolean;
}
export interface Ternary extends Evaluatable {
	type: "Ternary";
	condition: Expression;
	trueExpr: Expression;
	falseExpr: Expression;
}
export interface Map extends Evaluatable {
	type: "Map";
	properties?: Array<Property | SpreadProperty> | undefined;
}
export interface Property extends Evaluatable {
	type: "Property";
	key: string;
	value: Expression;
}

export interface List extends Evaluatable {
	type: "List";
	items: Array<Expression> | undefined;
}
export interface ArrowFunction extends Evaluatable {
	type: "ArrowFunction";
	params: Array<string>;
	body: Expression;
}
export interface SpreadProperty extends Evaluatable {
	type: "SpreadProperty";
	expression: Expression;
}
export interface SpreadElement extends Evaluatable {
	type: "SpreadElement";
	expression: Expression;
}

export class EvalAstFactory implements AstFactory<Expression> {
	empty(): Empty {
		// TODO(justinfagnani): return null instead?
		return {
			type: "Empty",
			evaluate(scope) {
				return scope;
			},
			getIds(idents) {
				return idents;
			},
		};
	}

	// TODO(justinfagnani): just use a JS literal?
	literal(v: ast.LiteralValue): Literal {
		return {
			type: "Literal",
			value: v,
			evaluate(_scope) {
				return this.value;
			},
			getIds(idents) {
				return idents;
			},
		};
	}

	id(v: string): ID {
		return {
			type: "ID",

			value: v,

			evaluate(scope) {
				// TODO(justinfagnani): this prevents access to properties named 'this'

				if (this.value === "this") return scope;

				return scope?.[this.value];
			},

			getIds(idents) {
				idents.push(this.value);
				return idents;
			},
		};
	}

	unary(op: string, expr: Expression): Unary {
		const f = _UNARY_OPERATORS[op];
		return {
			type: "Unary",
			operator: op,
			child: expr,
			evaluate(scope) {
				return f(this.child.evaluate(scope));
			},
			getIds(idents) {
				return this.child.getIds(idents);
			},
		};
	}

	binary(l: Expression, op: string, r: Expression): Binary {
		const f = _BINARY_OPERATORS[op];
		return {
			type: "Binary",
			operator: op,
			left: l,
			right: r,
			evaluate(scope) {
				if (this.operator === "=") {
					if (
						this.left.type !== "ID" &&
						this.left.type !== "Getter" &&
						this.left.type !== "Index"
					) {
						throw new Error(`Invalid assignment target: ${this.left}`);
					}
					const value = this.right.evaluate(scope);
					let receiver: Record<string, unknown> | undefined;
					let property!: string;
					if (this.left.type === "Getter") {
						receiver = this.left.receiver.evaluate(scope) as Record<string, unknown> | undefined;
						property = this.left.name;
					} else if (this.left.type === "Index") {
						receiver = this.left.receiver.evaluate(scope) as Record<string, unknown> | undefined;
						property = String(this.left.argument.evaluate(scope));
					} else if (this.left.type === "ID") {
						// TODO: the id could be a parameter
						receiver = scope as Record<string, unknown>;
						property = this.left.value;
					}
					if (receiver === undefined) return undefined;
					receiver[property] = value;
					return value;
				}
				return f(this.left.evaluate(scope), this.right.evaluate(scope));
			},
			getIds(idents) {
				this.left.getIds(idents);
				this.right.getIds(idents);
				return idents;
			},
		};
	}

	getter(g: Expression, n: string, optional?: boolean): Getter {
		return {
			type: "Getter",
			receiver: g,
			name: n,
			optional,
			evaluate(scope) {
				const receiver = this.receiver.evaluate(scope) as
					| Record<string, unknown>
					| null
					| undefined;
				if (this.optional && (receiver === null || receiver === undefined)) {
					return undefined;
				}
				return receiver?.[this.name];
			},
			getIds(idents) {
				this.receiver.getIds(idents);
				return idents;
			},
		};
	}

	invoke(
		receiver: Expression,
		method: string | undefined,
		args: Expression[],
		optional?: boolean,
	): Invoke {
		if (method != null && typeof method !== "string") {
			throw new Error("method not a string");
		}
		return {
			type: "Invoke",
			receiver: receiver,
			method: method,
			arguments: args,
			optional,
			evaluate(scope) {
				const receiver = this.receiver.evaluate(scope) as
					| Record<string, unknown>
					| null
					| undefined;
				if (this.optional && (receiver === null || receiver === undefined)) {
					return undefined;
				}
				// TODO(justinfagnani): this might be wrong in cases where we're
				// invoking a top-level function rather than a method. If method is
				// defined on a nested scope, then we should probably set _this to null.
				const _this = this.method ? receiver : (scope?.this ?? scope);
				const f = this.method ? receiver?.[this.method] : receiver;
				const args = this.arguments ?? [];
				const argValues: unknown[] = [];
				for (const arg of args) {
					if (arg?.type === "SpreadElement") {
						const spreadVal = arg.evaluate(scope) as Iterable<unknown> | null | undefined;
						if (
							spreadVal &&
							typeof (spreadVal as Iterable<unknown>)[Symbol.iterator] === "function"
						) {
							argValues.push(...spreadVal);
						}
					} else {
						argValues.push(arg?.evaluate(scope));
					}
				}
				return (f as ((...args: unknown[]) => unknown) | undefined)?.apply?.(_this, argValues);
			},
			getIds(idents) {
				this.receiver.getIds(idents);
				this.arguments?.forEach((a) => {
					a?.getIds(idents);
				});
				return idents;
			},
		};
	}

	paren(e: Expression): Expression {
		return e;
	}

	index(e: Expression, a: Expression, optional?: boolean): Index {
		return {
			type: "Index",
			receiver: e,
			argument: a,
			optional,
			evaluate(scope) {
				const receiver = this.receiver.evaluate(scope) as
					| Record<string | number, unknown>
					| null
					| undefined;
				if (this.optional && (receiver === null || receiver === undefined)) {
					return undefined;
				}
				const index = this.argument.evaluate(scope) as string | number;
				return receiver?.[index];
			},
			getIds(idents) {
				this.receiver.getIds(idents);
				return idents;
			},
		};
	}

	ternary(c: Expression, t: Expression, f: Expression): Ternary {
		return {
			type: "Ternary",
			condition: c,
			trueExpr: t,
			falseExpr: f,
			evaluate(scope) {
				const c = this.condition.evaluate(scope);
				if (c) {
					return this.trueExpr.evaluate(scope);
				} else {
					return this.falseExpr.evaluate(scope);
				}
			},
			getIds(idents) {
				this.condition.getIds(idents);
				this.trueExpr.getIds(idents);
				this.falseExpr.getIds(idents);
				return idents;
			},
		};
	}

	map(properties: Array<Property | SpreadProperty> | undefined): Map {
		return {
			type: "Map",
			properties,
			evaluate(scope) {
				const map = {};
				if (properties && this.properties) {
					for (const prop of this.properties) {
						if (prop.type === "SpreadProperty") {
							Object.assign(map, prop.evaluate(scope));
						} else {
							(map as Record<string, unknown>)[prop.key] = prop.value.evaluate(scope);
						}
					}
				}
				return map;
			},
			getIds(idents) {
				if (properties && this.properties) {
					for (const prop of this.properties) {
						if (prop.type === "SpreadProperty") {
							prop.expression.getIds(idents);
						} else {
							prop.value.getIds(idents);
						}
					}
				}
				return idents;
			},
		};
	}

	property(key: string, value: Expression): Property {
		return {
			type: "Property",
			key,
			value,
			evaluate(scope) {
				return this.value.evaluate(scope);
			},
			getIds(idents) {
				return this.value.getIds(idents);
			},
		};
	}

	list(l: Array<Expression> | undefined): List {
		return {
			type: "List",
			items: l,
			evaluate(scope) {
				if (!this.items) return [];
				const result: unknown[] = [];
				for (const item of this.items) {
					if (item?.type === "SpreadElement") {
						const spreadVal = item.evaluate(scope) as Iterable<unknown> | null | undefined;
						if (
							spreadVal &&
							typeof (spreadVal as Iterable<unknown>)[Symbol.iterator] === "function"
						) {
							result.push(...spreadVal);
						}
					} else {
						result.push(item?.evaluate(scope));
					}
				}
				return result;
			},
			getIds(idents) {
				this.items?.forEach((i) => {
					i?.getIds(idents);
				});
				return idents;
			},
		};
	}

	arrowFunction(params: string[], body: Expression): Expression {
		return {
			type: "ArrowFunction",
			params,
			body,
			evaluate(scope) {
				const params = this.params;
				const body = this.body;
				return (...args: unknown[]) => {
					// TODO: this isn't correct for assignments to variables in outer
					// scopes
					// const newScope = Object.create(scope ?? null);
					const paramsObj = Object.fromEntries(params.map((p, i) => [p, args[i]]));
					const newScope = new Proxy(scope ?? {}, {
						set(target, prop, value) {
							if (Object.hasOwn(paramsObj, prop)) {
								paramsObj[prop as string] = value;
							}
							target[prop as string] = value;
							return value;
						},
						get(target, prop) {
							if (Object.hasOwn(paramsObj, prop)) {
								return paramsObj[prop as string];
							}
							return target[prop as string];
						},
					});
					return body.evaluate(newScope);
				};
			},
			getIds(idents) {
				// Only return the _free_ variables in the body. Since arrow function
				// parameters are the only way to introduce new variable names, we can
				// assume that any variable in the body that isn't a parameter is free.
				return this.body.getIds(idents).filter((id) => !this.params.includes(id));
			},
		};
	}

	spreadProperty(expression: Expression): SpreadProperty {
		return {
			type: "SpreadProperty",
			expression,
			evaluate(scope) {
				return this.expression.evaluate(scope);
			},
			getIds(idents) {
				return this.expression.getIds(idents);
			},
		};
	}

	spreadElement(expression: Expression): SpreadElement {
		return {
			type: "SpreadElement",
			expression,
			evaluate(scope) {
				return this.expression.evaluate(scope);
			},
			getIds(idents) {
				return this.expression.getIds(idents);
			},
		};
	}
}
