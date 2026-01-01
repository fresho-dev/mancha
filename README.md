# mancha

`mancha` is a simple HTML templating and reactivity library for simple people. It works on the browser or the server. It can be used as a command-line tool, or imported as a Javascript module.

Here's a small sample of the things that you can do with `mancha`:

```html
<!-- Use the bundled file from `unkpg` and load a drop-in replacement for Tailwind CSS. -->
<script src="//unpkg.com/mancha" target="main" css="utils" init></script>

<!-- Scoped variables using the `:data` attribute. -->
<main class="p-4" :data="{count: 0, name: 'Stranger'}">
	<!-- Custom HTML tag element registration. -->
	<template is="counter">
		<div>
			<slot></slot>
			<button :on:click="count = count + 1">Counter: {{ count }}</button>
		</div>
	</template>

	<!-- Custom HTML tag element usage. -->
	<counter class="my-2">Click me:</counter>

	<!-- Reactive data binding. -->
	<p>Enter your name: <input type="text" :bind="name" /></p>
	<p>Hello, <span class="underline">{{ name }}</span>!</p>

	<!-- Include HTML partials. -->
	<footer class="text-xs">
		<include src="html/partial/footer.tpl.html"></include>
	</footer>
</main>
```

## Why another front-end Javascript library?

`mancha` is great for:

- **prototyping**, just plop a script tag in your HTML and off you go
- **testing**, individual components can be rendered and tested outside the browser
- **progressive enhancement**, from simple templating and basic reactivity to a full-blown app

| Feature               | mancha | Svelte | React.js | Vue.js | petite-vue | Alpine.js |
| --------------------- | ------ | ------ | -------- | ------ | ---------- | --------- |
| Simple to learn       | ✔️     | ❌     | ❌       | ❌     | ✔️         | ✔️        |
| < 16kb compressed     | ✔️     | ✔️     | ❌       | ❌     | ✔️         | ❌        |
| Custom web components | ✔️     | ✔️     | ✔️       | ✔️     | ❌         | ❌        |
| Client-side rendering | ✔️     | ❌     | ❌       | ✔️     | ✔️         | ✔️        |
| Server-side rendering | ✔️     | ✔️     | ✔️       | ✔️     | ❌         | ❌        |

## Documentation

- **[Quick Start](./docs/00_quickstart.md)**: Get up and running in minutes.
- **[Syntax](./docs/01_syntax.md)**: Reference for attributes and expressions.
- **[Initialization](./docs/02_initialization.md)**: Script tag options, ESM API, cloaking, and callbacks.
- **[Reactivity](./docs/03_reactivity.md)**: How variables, scoping, and URL binding work.
- **[Components](./docs/04_components.md)**: Creating reusable components and includes.
- **[CSS](./docs/05_css.md)**: Built-in CSS utilities.
- **[Server-Side Rendering](./docs/06_ssr.md)**: Using Mancha on the server (Node, Workers).
- **[TypeScript](./docs/07_typescript.md)**: Type safety and checking.
- **[Testing](./docs/08_testing.md)**: Testing your UI.

## AI Agents

If you are an AI agent building with `mancha`, you can dump all the documentation in a single concatenated output by running:

```bash
npx mancha docs
```

## Dependencies

The browser bundle contains no external dependencies. The unbundled version can use `htmlparser2`, which is compatible with web workers, or `jsdom`.
