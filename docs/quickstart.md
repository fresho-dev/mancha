# Quick Start

With `mancha`, it's easier than ever to create simple web apps that require no server-side rendering
or build tools. Once the complexity of your project grows, you can add those things as needed.

To get started, simply add this to your HTML head attribute:

```html
<script src="//unpkg.com/mancha" css="utils" init></script>
```

## Basic Form

After importing `Mancha`, you can take advantage of reactivity and tailwind-compatible CSS styling.
For a full list of supported CSS utilities and basic styles, see the [CSS Documentation](./css.md).
For example, a basic form might look like this

```html
<body :data="{ name: null }">
	<form
		class="flex flex-col max-w-md p-4 bg-white rounded-lg"
		:on:submit="console.log('submitted')"
	>
		<label class="w-full mb-4">
			<span class="block text-sm font-medium text-gray-700">Name</span>
			<input
				required
				type="text"
				:bind="name"
				class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
			/>
		</label>
		<button
			type="submit"
			class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			Submit
		</button>
	</form>
</body>
```

In the code above, the `:on:submit` tag simply prints 'submitted' to the console. Note that `Mancha`
automatically prevents the form submission from refreshing the page by calling
`event.preventDefault()`. You can also trigger this behavior with other events by adding a `.prevent`
modifier to the event attribute, for example `:on:click.prevent`. To provide more complex handlers, you can define callbacks as a function:

```html
<body :data="{ name: null, message: null }">
	<!-- Form with handler referencing a user-defined function -->
	<form class="flex flex-col max-w-md p-4 bg-white rounded-lg" :on:submit="handleForm($event)">
		<label class="w-full mb-4">
			<span class="block text-sm font-medium text-gray-700">Name</span>
			<input
				required
				type="text"
				:bind="name"
				class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
			/>
		</label>
		<button
			type="submit"
			class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			Submit
		</button>

		<!-- To be shown only once `message` is truthy -->
		<p class="w-full mt-4 text-gray-700 text-center" :show="message">{{ message }}</p>
	</form>
</body>

<script>
	// Mancha is a global variable and $ is a shorthand for the renderer context.
	const { $ } = Mancha;

	// We can use the $ shorthand to access the form data and define variables.
	$.handleForm = function (event) {
		console.log(event);
		this.message = `Hello, ${this.name}!`;
	};

	// The script tag already contains the `init` attribute. So we don't need
	// to call `$.mount()` explicitly.
	// $.mount(document.body);
</script>
```

If you want more control over the initialization lifecycle, you can remove the `init` attribute from
the `<script>` tag that imports `Mancha`, and explicitly call the `mount()` function:

```html
<script src="//unpkg.com/mancha" css="utils"></script>

<body>
	<form class="flex flex-col max-w-md p-4 bg-white rounded-lg" :on:submit="handleForm($event)">
		<label class="w-full mb-4">
			<span class="block text-sm font-medium text-gray-700">Name</span>
			<input
				required
				type="text"
				:bind="name"
				class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
			/>
		</label>
		<button
			type="submit"
			class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
		>
			Submit
		</button>

		<p class="w-full mt-4 text-gray-700 text-center" :show="message">{{ message }}</p>
	</form>
</body>

<script type="module">
	// Mancha is a global variable and $ is a shorthand for the renderer context.
	const { $ } = Mancha;

	// We can use the $ shorthand to access the form data and define variables.
	$.handleForm = function (event) {
		console.log(event);
		this.message = `Hello, ${this.name}!`;
	};

	// Define the variables that will be used in the form.
	$.name = null;
	$.message = null;

	// Mount the renderer context to the body element.
	await $.mount(document.body);
</script>
```

## Conditional Rendering

Mancha provides two ways to control element visibility:

1. `:show` - toggles `display: none`. The element remains in the DOM.
2. `:if` - conditionally renders the element. If the condition is false, the element is removed from the DOM and replaced with a placeholder.

```html
<!-- Element remains in DOM, just hidden -->
<div :show="isVisible">I am toggled with CSS</div>

<!-- Element is removed from DOM when hidden -->
<div :if="isVisible">I am conditionally rendered</div>
```

