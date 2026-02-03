# Components & Preprocessing

As part of the rendering lifecycle, `mancha` first preprocesses the HTML. This includes resolving includes and registering custom components.

## Includes

You can mix and match content by processing `<include>` tags:

```html
<!-- ./button.tpl.html -->
<button>Click Me</button>

<!-- ./index.html -->
<div>
	<include src="button.tpl.html"></include>
</div>

<!-- Result after rendering `index.html`. -->
<div>
	<button>Click Me</button>
</div>
```

### Attribute Forwarding

Attributes placed on the `<include>` tag are automatically copied to the root element of the included content. This is useful for styling and accessibility:

```html
<!-- ./icons/chart.svg -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
	<path d="M3 3v18h18" />
</svg>

<!-- ./index.html -->
<button>
	<include src="./icons/chart.svg" class="w-4 h-4 text-blue-500" aria-hidden="true"></include>
	View Chart
</button>

<!-- Result after rendering -->
<button>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-blue-500" aria-hidden="true">
		<path d="M3 3v18h18" />
	</svg>
	View Chart
</button>
```

This pattern works well for SVG icons that use `stroke="currentColor"` or `fill="currentColor"`, allowing you to control the icon color via CSS utility classes like `text-blue-500`.

### Remote Includes

You can include content from remote URLs:

```html
<include src="https://unpkg.com/lucide-static/icons/home.svg" class="w-4 h-4"></include>
```

### Dynamic Icons with SVG Sprites

For reusable icon components where the icon name is determined at usage time, use SVG sprites with a custom component:

```html
<!-- Register an icon component that references a sprite sheet -->
<template is="icon">
	<svg class="w-4 h-4" :class="class">
		<use :attr:href="'./icons/sprite.svg#' + name"></use>
	</svg>
</template>

<!-- Use icons by name, passing the icon name via :data -->
<icon :data="{ name: 'home' }" class="text-blue-500"></icon>
<icon :data="{ name: 'settings' }" class="text-gray-400"></icon>
<icon :data="{ name: 'user' }" class="text-green-500"></icon>
```

The `:data` attribute passes variables to the component's scope, making `name` available in expressions like `:attr:href`.

SVG sprite sheets bundle multiple icons into a single file, with each icon defined as a `<symbol>`:

```html
<!-- ./icons/sprite.svg -->
<svg xmlns="http://www.w3.org/2000/svg">
	<symbol id="home" viewBox="0 0 24 24" fill="none" stroke="currentColor">
		<path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3" />
	</symbol>
	<symbol id="settings" viewBox="0 0 24 24" fill="none" stroke="currentColor">
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06..." />
	</symbol>
</svg>
```

This approach loads the sprite sheet once and references individual icons by their `id`, making it efficient for pages with many icons.

## Custom Components

`mancha` supports custom components, which can be defined using the template tag.

```html
<!-- Use <template is="my-component-name"> to register a component. -->
<template is="my-red-button">
	<button style="background-color: red;">
		<slot></slot>
	</button>
</template>

<!-- Any node traversed after registration can use the component. -->
<my-red-button :on:click="console.log('clicked')">
	<!-- The contents within will replace the `<slot></slot>` tag. -->
	Click Me
</my-red-button>
```

### Component Registries

The components can live in their own, separate files. A common pattern is to separate each component into their own file, and import them all in a single "roll-up" file.

```
src/
├─ components/
|  ├─ footer.tpl.html
|  ├─ my-red-button.tpl.html
|  ├─ my-custom-component.tpl.html
├─ index.html
```

Instead of importing the components individually, you can create a single file `registry.tpl.html` which imports all the custom components:

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

## Initialization with `:render`

The `:render` attribute provides **element-level initialization** by linking any HTML element to a JavaScript ES module. This is useful when you need to initialize third-party libraries (like charts, maps, or video players) on specific elements.

> [!TIP]
> `:render` is for **element-level** initialization, not page-level initialization. For page-level initialization, use the Script Tag with `init` or `initMancha()`. See [Initialization](./02_initialization.md) for a complete comparison of all initialization methods.

```html
<canvas :render="./chart-init.js"></canvas>
```

The module's default export is called with the element and renderer:

```js
// chart-init.js
export default function (elem, renderer) {
	new Chart(elem, { type: "bar" });
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

Relative paths like `./chart-widget.js` are automatically resolved based on where the template is defined (`/components/`), not where the component is used.

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

 during server-side rendering (SSR), the `:render` attribute's path is resolved but the JavaScript module is not executed. The module is only executed when the HTML is hydrated in the browser, making this feature fully compatible with SSR workflows.

### Setting Undefined Variables

A powerful pattern is using `:render` to set variables that are already referenced in your template but not pre-defined.

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

You can set multiple variables concurrently with `Promise.all([renderer.set("a", 1), renderer.set("b", 2)])`.
