# Quick Start

With `mancha`, it's easier than ever to create simple web apps that require no server-side rendering or build tools. Once the complexity of your project grows, you can add those things as needed.

To get started, simply add this to your HTML head attribute:

```html
<script src="//unpkg.com/mancha" css="utils" init></script>
```

The `init` attribute automatically hides content until rendering is complete, preventing users from seeing raw template syntax. For advanced options like fade-in animations, see [Initialization](./02_initialization.md).

## Basic Form

After importing `Mancha`, you can take advantage of reactivity and tailwind-compatible CSS styling. For a full list of supported CSS utilities and minimal styles, see the [CSS Documentation](./05_css.md).

For example, a basic form might look like this:

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

In the code above, the `:on:submit` tag simply prints 'submitted' to the console. Note that `Mancha` automatically prevents the form submission from refreshing the page by calling `event.preventDefault()`.

To provide more complex handlers, you can define callbacks as a function:

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

If you want more control over the initialization lifecycle, you can remove the `init` attribute from the `<script>` tag that imports `Mancha`, and explicitly call the `mount()` function:

```html
<script src="//unpkg.com/mancha" css="utils"></script>

<body>
	<form class="flex flex-col max-w-md p-4 bg-white rounded-lg" :on:submit="handleForm($event)">
		<!-- ... (content omitted for brevity) ... -->
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

## Next Steps

Now that you've seen the basics, explore the full capabilities of `mancha`:

- **[Syntax](./01_syntax.md)**: Learn about all the attributes (`:data`, `:for`, `:if`, etc.) and the expression language.
- **[Initialization](./02_initialization.md)**: Script tag options, ESM API, cloaking, and callbacks.
- **[Reactivity](./03_reactivity.md)**: Dive deep into variable scoping and URL binding.
- **[Components](./04_components.md)**: Build reusable components with `<include>`, `<template>`, and `:render`.
- **[CSS](./05_css.md)**: Explore the built-in utility classes.
- **[Server-Side Rendering](./06_ssr.md)**: Render templates on the server or in workers.
- **[TypeScript](./07_typescript.md)**: Use TypeScript for type-safe state and template checking.
- **[Testing](./08_testing.md)**: Test your components with JSDOM.