**Note**: The `:if` attribute does not currently support an `:else` branch.

## Reusable Components

`mancha` supports custom components, which can be defined using the template tag:

```html
<!-- Use <template is="my-component-name"> to register a component. -->
<template is="my-red-button">
	<button style="background-color: red;">
		<slot></slot>
	</button>
</template>
```

The components can live in their own, separate files. A common pattern is to separate each component into their own file, and import them all in a single "roll-up" file. For example, your files might look like this:

```
src/
├─ components/
|  ├─ footer.tpl.html
|  ├─ my-red-button.tpl.html
|  ├─ my-custom-component.tpl.html
├─ index.html
```

Instead of importing the components individually, you could create a single file `registry.tpl.html` which imports all the custom components:

```html
<!-- src/components/registry.tpl.html -->
<include src="./my-red-button.tpl.html" />
<include src="./my-custom-component.tpl.html" />
```

Then in `index.html`:

```html
<!-- src/index.html -->
<head>
	<!-- ... -->
</head>
<body>
	<!-- Include the custom component definition before using any of the components -->
	<include src="components/registry.tpl.html" />

	<!-- Now you can use any of the custom components -->
	<my-red-button>Click Me!</my-red-button>

	<!-- Any other components can also use the custom components, and don't need to re-import them -->
	<include src="components/footer.tpl.html" />
</body>
```

## Element Initialization with `:render`

The `:render` attribute links any HTML element to a JavaScript ES module for initialization. This is useful when you need to initialize third-party libraries (like charts, maps, or video players) on specific elements.

### Basic Usage

```html
<canvas :render="./chart-init.js"></canvas>
```

The module's default export is called with the element and renderer as arguments:

```js
// chart-init.js
export default function (elem, renderer) {
	// Initialize a chart library on the canvas element
	const chart = new Chart(elem, {
		type: "bar",
		data: { labels: ["A", "B", "C"], datasets: [{ data: [1, 2, 3] }] },
	});

	// Optionally store a reference for later access
	elem._chart = chart;
}
```

### Using with Custom Components

The `:render` attribute works naturally inside custom component templates. This is the recommended pattern for creating reusable components that need JavaScript initialization:

```
src/
├─ components/
│  ├─ chart-widget.tpl.html
│  ├─ chart-widget.js
│  ├─ registry.tpl.html
├─ index.html
```

```html
<!-- components/chart-widget.tpl.html -->
<template is="chart-widget">
	<div class="chart-container">
		<canvas :render="./chart-widget.js"></canvas>
		<slot></slot>
	</div>
</template>
```

```js
// components/chart-widget.js
export default function (elem, renderer) {
	// Access data passed via :data attribute on the component
	const { labels, values } = renderer.$;

	new Chart(elem, {
		type: "bar",
		data: {
			labels: labels || ["A", "B", "C"],
			datasets: [{ data: values || [1, 2, 3] }],
		},
	});
}
```

```html
<!-- components/registry.tpl.html -->
<include src="./chart-widget.tpl.html" />
```

```html
<!-- index.html -->
<body>
	<include src="components/registry.tpl.html" />

	<!-- Use the component with custom data -->
	<chart-widget :data="{ labels: ['Jan', 'Feb', 'Mar'], values: [10, 20, 15] }">
		<p>Monthly Sales</p>
	</chart-widget>

	<!-- Use it again with different data -->
	<chart-widget :data="{ labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [100, 150, 120, 180] }">
		<p>Quarterly Revenue</p>
	</chart-widget>
</body>
```

Relative paths like `./chart-widget.js` are automatically resolved based on where the template is defined (`/components/`), not where the component is used.

### Works on Any Element

The `:render` attribute works on any HTML element, not just inside custom components:

```html
<video :render="./video-player.js" src="movie.mp4"></video>
<div :render="./carousel.js" class="slides"></div>
<form :render="./form-validation.js"></form>
```

### Accessing Renderer State

The init function receives the renderer instance, giving you access to reactive state:

