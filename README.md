# mancha

`mancha` is a simple HTML templating and reactivity library for simple people. It works on the
browser or the server. It can be used as a command-line tool, or imported as a Javascript module.

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

There are plenty of other front-end Javascript libraries, many of them of great quality, including:

- [Google's Svelte](https://svelte.dev)
- [Meta's React](https://react.dev)
- [Vue.js](https://vuejs.org) and [petite-vue](https://github.com/vuejs/petite-vue)
- [Alpine.js](https://alpinejs.dev)

None of them have all the key features that make `mancha` unique:

| Feature               | mancha | Svelte | React.js | Vue.js | petite-vue | Alpine.js |
| --------------------- | ------ | ------ | -------- | ------ | ---------- | --------- |
| Simple to learn       | ✔️     | ❌     | ❌       | ❌     | ✔️         | ✔️        |
| < 15kb compressed     | ✔️     | ❌     | ❌       | ❌     | ✔️         | ❌        |
| Custom web components | ✔️     | ✔️     | ✔️       | ✔️     | ❌         | ❌        |
| Client-side rendering | ✔️     | ❌     | ❌       | ✔️     | ✔️         | ✔️        |
| Server-side rendering | ✔️     | ✔️     | ✔️       | ✔️     | ❌         | ❌        |

`mancha` is great for:

- **prototyping**, just plop a script tag in your HTML and off you go
- **testing**, individual components can be rendered and tested outside the browser
- **progressive enhancement**, from simple templating and basic reactivity to a full-blown app

A core benefit of using `mancha` is that it allows you to compartmentalize the complexity of
front-end development. Whether you decide to break up your app into reusable partial sections via
`<include>` or create custom web components, you can write HTML as if your mother was watching.

`mancha` implements its own reactivity engine, so the bundled browser module contains no external
dependencies with the exception of [`jexpr`][jexpr] for safe expression evaluation (see the
[dependencies section](#dependencies)).

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
  <my-red-button :on:click="console.log('clicked')">
    <!-- The contents within will replace the `<slot></slot>` tag. -->
    Click Me
  </my-red-button>
  ```

## Rendering

Once the HTML has been preprocessed, it is rendered by traversing every node in the DOM and applying
a series of plugins. Each plugin is only applied if specific conditions are met such as the HTML
element tag or attributes match a specific criteria. Here's the list of attributes handled:

- `:data` provides scoped variables to all subnodes, evaluated using `jexpr`
  ```html
  <div :data="{ name: 'Stranger' }"></div>
  ```
- `:for` clones the node and repeats it
  ```html
  <div :for="item in ['a', 'b', 'c']">{{ item }}</div>
  ```
- `:text` sets the `textContent` value of a node
  ```html
  <div :data="{foo: 'bar'}" :text="foo"></div>
  ```
- `:html` sets the `innerHTML` value of a node
  ```html
  <div :html="<span>Hello World</span>"></div>
  ```
- `:show` toggles `$elem.style.display` to `none`
  ```html
  <div :data="{foo: false}" :show="foo"></div>
  ```
- `:class` appends rendered text to existing class attribute
  ```html
  <span :class="error ? 'red' : 'blue'" class="text-xl">...</span>
  ```
- `:bind` binds (two-way) a variable to the `value` or `checked` property of the element.
  ```html
  <div :data="{ name: 'Stranger' }">
    <input type="text" :bind="name" />
  </div>
  ```
- `:on:{event}` adds an event listener for `event` to the node
  ```html
  <button :on:click="console.log('clicked')"></button>
  ```
- `:attr:{name}` sets the corresponding attribute for `name` in the node
  ```html
  <a :attr:href="buildUrl()"></a>
  ```
- `:prop:{name}` sets the corresponding property for (camel-case converted) `name` in the node
  ```html
  <video :prop:src="buildSrc()"></video>
  ```
- `{{ value }}` replaces `value` in text nodes
  ```html
  <button :data="{label: 'Click Me'}">{{ label }}</button>
  ```

## Evaluation

To avoid violation of Content Security Policy (CSP) that forbids the use of `eval()`, `Mancha`
evaluates all expressions using [`jexpr`][jexpr]. This means that only simple expressions are
allowed, and spaces must be used to separate different expression tokens. For example:

```html
<!-- Valid expression: string concatenation -->
<body :data="{ pos: 1 }">
  <p :text="'you are number ' + pos + ' in the queue'"></p>
</body>

<!-- Valid expression: boolean logic -->
<body :data="{ pos: 1, finished: false }">
  <p :show="pos >= 1 && !finished">you are number {{ pos }} in the queue</p>
</body>

<!-- Valid expression: ternary operators -->
<body :data="{ pos: 1 }">
  <p :text="pos % 2 == 0 ? 'even' : 'odd'"></p>
</body>

<!-- Valid expression: function calling -->
<body :data="{ pos : 1 }">
  <p :text="buildQueueMessage()"></p>
  <script>
    const { $ } = Mancha;
    $.buildQueueMessage = function () {
      return "you are number " + this.pos + " in the queue";
    };
    // Alternatively, anonymous functions without `this`:
    // $.buildQueueMessage = () => 'you are number ' + $.pos + ' in the queue';
  </script>
</body>

<!-- Valid expression: simple assignment -->
<body :data="{ pos: 1 }">
  <p :text="'you are number ' + pos + ' in the queue'"></p>
  <button :on:click="pos = pos + 1">Click to get there faster</button>
</body>

<!-- Invalid expression: missing spaces -->
<body :data="{ pos: 1 }">
  <p :text="'you are number '+pos+' in the queue'"></p>
</body>

<!-- Invalid expression: multiple statements -->
<button :on:click="console.log('yes'); answer = 'no'"></button>

<!-- Invalid expression: function definition -->
<body :data="{ foo: () => 'yes' }">
  <p :text="foo()"></p>
</body>

<!-- Invalid expression: complex assignment -->
<body :data="{ pos: 1 }">
  <p :text="'you are number ' + pos + ' in the queue'"></p>
  <button :on:click="pos++">Click to get there faster</button>
</body>
```

## Variable Scoping

Contents of the `:data` attribute are only available to subnodes in the HTML tree. This is better
illustrated with an example:

```html
<body :data="{ name: 'stranger', key: '1234' }">
  <!-- Hello, stranger -->
  <h1>Hello, {{ name }}</h1>

  <!-- undefined -->
  <span>{{ message }}</span>

  <!-- How are you, danger? The secret message is "secret" and the key is "1234" -->
  <p :data="{ name: 'danger', message: 'secret' }">
    How are you, {{ name }}? The secret message is "{{ message }}" and the key is "{{ key }}"
  </p>
</body>
```

By default, the target root element is the `body` tag. So, any variables defined in the body's
`:data` attribute are available to the main renderer.

In the example above, the variable `message` is only available to the `<p>` tag and all elements
under that tag, if any. Since the variables are not accessible via the global object, you'll need
to retrieve the renderer from the element's properties:

```js
// Explicitly render the body, so we can await it and then modify variables.
const { $ } = Mancha;
await $.mount(document.body);

// This modifies the `name` variable in all the renderer contexts.
$.name = "world";

// This has no effect in the output, because the content of the `<p>` tag is
// bound to its local variable and `message` was undefined at rendering time.
$.message = "bandit";

// We extract the subrenderer from the element's properties. Only elements
// with `:data` attribute have a `renderer` property.
const subrenderer = document.querySelector("p").renderer;

// This modifies the `message` variable only in the `<p>` tag.
subrenderer.$.message = "banana";
```

When accessing variables, `mancha` searches the current renderer first, then the parent, the
parent's parent, and so forth until the root renderer is reached. If the requested variable is not
found in the current renderer or any of the ancestor renderers, then `null` is returned:

```html
<body :data="{ name: 'stranger' }">
  <!-- Hello, stranger! -->
  <p :data="{}">Hello, {{ name }}!</p>
</body>
```

When setting a variable, there are 3 possible cases:

1. The variable has already been defined in the current renderer. Then it gets updated in the
   current renderer.
1. The variable is undefined in the current renderer but has already been defined in an ancestor
   renderer. Then it gets updated in the corresponding ancestor renderer.
1. The variable is not defined in the current renderer or any ancestor renderers. Then it is set in
   the current renderer.

NOTE: This does not apply to variables defined via `:data` attribute, which always set a new
variable for the newly created renderer.

Renderers also have a `$parent` and `$root` attributes. The `$parent` attribute references the
immediate ancestor renderer if any, or it's `null` otherwise. The `$root` attribute references the
root renderer where `mancha` was mounted, which could be a self-reference.

## Styling

Some basic styling rules are built into the library and can be optionally used. The styling
component was designed to be used in the browser, and it's enabled by adding a `css` attribute
to the `<script>` tag that loads `mancha`. The supported rulesets are:

- `basic`: inspired by [these rules](https://www.swyx.io/css-100-bytes), the full CSS can be found
  [here](./src/css_gen_basic.ts).
- `utils`: utility classes inspired by [tailwindcss](https://tailwindcss.com), the resulting CSS is
  a drop-in replacement for a subset of the classes provided by `tailwindcss` with the main
  exception of the color palette which is borrowed from
  [material design](https://www.materialpalette.com/colors).

## Usage

### Client Side Rendering (CSR)

To use `mancha` on the client (browser), use the `mancha` bundled file available via `unpkg`.

```html
<body :data="{ name: 'John' }">
  <span>Hello, {{ name }}!</span>
</body>

<script src="//unpkg.com/mancha" target="body" css="basic+utils" init></script>
```

Script tag attributes:

- `init`: whether to automatically render upon script load
- `target`: document elements separated by `+` to render e.g. "body" or "head+body" (defaults to
  "body")
- `css`: inject predefined CSS rulesets into the `<head>` element, see the
  [styling section](#styling) for more details.

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
  const fragment = await renderer.preprocessLocal("src/index.html");
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
stripped down version of `mancha` that does not have the ability to read local files.

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
footprint of `mancha` and its dependencies under 100kb.

For a more complete example, see [examples/wrangler](./examples/wrangler).

## Dependencies

The browser bundle contains a single external dependency, [`jexpr`][jexpr]. The unbundled version
can use `htmlparser2`, which is compatible with web workers, or `jsdom`.

[jexpr]: https://github.com/justinfagnani/jexpr
