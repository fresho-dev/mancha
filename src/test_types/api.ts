// Test type definitions for type checker import tests

export interface ApiResponse<T> {
	data: T;
	status: number;
	message: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
}