```js
// counter-canvas.js
export default function (elem, renderer) {
	const ctx = elem.getContext("2d");

	// Access current state
	const count = renderer.$.count;

	// Draw based on state
	ctx.fillText(`Count: ${count}`, 10, 50);

	// Watch for changes using the renderer's effect system
	renderer.effect(function () {
		ctx.clearRect(0, 0, elem.width, elem.height);
		ctx.fillText(`Count: ${this.$.count}`, 10, 50);
	});
}
```

### Server-Side Rendering Compatibility

During server-side rendering (SSR), the `:render` attribute's path is resolved but the JavaScript module is not executed. The module is only executed when the HTML is hydrated in the browser, making this feature fully compatible with SSR workflows.

### Setting Undefined Variables in `:render`

A powerful pattern is using `:render` to set variables that are already referenced in your template
but not pre-defined. When a template references an undefined variable, `mancha` automatically
initializes it to `undefined` and attaches an observer. Since the `:render` callback receives the
element's renderer, setting variables through it will trigger reactive updates in the template:

```html
<div :render="./data-loader.js">
	<h1>{{ pageTitle }}</h1>
	<ul :for="item in dataItems">
		<li>{{ item.name }}: {{ item.value }}</li>
	</ul>
	<p :show="loading">Loading...</p>
</div>
```

```js
// data-loader.js
export default async function (elem, renderer) {
	// Set loading state.
	await renderer.set("loading", true);

	// Fetch data from an API.
	const response = await fetch("/api/data");
	const data = await response.json();

	// Set the variables - the template will reactively update.
	await renderer.set("pageTitle", data.title);
	await renderer.set("dataItems", data.items);
	await renderer.set("loading", false);
}
```

Note that `renderer.set()` is async and returns a Promise. You only need to `await` if subsequent
code depends on those variables being set. You can also set multiple variables concurrently with
`Promise.all([renderer.set("a", 1), renderer.set("b", 2)])`.

## URL Query Parameter Binding

`mancha` makes it easy to synchronize your application's state with the URL query parameters. This is particularly useful for maintaining state across page reloads or for creating shareable links.

This feature works automatically for any variable prefixed with `$$`. When a `$$` variable is changed in your application, the URL is updated. Conversely, when the page loads, `mancha` reads the query parameters from the URL and populates the corresponding `$$` variables in your application's state.

Here's how you can use it:

```html
<body :data="{ $$search: '' }">
	<form class="flex flex-col max-w-md p-4 bg-white rounded-lg">
		<label class="w-full mb-4">
			<span class="block text-sm font-medium text-gray-700">Search</span>
			<input
				type="text"
				:bind="$$search"
				class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
				placeholder="Type to see the URL change..."
			/>
		</label>
		<div :show="$$search" class="mt-2">
			<p>Current search query: <span class="font-mono">{{ $$search }}</span></p>
		</div>
	</form>
</body>
```

In this example, the input field is bound to `$$search`. As you type, the URL will be updated with a `search` query parameter (e.g., `?search=your-text`). If you reload the page with the query parameter in the URL, the input field will be automatically populated with the value from the URL.

## Testing

`mancha`'s architecture makes it easy to test your application's UI without having to run a full browser environment. You can use a library like `JSDOM` to simulate a browser environment in Node.js and then use mancha to render your components and make assertions about the output.

Here's an example of how you can test a simple component:

```html
<!-- my-component.html -->
<body>
	<button data-testid="login-button" :show="!user">Login</button>
	<button data-testid="logout-button" :show="user">Logout</button>
</body>
```

