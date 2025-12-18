/*
 * @license
 * Portions Copyright (c) 2013, the Dart project authors.
 */

import * as ast from "./ast.js";

export interface AstFactory<E extends ast.Expression> {
	empty(): E;
	literal(value: ast.LiteralValue): E;
	id(name: string): E;
	unary(operator: string, expression: E): E;
	binary(left: E, op: string, right: E | undefined): E;
	getter(receiver: E, name: string, optional?: boolean): E;
	invoke(
		receiver: E,
		method: string | undefined,
		args: Array<E | undefined> | undefined,
		optional?: boolean,
	): E;
	paren(child: E | undefined): E;
	index(receiver: E, argument: E | undefined, optional?: boolean): E;
	ternary(condition: E, trueExpr: E | undefined, falseExpr: E | undefined): E;
	map(properties: Array<ast.Property | ast.SpreadProperty> | undefined): E;
	list(items: Array<E | undefined> | undefined): E;
	arrowFunction(params: Array<string>, body: E | undefined): E;
	spreadProperty(expression: E): E;
	spreadElement(expression: E): E;
	property(key: string, value: E): E;
}

export class DefaultAstFactory implements AstFactory<ast.Expression> {
	empty(): ast.Empty {
		return { type: "Empty" };
	}

	// TODO(justinfagnani): just use a JS literal?
	literal(value: ast.LiteralValue): ast.Literal {
		return {
			type: "Literal",
			value,
		};
	}

	id(value: string): ast.ID {
		return {
			type: "ID",
			value,
		};
	}

	unary(operator: string, child: ast.Expression): ast.Unary {
		return {
			type: "Unary",
			operator,
			child,
		};
	}

	binary(left: ast.Expression, operator: string, right: ast.Expression): ast.Binary {
		return {
			type: "Binary",
			operator,
			left,
			right,
		};
	}

	getter(receiver: ast.Expression, name: string, optional?: boolean): ast.Getter {
		return {
			type: "Getter",
			receiver,
			name,
			optional,
		};
	}

	invoke(
		receiver: ast.Expression,
		method: string | undefined,
		args: Array<ast.Expression> | undefined,
		optional?: boolean,
	): ast.Invoke {
		// TODO(justinfagnani): do this assertion in the parser
		if (args === undefined) {
			throw new Error("args");
		}
		return {
			type: "Invoke",
			receiver,
			method,
			arguments: args,
			optional,
		};
	}

	paren(child: ast.Expression): ast.Paren {
		return {
			type: "Paren",
			child,
		};
	}

	index(
		receiver: ast.Expression,
		argument: ast.Expression | undefined,
		optional?: boolean,
	): ast.Index {
		return {
			type: "Index",
			receiver,
			argument,
			optional,
		};
	}

	ternary(
		condition: ast.Expression,
		trueExpr: ast.Expression,
		falseExpr: ast.Expression,
	): ast.Ternary {
		return {
			type: "Ternary",
			condition,
			trueExpr,
			falseExpr,
		};
	}

	map(properties: Array<ast.Property | ast.SpreadProperty>): ast.Map {
		return {
			type: "Map",
			properties,
		};
	}

	list(items: Array<ast.Expression>): ast.List {
		return {
			type: "List",
			items,
		};
	}

	property(key: string, value: ast.Expression): ast.Property {
		return {
			type: "Property",
			key,
			value,
		};
	}

	arrowFunction(params: Array<string>, body: ast.Expression): ast.ArrowFunction {
		return {
			type: "ArrowFunction",
			params,
			body,
		};
	}

	spreadProperty(expression: ast.Expression): ast.SpreadProperty {
		return {
			type: "SpreadProperty",
			expression,
		};
	}

	spreadElement(expression: ast.Expression): ast.SpreadElement {
		return {
			type: "SpreadElement",
			expression,
		};
	}
}
