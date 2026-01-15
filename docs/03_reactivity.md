# Reactivity

`mancha` implements its own reactivity engine, allowing for efficient updates without a virtual DOM.

## Variable Scoping

Contents of the `:data` attribute are only available to subnodes in the HTML tree. This is better illustrated with an example:

```html
<body :data="{ name: 'stranger', key: '1234' }">
	<!-- Hello, stranger -->
	<h1>Hello, {{ name }}</h1>

	<!-- Initially "undefined", but reactive to later changes -->
	<span>{{ message }}</span>

	<!-- How are you, danger? The secret message is "secret" and the key is "1234" -->
	<p :data="{ name: 'danger', message: 'secret' }">
		How are you, {{ name }}? The secret message is "{{ message }}" and the key is "{{ key }}"
	</p>
</body>
```

By default, the target root element is the `body` tag. So, any variables defined in the body's `:data` attribute are available to the main renderer.

In the example above, the `<span>` references `message` which is not defined in the body's `:data`. This auto-initializes `message` to `undefined` and attaches an observer, so setting `$.message` later will update the `<span>` content. The `<p>` tag has its own local `message` variable which shadows any parent value. Since the variables are not accessible via the global object, you'll need to retrieve the renderer from the element's properties:

```js
// Explicitly render the body, so we can await it and then modify variables.
const { $ } = Mancha;
await $.mount(document.body);

// This modifies the `name` variable in all the renderer contexts.
$.name = "world";

// This updates the `<span>` content to "bandit" because `message` was
// auto-initialized when the template referenced it. However, the `<p>` tag
// still shows "secret" because it has its own local `message` variable.
$.message = "bandit";

// We extract the subrenderer from the element's properties. Only elements
// with `:data` attribute have a `renderer` property.
const subrenderer = document.querySelector("p").renderer;

// This modifies the `message` variable only in the `<p>` tag.
subrenderer.$.message = "banana";
```

When accessing variables, `mancha` searches the current renderer first, then the parent, the parent's parent, and so forth until the root renderer is reached. If the requested variable is not found in the current renderer or any of the ancestor renderers, then `undefined` is returned.

### Reactive Undefined Variables

When a variable is referenced in a template expression but not yet defined, `mancha` automatically initializes it to `undefined` and attaches an observer. This means you can set the variable later using the same renderer (or a subrenderer) and the template will reactively update:

```html
<body>
	<!-- Initially shows "undefined", but updates reactively when `message` is set -->
	<p>{{ message }}</p>
</body>
<script type="module">
	const { $ } = Mancha;
	await $.mount(document.body);

	// The template initially renders with `message` as undefined.
	// Setting it now will trigger a reactive update.
	$.message = "Hello, World!";
</script>
```

This behavior is particularly useful with the `:render` attribute, where a JavaScript module can set variables that are already referenced in the template.

The auto-initialization only happens when variables are accessed during an effect (such as template rendering). Accessing a variable outside of an effect context will return `undefined` without creating an observer.

When setting a variable, there are 3 possible cases:

1. The variable has already been defined in the current renderer. Then it gets updated in the current renderer.
2. The variable is undefined in the current renderer but has already been defined in an ancestor renderer. Then it gets updated in the corresponding ancestor renderer.
3. The variable is not defined in the current renderer or any ancestor renderers. Then it is set in the current renderer.

**NOTE**: This does not apply to variables defined via `:data` attribute, which always set a new variable for the newly created renderer.

Renderers also have a `$parent`, `$rootRenderer` and `$rootNode` attributes. The `$parent` attribute references the immediate ancestor renderer if any, or it's `null` otherwise. The `$rootRenderer` attribute references the root renderer where `mancha` was mounted, which could be a self-reference. Finally, the `$rootNode` attribute references the HTML node where `mancha` was mounted.

While evaluating expressions, there will also be an `$elem` attribute which references the current element being rendered or, in the case of events, the element dispatching the event as well as the corresponding `$event` attribute.

## Observer Triggering

Observers only trigger when a value actually changes. Setting a variable to the same value it already holds will not notify observers or cause re-renders:

```js
const { $ } = Mancha;
$.count = 5;
$.count = 5; // No observer triggered - value unchanged
$.count = 6; // Observers triggered - value changed
```

This optimization applies to both top-level variables and nested object/array properties:

```js
$.user = { name: "Alice" };
$.user.name = "Alice"; // No observer triggered - same value
$.user.name = "Bob";   // Observers triggered
```

### Working with Arrays

