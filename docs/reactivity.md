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
