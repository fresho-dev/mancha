# mancha

`mancha` is a simple HTML templating and rendering library for simple people. It works on the
browser or the server. It can be used as a command-line tool, imported as a Javascript module, or as
a plugin for [`Gulp`](https://gulpjs.com).

Here's a small sample of the things that you can do with `mancha`:

```html
<!-- Use the bundled file from `unkpg`. -->
<script src="//unpkg.com/mancha" target="main" init></script>

<!-- Scoped variables using the `:data` attribute. -->
<main :data="{count: 0, name: 'Stranger'}">
  <!-- Custom HTML tag element registration. -->
  <template is="counter">
    <div>
      <slot></slot>
      <button @click="count++">Counter: {{ count }}</button>
    </div>
  </template>

  <!-- Custom HTML tag element usage. -->
  <counter>Click me:</counter>

  <!-- Reactive data binding. -->
  <p>Enter your name: <input type="text" :bind="name" /></p>
  <p>Hello, {{ name }}!</p>

  <!-- Include HTML partials. -->
  <include src="html/partial/footer.tpl.html"></include>
</main>
```

## Why another front-end Javascript library?

There are plenty of other front-end Javascript libraries, many of them of great quality, including:

- [Google's Svelte](https://svelte.dev)
- [Meta's React](https://react.dev)
- [Vue.js](https://vuejs.org) and [petite-vue](https://github.com/vuejs/petite-vue)
- [Alpine.js](https://alpinejs.dev)

None of them have all the key features that make `mancha` unique:

| Feature               | mancha | Svelte | React.js | Vue.js | petite-vue | Alpine.js |
| --------------------- | ------ | ------ | -------- | ------ | ---------- | --------- |
| Simple to learn       | ✔️     | ❌     | ❌       | ❌     | ✔️         | ✔️        |
| < 10kb compressed     | ✔️     | ❌     | ❌       | ❌     | ✔️         | ❌        |
| Custom web components | ✔️     | ✔️     | ✔️       | ✔️     | ❌         | ❌        |
| Client-side rendering | ✔️     | ❌     | ❌       | ✔️     | ✔️         | ✔️        |
| Server-side rendering | ✔️     | ✔️     | ✔️       | ✔️     | ❌         | ❌        |

`mancha` is great for:

- **prototyping**, just plop a script tag in your HTML and off you go
- **testing**, individual components can be rendered and tested outside the browser
- **progressive enhancement**, from simple templating and basic reactivity to a full-blown app

The main benefit of using `mancha` is that it allows you to compartmentalize the complexity of
front-end development. Whether you decide to break up your app into reusable partial sections via
`<include>` or create custom web components, you can write HTML as if your mother was watching.

`mancha` implements its own reactivity engine, so the bundled browser module contains no external
dependencies.

## Preprocessing

As part of the rendering lifecycle, `mancha` first preprocesses the HTML. The two main stages of
preprocessing consist of:

- Resolution of `<include>` tags

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

- Registration and resolution of all custom web components

  ```html
  <!-- Use <template is="my-component-name"> to register a component. -->
  <template is="my-red-button">
    <button style="background-color: red;">
      <slot></slot>
    </button>
  </template>

  <!-- Any node traversed after registration can use the component. -->
  <my-red-button @click="console.log('clicked')">
    <!-- The contents within will replace the `<slot></slot>` tag. -->
    Click Me
  </my-red-button>
  ```

## Rendering

Once the HTML has been preprocessed, it is rendered by traversing every node in the DOM and applying
a series of plugins. Each plugin is only applied if specific conditions are met such as the HTML
element tag or attributes match a specific criteria. Here's the list of attributes handled:

- `:data` provides scoped variables to all subnodes
  ```html
  <div :data="{name: 'Stranger'}"></div>
  ```
- `:for` clones the node and repeats it
  ```html
  <div :for="item in ['a', 'b', 'c']">{{ item }}</div>
  ```
- `$text` sets the `textContent` value of a node
  ```html
  <div :data="{foo: 'bar'}" $text="foo"></div>
  ```
- `$html` sets the `innerHTML` value of a node
  ```html
  <div $html="<span>Hello World</span>"></div>
  ```
- `:show` toggles `$elem.style.display` to `none`
  ```html
  <div :data="{foo: false}" :show="foo"></div>
  ```
- `@watch` executes an expression anytime its dependencies change
  ```html
  <div :data="{foo: 'bar'}" @watch="console.log('foo changed:', foo)"></div>
  ```
- `:bind` binds (two-way) a variable to the `value` or `checked` property of the element.
  ```html
  <div :data="{name: 'Stranger'}">
    <input type="text" :bind="name" />
  </div>
  ```
- `${prop}` binds (one-way) the node property `prop` with the given expression
  ```html
  <div :data="{foo: false}">
    <input type="submit" $disabled="foo" />
  </div>
  ```
- `:{attr}` binds (one-way) the node attribute `attr` with the given expression
  ```html
  <div :data="{foo: 'bar'}">
    <input type="text" :placeholder="foo" />
  </div>
  ```
- `@{event}` adds an event listener for `event` to the node
  ```html
  <button @click="console.log('clicked')"></button>
  ```
- `{{ value }}` replaces `value` in text nodes
  ```html
  <button :data="{label: 'Click Me'}">{{ label }}</button>
  ```

## Usage

### Client Side Rendering (CSR)

To use `mancha` on the client (browser), use the `mancha` bundled file available via `unpkg`.

```html
<body :data="{ name: 'John' }">
  <span>Hello, {{ name }}!</span>
</body>

<script src="//unpkg.com/mancha" target="body" defer init></script>
```

Script tag attributes:

- `init`: whether to automatically render upon script load
- `target`: comma-separated document elements to render e.g. "body" or "head,body" (defaults to "body")

For a more complete example, see [examples/browser](./examples/browser).

### Compile Time Server Side Rendering (SSR)

To use `mancha` on the server at compile time, you can use the `npx mancha` command. For example,
if this is your project structure:

```
src/
├─ components/
|  ├─ main.tpl.html
|  ├─ footer.tpl.html
├─ index.html
├─ vars.json
```

You can run the following command to compile the site into a `public` folder:

```bash
npx mancha --input="./src/index.html" --vars="$(cat vars.json)" --output="./public"
```

For a more complete example, see [examples/compiled](./examples/compiled).

### On Demand Server Side Rendering (SSR)

You can also use `mancha` as part of your server's request handling. Assuming a similar folder
structure as described in the previous section, the following `express` node server would render
the HTML code on demand for each incoming request:

```js
import express from "express";
import { Renderer } from "mancha";
import vars from "./vars.json";

const app = express();

app.get("/", async (req, res) => {
  const name = req.query.name || "Stranger";
  // Instantiate a new renderer.
  const renderer = new Renderer({ name, ...vars });
  // Preprocess input HTML from a local file path.
  const fragment = await renderer.preprocessLocal("html/index.html");
  // Render and serialize output HTML.
  const html = renderer.serializeHTML(await renderer.renderNode(fragment));
  // Send it to the client.
  res.set("Content-Type", "text/html");
  res.send(html);
});

app.listen(process.env.PORT || 8080);
```

For a more complete example, see [examples/express](./examples/express).

### Web Worker Runtime Server Side Rendering (SSR)

For servers hosted as worker runtimes, such as `Cloudflare Workers`, you will need to import a
stripped down version of `mancha` that does not have the ability to read local files or evaluate
expressions. The contents of any `{{ value }}` must be an existing variable in the renderer
instance.

```js
import { Renderer } from "mancha/dist/worker";
import htmlIndex from "./index.html";
import vars from "./vars.json";

self.addEventListener("fetch", async (event) => {
  // Instantiate a new renderer.
  const renderer = new Renderer({ ...vars });
  // Preprocess input HTML from a string.
  const fragment = await renderer.preprocessString(htmlIndex);
  // Render and serialize output HTML.
  const html = renderer.serializeHTML(await renderer.renderNode(fragment));
  // Send it to the client.
  event.respondWith(new Response(content, { headers: { "Content-Type": "text/html" } }));
});
```

To meet the size requirements of popular worker runtimes, the worker version of `mancha` uses
`htmlparser2` instead of `jsdom` for the underlying HTML and DOM manipulation. This keeps the
footprint of `mancha` under 100kb.

For a more complete example, see [examples/wrangler](./examples/wrangler).

## Compile Time `gulpfile` Plugin

To use `mancha` in your `gulpfile`, you can do the following:

```js
import GulpClient from "gulp";
import { mancha } from "mancha/dist/gulp";
import vars from "./vars.json";

GulpClient.task("build", function () {
  return (
    GulpClient
      // Inlcude all HTML files, but exclude all partials (ending in .tpl.html).
      .src(["src/**/*.html", "!src/**/*.tpl/html"])
      // Render the HTML content using `mancha`.
      .pipe(mancha(vars))
      // Pipe the output to the destination folder.
      .pipe(GulpClient.dest("public"))
  );
});
```