Arrays in `mancha` are wrapped in reactive proxies, so mutations like `push`, `pop`, `splice`, and direct index assignment will trigger observers:

```js
$.items = ["a", "b", "c"];
$.items.push("d");    // Observers triggered
$.items[0] = "x";     // Observers triggered
$.items.pop();        // Observers triggered
```

To clear an array while triggering observers, set its length to zero:

```js
$.items.length = 0;   // Clears the array, observers triggered
```

Note that clearing an already-empty array will not trigger observers since the length is unchanged:

```js
$.items = [];
$.items.length = 0;   // No observer triggered - already empty
```

### Deep Reactivity

`mancha` supports deep reactivity for nested plain objects and arrays. When you modify a property of an object inside an array, observers are triggered automatically:

```js
$.items = [
	{ name: "a", visible: false },
	{ name: "b", visible: true },
];

// Modifying nested properties triggers observers
$.items[0].visible = true;  // Observers triggered
$.items[1].name = "c";      // Observers triggered
```

**Note:** Deep reactivity only applies to plain objects (created with `{}`) and arrays. Custom class instances are **not** deeply reactive to avoid unexpected behavior and performance issues. If you need to trigger updates when modifying class instance properties, replace the entire object or array:

```js
class Item {
	constructor(name, visible) {
		this.name = name;
		this.visible = visible;
	}
}

$.items = [new Item("a", false), new Item("b", true)];

// This does NOT trigger observers (class instances are not deeply reactive)
$.items[0].visible = true;

// To trigger observers, replace the array or use plain objects instead
$.items = [...$.items];  // Observers triggered
```

### Replacing vs. Mutating

When you assign a new array or object, observers always trigger because the reference changes:

```js
$.items = [];
$.items = []; // Observers triggered - different array reference
```

If you want to avoid triggering observers when the content is logically the same, mutate the existing array instead of replacing it:

```js
// This always triggers (new reference):
$.items = [];

// This only triggers if the array wasn't already empty:
$.items.length = 0;
```

## Computed Values

Computed values are derived values that automatically update when their dependencies change. Use `$computed` to create a named reactive value that recalculates whenever the values it depends on are modified.

### Basic Usage

In `:data` attributes, use `$computed` with an arrow function:

```html
<div :data="{ count: 2, doubled: $computed(() => count * 2) }">
	<p>Count: {{ count }}</p>
	<p>Doubled: {{ doubled }}</p>
	<button :on:click="count = count + 1">Increment</button>
</div>
```

When `count` changes, `doubled` automatically updates to reflect the new value.

### Multiple Computed Values

You can define multiple computed values in the same `:data` attribute:

```html
<div :data="{
	price: 100,
	quantity: 2,
	subtotal: $computed(() => price * quantity),
	tax: $computed(() => subtotal * 0.1),
	total: $computed(() => subtotal + tax)
}">
	<p>Subtotal: {{ subtotal }}</p>
	<p>Tax: {{ tax }}</p>
	<p>Total: {{ total }}</p>
</div>
```

Computed values can depend on other computed values. When `price` or `quantity` changes, all three computed values update in the correct order.

### Syntax Options

Both of these syntaxes work in templates:

```html
<!-- Simpler: access variables directly -->
<div :data="{ x: 5, squared: $computed(() => x * x) }">

<!-- Explicit: use $ parameter for the reactive context -->
<div :data="{ x: 5, squared: $computed(($) => $.x * $.x) }">
```

The explicit `$` parameter style can be useful when you want to be clear about which context you're accessing, especially in nested scopes.

Note: `function()` syntax is not supported by the expression parser in templates. In JavaScript code, you can use either arrow functions or `function()` with `this`.

### Performance Considerations

There are three ways to derive values in templates:

| Approach | Example | When to Use |
|----------|---------|-------------|
| Inline expression | `{{ count * 2 }}` | Simple, one-off calculations |
| Function call | `{{ getDouble() }}` | Reusable logic, complex calculations |
| Computed value | `$computed(($) => $.count * 2)` | Cached, referenced multiple times |

**Key differences:**

1. **Caching**: `$computed` stores the result. Multiple references to `{{ doubled }}` read the cached value. Function calls like `{{ getDouble() }}` run every time they're referenced.

2. **Change detection**: `$computed` only notifies observers when the result actually changes. If dependencies change but produce the same result, downstream effects are skipped.

3. **Granularity**: Each `$computed` has its own effect tracking its specific dependencies, which can be more efficient than a larger parent effect.

