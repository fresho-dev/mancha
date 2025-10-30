// Test type definitions for type checker import tests

export interface User {
  name: string;
  email: string;
  age: number;
}

export interface Admin extends User {
  role: string;
  permissions: string[];
}

export type UserRole = "admin" | "user" | "guest";
