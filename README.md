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

`mancha` is not the smallest option. It is the one that does all of it in a
single file: drop it in a script tag to prototype, then keep the same templates
when you move to a bundler or render them on the server.

| Library                | Size (brotli) | Script tag | Custom tags | Server rendering | CSS utilities |
| ---------------------- | ------------: | ---------- | ----------- | ---------------- | ------------- |
| [petite-vue][pv] 0.4.1 |       6,513 B | ✔️         | ❌          | ❌               | ❌            |
| [htmx][hx] 2.0.10      |      14,996 B | ✔️         | ❌          | ❌               | ❌            |
| [Svelte][sv] 5.56.9    |      15,106 B | ❌         | ✔️          | ✔️               | ❌            |
| [Alpine.js][al] 3.16.1 |      15,400 B | ✔️         | ❌          | ❌               | ❌            |
| **mancha 0.24.2**      |  **19,852 B** | ✔️         | ✔️          | ✔️               | ✔️            |
| [React][re] 19.2.8     |      52,002 B | ❌         | ✔️          | ✔️               | ❌            |
| [Vue][vu] 3.5.41       |      54,171 B | ✔️         | ✔️          | ✔️               | ❌            |

Sizes are the brotli-compressed bytes of the file you download, at the version
shown. Run `npm run compare:sizes` to re-measure them. Svelte and React ship no
drop-in build — React 19 dropped its UMD build entirely — so their sizes come
from bundling a minimal app instead.

[al]: https://alpinejs.dev
[hx]: https://htmx.org
[pv]: https://github.com/vuejs/petite-vue
[re]: https://react.dev
[sv]: https://svelte.dev
[vu]: https://vuejs.org

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
- **[Performance](./docs/09_performance.md)**: Performance monitoring and optimization.
- **[Security](./docs/10_security.md)**: What rendering a template grants it, and where the trust boundary is.

## AI Agents

If you are an AI agent building with `mancha`, you can dump all the documentation in a single concatenated output by running:

```bash
npx mancha docs
```

## Dependencies

The browser bundle contains no external dependencies. The unbundled version can use `htmlparser2`, which is compatible with web workers, or `jsdom`.