**Use `$computed` when:**
- The derived value is referenced multiple times
- The computation is expensive
- You want to prevent unnecessary updates when results don't change
- You need to pass the derived value to child components

**Use inline expressions or function calls when:**
- Simple, cheap one-off calculations
- Only referenced once in the template

### JavaScript API

When working with the renderer directly in JavaScript, you can use either arrow functions with `$` or traditional `function()` syntax with `this`:

```js
const { $ } = Mancha;

// Arrow function with $ parameter
$.set('doubled', $.$computed(($) => $.count * 2));

// Traditional function with this (works in JS, not in templates)
$.set('doubled', $.$computed(function() {
	return this.count * 2;
}));

// Direct property assignment (also works)
$.doubled = $.$computed(($) => $.count * 2);
```

#### TypeScript Note

The `$computed` method is typed to return `R` (the computed value type) rather than a marker object. This enables ergonomic property assignment without type casts:

```typescript
interface State { count: number; doubled: number }
const renderer = new Renderer<State>({ count: 2, doubled: 0 });

// Works without 'as any' - $computed returns type 'number'
renderer.$.doubled = renderer.$.$computed(($) => $.count * 2);
```

**Important:** At runtime, `$computed` returns a marker object that signals to the store to set up reactive tracking. The return value must be assigned to a store property - do not use it directly as a value.

## Observer Cleanup

`mancha` automatically manages observer cleanup to prevent memory leaks. When subrenderers are removed from the DOM (e.g., via `:for` item removal or `:html` content replacement), their observers are lazily cleaned up during the next notification cycle.

### Automatic Cleanup

For most use cases, you don't need to do anything—cleanup happens automatically:

```html
<ul :for="item in items">
	<li>{{ item.name }}</li>
</ul>
```

When items are removed from the array, the corresponding `<li>` elements are removed from the DOM, and their observers are cleaned up the next time any observer is notified.

### Manual Cleanup with dispose()

For advanced use cases where you're managing renderers programmatically, you can explicitly dispose of a store to clear all its observers:

```js
const subrenderer = document.querySelector("p").renderer;

// Clear all observers from this store to free memory.
subrenderer.dispose();
```

This is useful when:
- You're replacing large sections of dynamically-generated content
- You're managing renderer lifecycles manually outside the DOM
- You want to ensure immediate cleanup rather than waiting for lazy cleanup

**Note:** The root renderer's observers are never automatically cleaned up—only subrenderers (stores with a `$parent`) are subject to lazy cleanup. For the root renderer, use `dispose()` explicitly if needed.

## URL Query Parameter Binding

`mancha` provides a convenient way to establish a two-way binding between the state of your application and the URL query parameters. This is useful for preserving state across page reloads and for sharing links that restore the application to a specific state.

This feature is enabled automatically. When a renderer is mounted to a DOM element, any variable in its store prefixed with `$$` will be automatically synchronized with the URL query parameters.

- **Store to URL**: When you set a variable like `$.$$page = 2` (where `$` is the renderer's reactive proxy), the URL will be updated to `/?page=2`. If you set the value to a falsy value (e.g., `null`, `undefined`, `false`, `0`, or `''`), the parameter will be removed from the URL.

- **URL to Store**: When the page loads or the user navigates using the browser's back/forward buttons, the store is automatically updated from the current URL's query parameters. For example, if the URL is `/?search=mancha`, the store variable `$$search` will be set to `"mancha"`.

This allows you to react to URL changes declaratively within your components:

```html
<body :data="{ $$search: '' }">
	<input type="text" :bind="$$search" placeholder="Search..." />
	<div :show="$$search">Searching for: {{ $$search }}</div>
</body>
<script type="module">
	import { Mancha } from "//unpkg.com/mancha";
	await Mancha.mount(document.body);
</script>
```

### Using Defaults Safely

When initializing `$$` variables in `:data`, it is important to check if the variable is already defined (e.g. from the URL) to avoid checking overwriting the user's deep link with a hardcoded default. Use the nullish coalescing operator (`??`) to provide a default only when the parameter is missing.

```html
<body :data="{ $$search: $$search ?? '' }">
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

In this example:
1. **On Load**: If the URL is `?search=hello`, `$$search` will be `"hello"` initially. The `:data` expression `$$search ?? ''` evaluates to `"hello"`, preserving the URL value.
2. **On Load (No Params)**: If the URL is empty, `$$search` is `undefined`. The expression evaluates to `''`, setting the default.
3. **Reactivity**: As you type in the input, `$$search` updates, and the browser URL automatically changes to match (e.g., `?search=your-text`).
