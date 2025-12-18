/*
 * @license
 * Portions Copyright (c) 2013, the Dart project authors.
 */

export type Expression =
	| Literal
	| Empty
	| ID
	| Unary
	| Binary
	| Getter
	| Invoke
	| Paren
	| Index
	| Ternary
	| Map
	| List
	| ArrowFunction
	| SpreadProperty
	| SpreadElement
	| Property;

export type LiteralValue = string | number | boolean | null | undefined;

export interface Literal {
	type: "Literal";
	value: LiteralValue;
}

export interface Empty {
	type: "Empty";
}

export interface ID {
	type: "ID";
	value: string;
}

export interface Unary {
	type: "Unary";
	operator: string;
	child: Expression;
}

export interface Binary {
	type: "Binary";
	operator: string;
	left: Expression;
	right: Expression;
}

export interface Getter {
	type: "Getter";
	receiver: Expression;
	name: string;
	optional?: boolean;
}

export interface Invoke {
	type: "Invoke";
	receiver: Expression;
	method?: string;
	arguments?: Array<Expression>;
	optional?: boolean;
}

export interface Paren {
	type: "Paren";
	child: Expression;
}

export interface Index {
	type: "Index";
	receiver: Expression;
	argument?: Expression;
	optional?: boolean;
}

export interface Ternary {
	type: "Ternary";
	condition: Expression;
	trueExpr: Expression;
	falseExpr: Expression;
}

export interface Map {
	type: "Map";
	properties?: Array<Property | SpreadProperty>;
}

export interface Property {
	type: "Property";
	key: string;
	value: Expression;
}

export interface List {
	type: "List";
	items?: Array<Expression>;
}

export interface ArrowFunction {
	type: "ArrowFunction";
	params: Array<string>;
	body: Expression;
}

export interface SpreadProperty {
	type: "SpreadProperty";
	expression: Expression;
}

export interface SpreadElement {
	type: "SpreadElement";
	expression: Expression;
}
