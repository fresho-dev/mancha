// Test type definitions for type checker import tests

export interface Product {
	id: number;
	name: string;
	price: number;
	inStock: boolean;
}

export interface Category {
	id: number;
	name: string;
	products: Product[];
}
