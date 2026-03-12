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

## Dynamic Lists

Creating dynamic lists—where users can add or remove items—is a common requirement. `mancha` handles this efficiently using the `:for` directive and array mutations.

```html
<body :data="{ tags: ['mancha', 'reactive'], newTag: '' }">
	<div class="p-4 max-w-md mx-auto">
		<h1 class="text-xl font-bold mb-4">Tags</h1>

		<!-- Render the list of tags -->
		<div class="flex flex-wrap gap-2 mb-4">
			<template :for="tag in tags" :key="tag">
				<span class="bg-indigo-100 px-3 py-1 rounded-full">
					{{ tag }}
					<!-- Use $index to remove the specific item -->
					<button :on:click="tags.splice($index, 1)" class="ml-2 font-bold">&times;</button>
				</span>
			</template>
			<p :if="tags.length === 0" class="text-gray-500 italic">No tags yet.</p>
		</div>

		<!-- Form to add new tags -->
		<form class="flex gap-2" :on:submit.prevent="addTag()">
			<input
				type="text"
				:bind="newTag"
				placeholder="Add a tag..."
				class="flex-1 border p-2 rounded"
			/>
			<button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded">Add</button>
		</form>
	</div>

	<script>
		const { $ } = Mancha;

		$.addTag = function () {
			if (this.newTag.trim()) {
				this.tags.push(this.newTag.trim());
				this.newTag = "";
			}
		};
	</script>
</body>
```

Key concepts for dynamic lists:
- **`:key`**: Always provide a unique key when using `:for` with dynamic data. This enables "keyed reconciliation", which reuses existing DOM nodes and is significantly faster.
- **`$index`**: This special variable is automatically available inside any `:for` loop and provides the current iteration index.
- **Array Mutations**: `mancha` detects when you use standard array methods like `push()`, `pop()`, or `splice()` and automatically updates the UI.

## Next Steps

Now that you've seen the basics, explore the full capabilities of `mancha`:

- **[Syntax](./01_syntax.md)**: Learn about all the attributes (`:data`, `:for`, `:if`, etc.) and the expression language.
- **[Initialization](./02_initialization.md)**: **Start here if you're unsure which initialization method to use.** Covers Script Tag, ES Module (`initMancha`), and `:render` attribute with a decision guide.
- **[Reactivity](./03_reactivity.md)**: Dive deep into variable scoping and URL binding.
- **[Components](./04_components.md)**: Build reusable components with `<include>`, `<template>`, and `:render`.
- **[CSS](./05_css.md)**: Explore the built-in utility classes.
- **[Server-Side Rendering](./06_ssr.md)**: Render templates on the server or in workers.
- **[TypeScript](./07_typescript.md)**: Use TypeScript for type-safe state and template checking.
- **[Testing](./08_testing.md)**: Test your components with JSDOM.
