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

## The Shared Renderer Type

Each entry point exports its own `Renderer`: `mancha` parses with jsdom, `mancha/browser` with the DOM, and `mancha/worker` with htmlparser2. All three extend `IRenderer`, which every entry point exports alongside them. It is the type to reach for when code has to work against whichever renderer it is handed — typically logic shared between the server and the client:

```typescript
import type { IRenderer } from "mancha";

// Accepts the jsdom, browser and worker renderers alike.
async function renderPage(renderer: IRenderer, html: string): Promise<string> {
	const fragment = renderer.parseHTML(html);
	return renderer.serializeHTML(await renderer.renderNode(fragment));
}
```

`IRenderer` is also the `this` type of `RendererPlugin`, so it is needed to annotate a plugin written as a standalone function:

```typescript
import type { IRenderer, RendererPlugin } from "mancha";

const logNodes: RendererPlugin = function (this: IRenderer, node) {
	console.log(this.impl, node.nodeName);
};
```

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

### Types Never Reach the Output

The `:types` attributes are only used for static analysis and have no runtime behavior, so rendering always removes them. There is no flag to opt in or out:

```bash
# :types and data-types are stripped from the rendered output
npx mancha render src/index.html --output public/index.html
```

This holds for every render, in the browser as well as on the server: `:types` and `data-types` are dropped from each node as it is rendered.

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
