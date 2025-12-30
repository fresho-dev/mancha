# TypeScript Support

The `Renderer` and `SignalStore` classes support generic type parameters for type-safe state access:

```typescript
import { Renderer } from "mancha";

interface AppState {
	user: { name: string; email: string } | null;
	count: number;
	items: string[];
}

const renderer = new Renderer<AppState>({
	user: null,
	count: 0,
	items: ["a", "b"],
});

// Type-safe access via the $ proxy
const count: number = renderer.$.count;
const items: string[] = renderer.$.items;

// Type-safe assignment
renderer.$.count = 42;
renderer.$.user = { name: "Alice", email: "alice@example.com" };
```

The `$` proxy provides typed access to store values. Without a type parameter, the store accepts any properties.

## Type Checking (Experimental)

**⚠️ This feature is experimental and may change in future versions.**

`mancha` includes an experimental type checker that can validate your template expressions using TypeScript. This helps catch type errors during development before they become runtime errors.

### Basic Type Checking

Use the `:types` attribute to declare types for variables in your templates:

```html
<div :types='{"name": "string", "age": "number"}'>
	<span>{{ name.toUpperCase() }}</span>
	<span>{{ age.toFixed(0) }}</span>
</div>
```

The type checker will validate that:
- `name.toUpperCase()` is valid (string has toUpperCase method)
- `age.toFixed(0)` is valid (number has toFixed method)
- Using `name.toFixed()` would be an error (string doesn't have toFixed)

The `:types` payload is parsed with `jexpr`, so it must evaluate to a plain object whose **values are strings** containing TypeScript snippets.

### Running the Checker

```bash
# Check a single file
npx mancha check src/index.html

# Check with strict mode
npx mancha check src/index.html --strict
```

### Stripping Types in Production

The `:types` attributes are only used for static analysis and have no runtime behavior. However, you may want to remove them from your production HTML to reduce file size and avoid exposing type information:

```bash
# Render with types stripped
npx mancha render src/index.html --output public/index.html --strip-types
```

The `--strip-types` flag removes all `:types` and `data-types` attributes from the rendered output.

### Type Checking with For-Loops

The type checker understands `:for` loops and infers the item type from the array:

```html
<div :types='{"users": "{ name: string, age: number }[]"}'>
	<ul :for="user in users">
		<!-- 'user' is automatically typed as { name: string, age: number } -->
		<li>{{ user.name.toUpperCase() }}</li>
		<li>{{ user.age.toFixed(0) }}</li>
	</ul>
</div>
```

### Nested Scopes

Child scopes inherit types from parent scopes. Child scopes can also override parent types.

```html
<div :types='{"name": "string", "age": "number"}'>
	<span>{{ name.toUpperCase() }}</span>

	<div :types='{"city": "string"}'>
		<!-- This scope has access to: name, age, and city -->
		<span>{{ name.toLowerCase() }}</span>
	</div>
</div>
```

### Importing Types (Experimental)

**⚠️ This feature is highly experimental and the syntax may change.**

You can import TypeScript types from external files using the `@import:` syntax:

```typescript
// types/user.ts
export interface User {
	id: number;
	name: string;
	email: string;
	isAdmin: boolean;
}
```

```html
<!-- Import a single type -->
<div :types='{"user": "@import:./types/user.ts:User"}'>
	<span>{{ user.name.toUpperCase() }}</span>
</div>
```

The format is: `@import:MODULE_PATH:TYPE_NAME`

- **MODULE_PATH**:
  - Starts with `.` or `..` → relative path (e.g., `./types/user.ts`, `../shared/types.ts`)
  - No `.` → external package from node_modules (e.g., `typescript`, `my-package/subpath`)
- **TYPE_NAME**: The exported type/interface name

#### Arrays of Imported Types

```html
<div :types='{"users": "@import:./types/user.ts:User[]"}'>
	<ul :for="user in users">
		<li>{{ user.name }} - {{ user.email }}</li>
	</ul>
</div>
```

#### Complex Types

Use imports anywhere you'd use a type:

```html
<!-- In object types -->
<div :types='{"response": "{ data: @import:./types/user.ts:User[], total: number }"}'>
	<!-- ... -->
</div>

<!-- With generics -->
<div :types='{"response": "@import:./api.ts:ApiResponse<@import:./types/user.ts:User>"}'>
	<!-- ... -->
</div>
```

### Best Practices

1. **Start Simple**: Add types gradually, starting with the most critical paths
2. **Use Strict Mode**: Enable strict mode in your TypeScript config for better type safety
3. **Import Shared Types**: Keep commonly used types in separate files and import them
4. **Document Complex Types**: Add comments for complex object structures
5. **Test Your Types**: Run the type checker in your CI/CD pipeline