```js
// test.js
import { test, describe, before } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Renderer } from "mancha";

const componentPath = path.join(import.meta.dirname, "my-component.html");
const findByTestId = (node, testId) => node.querySelector(`[data-testid="${testId}"]`);

describe("My Component", () => {
	test("renders correctly when logged out", async () => {
		// 1. Initialize the renderer with the desired state for this test case.
		const renderer = new Renderer({ user: null });

		// 2. Create a clean DOM fragment from the page content.
		const fragment = await renderer.preprocessLocal(componentPath);

		// 3. Mount the renderer to the fragment to apply data bindings.
		await renderer.mount(fragment);

		// 4. Find elements and assert their state.
		const loginButton = findByTestId(fragment, "login-button");
		const logoutButton = findByTestId(fragment, "logout-button");

		assert.ok(loginButton, "Login button should exist");
		assert.ok(logoutButton, "Logout button should exist");

		assert.strictEqual(loginButton.style.display, "", "Login button should be visible");
		assert.strictEqual(logoutButton.style.display, "none", "Logout button should be hidden");
	});

	test("renders correctly when logged in", async () => {
		// 1. Initialize the renderer with the desired state for this test case.
		const renderer = new Renderer({ user: { name: "John Doe" } });

		// 2. Create a clean DOM fragment from the page content.
		const fragment = await renderer.preprocessLocal(componentPath);

		// 3. Mount the renderer to the fragment to apply data bindings.
		await renderer.mount(fragment);

		// 4. Find elements and assert their state.
		const loginButton = findByTestId(fragment, "login-button");
		const logoutButton = findByTestId(fragment, "logout-button");

		assert.strictEqual(loginButton.style.display, "none", "Login button should be hidden");
		assert.strictEqual(logoutButton.style.display, "", "Logout button should be visible");
	});
});
```

## TypeScript Support

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

The `$` proxy provides typed access to store values. Without a type parameter, the store accepts any properties:

```typescript
// Untyped store (default behavior)
const renderer = new Renderer({ foo: "bar" });
renderer.$.foo; // works, but no type inference
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

The `:types` payload is parsed with `jexpr`, so it must evaluate to a plain object whose **values are
strings** containing TypeScript snippets. If the type checker encounters a non-string value it will
emit an error that points at the offending key. When you need literal quotes inside a type, escape
them in a double-quoted attribute (for example,
`<div :types="{\"status\": \"'active' | 'inactive'\"}">`) or pull the definition into a TypeScript
module and reference it via `@import`.

### Running the Type Checker

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

# Render without stripping (default)
npx mancha render src/index.html --output public/index.html
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

Child scopes inherit types from parent scopes:

```html
<div :types='{"name": "string", "age": "number"}'>
	<span>{{ name.toUpperCase() }}</span>

	<div :types='{"city": "string"}'>
		<!-- This scope has access to: name, age, and city -->
		<span>{{ name.toLowerCase() }}</span>
		<span>{{ city.toUpperCase() }}</span>
		<span>{{ age.toFixed(0) }}</span>
	</div>
</div>
```

Child scopes can override parent types:

```html
<div :types='{"value": "string"}'>
	<span>{{ value.toUpperCase() }}</span>

	<div :types='{"value": "number"}'>
		<!-- 'value' is now number, not string -->
		<span>{{ value.toFixed(2) }}</span>
	</div>

	<!-- Back to string scope -->
	<span>{{ value.toLowerCase() }}</span>
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

export interface Product {
	id: number;
	name: string;
	price: number;
}
```

```html
<!-- Import a single type -->
<div :types='{"user": "@import:./types/user.ts:User"}'>
	<span>{{ user.name.toUpperCase() }}</span>
	<span>{{ user.email.toLowerCase() }}</span>
	<span :show="user.isAdmin">Admin Badge</span>
</div>
```

#### Import Syntax

The format is: `@import:MODULE_PATH:TYPE_NAME`

- **MODULE_PATH**:
  - Starts with `.` or `..` → relative path (e.g., `./types/user.ts`, `../shared/types.ts`)
  - No `.` → external package from node_modules (e.g., `typescript`, `my-package/subpath`)
- **TYPE_NAME**: The exported type/interface name

**Examples of external package imports:**

```html
<!-- Import from a standard package -->
<div :types='{"program": "@import:typescript:Program"}'>
	<span>{{ program }}</span>
</div>

<!-- Import from package subpath (with package.json exports) -->
<div :types='{"parser": "@import:yargs/helpers:Parser.Arguments"}'>
	<span>{{ parser }}</span>
</div>

<!-- Import from your own packages in a monorepo -->
<div :types='{"data": "@import:my-shared-lib/types:ApiResponse"}'>
	<span>{{ data.status }}</span>
</div>
```

#### Arrays of Imported Types

```html
<div :types='{"users": "@import:./types/user.ts:User[]"}'>
	<ul :for="user in users">
		<li>{{ user.name }} - {{ user.email }}</li>
	</ul>
</div>
```

#### Multiple Imports

```html
<div
	:types='{
  "user": "@import:./types/user.ts:User",
  "product": "@import:./types/user.ts:Product",
  "count": "number"
}'
>
	<span>{{ user.name }}</span>
	<span>{{ product.name }} - ${{ product.price.toFixed(2) }}</span>
	<span>Total: {{ count }}</span>
</div>
```

#### Imports in Complex Types

Use imports anywhere you'd use a type:

```html
<!-- In object types -->
<div :types='{"response": "{ data: @import:./types/user.ts:User[], total: number }"}'>
	<span>Total users: {{ response.total }}</span>
	<ul :for="user in response.data">
		<li>{{ user.name }}</li>
	</ul>
</div>

<!-- With generics -->
<div :types='{"response": "@import:./api.ts:ApiResponse<@import:./types/user.ts:User>"}'>
	<span>{{ response.data.name }}</span>
	<span>Status: {{ response.status }}</span>
</div>

<!-- With unions -->
<div :types='{"user": "@import:./types/user.ts:User | null"}'>
	<span :show="user !== null">{{ user.name }}</span>
	<span :show="user === null">Not logged in</span>
</div>
```

#### Nested Scopes with Imports

Imports are inherited by nested scopes:

```html
<div :types='{"user": "@import:./types/user.ts:User"}'>
	<span>{{ user.name }}</span>

	<div :types='{"product": "@import:./types/user.ts:Product"}'>
		<!-- Has access to both User and Product types -->
		<span>{{ user.name }} bought {{ product.name }}</span>
	</div>
</div>
```

#### Complex Example

```html
<div :types='{"orders": "@import:./types/orders.ts:Order[]"}'>
	<div :for="order in orders">
		<h2>Order #{{ order.id }}</h2>
		<p>Customer: {{ order.customer.name }}</p>

		<div :types='{"selectedProduct": "@import:./types/products.ts:Product"}'>
			<ul :for="item in order.items">
				<li>
					{{ item.product.name }} x {{ item.quantity }} = ${{ (item.product.price *
					item.quantity).toFixed(2) }}
				</li>
			</ul>

			<div :show="selectedProduct">
				<h3>Selected: {{ selectedProduct.name }}</h3>
				<p>${{ selectedProduct.price.toFixed(2) }}</p>
			</div>
		</div>

		<p>Total: ${{ order.total.toFixed(2) }}</p>
	</div>
</div>
```

### Best Practices

1. **Start Simple**: Add types gradually, starting with the most critical paths
2. **Use Strict Mode**: Enable strict mode in your TypeScript config for better type safety
3. **Import Shared Types**: Keep commonly used types in separate files and import them
4. **Document Complex Types**: Add comments for complex object structures
5. **Test Your Types**: Run the type checker in your CI/CD pipeline

### Limitations

- The type checker analyzes templates statically, not at runtime
- Some dynamic JavaScript patterns may not be fully supported
- Import paths must be resolvable by TypeScript
- The import syntax is experimental and may change

### Examples

#### Form Validation

```html
<div
	:types='{
  "formData": "{ name: string, email: string, age: number }",
  "errors": "{ name?: string, email?: string, age?: string }"
}'
>
	<form>
		<input type="text" :bind="formData.name" />
		<span :show="errors.name" class="error">{{ errors.name }}</span>

		<input type="email" :bind="formData.email" />
		<span :show="errors.email" class="error">{{ errors.email }}</span>

		<input type="number" :bind="formData.age" />
		<span :show="errors.age" class="error">{{ errors.age }}</span>
	</form>
</div>
```

#### API Response Handling

```html
<div
	:types='{
  "response": "@import:./api.ts:ApiResponse<@import:./types/user.ts:User>",
  "loading": "boolean",
  "error": "string | null"
}'
>
	<div :show="loading">Loading...</div>
	<div :show="error">Error: {{ error }}</div>
	<div :show="!loading && !error && response">
		<h1>{{ response.data.name }}</h1>
		<p>{{ response.data.email }}</p>
	</div>
</div>
```
