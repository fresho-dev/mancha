# mancha

`mancha` is an HTML rendering library. It can work as a command-line tool, imported as a Javascript
function, or as a `Gulp` plugin.

## Examples

Here are some of the things you can use `mancha` for.

### Replace simple variables using `{{ value }}` format

index.html:

```html
<span>Hello {{ name }}</span>
```

Command:

```bash
npx mancha --input="./index.html" --vars='{"name": "World"}'
```

Result:

```html
<div>Hello World</div>
```

### Include files from a relative path using the `<include>` tag

hello-name.html:

```html
<span>Hello {{ name }}</span>
```

index.html:

```html
<div>
  <include src="./hello-world.html" data-name="World"></include>
</div>
```

Command:

```bash
npx mancha --input="./index.html"
```

Result:

```html
<div>
  <span>Hello World</span>
</div>
```

## Usage

### Client Side Rendering (CSR)

To use `mancha` on the client (browser), use the `mancha.js` bundled file available via `unpkg`.

```html
<body>
  <span>Hello, {{ name }}!</span>
</body>

<script src="//unpkg.com/mancha" data-name="John" target="body" init></script>
```

Script tag attributes:

- `init`: whether to automatically render upon script load
- `data-name`: dataset atribute, where `data-{{key}}` will be replaced with the attribute's value
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
import { renderLocalPath } from "mancha";
import vars from "./vars.json";

const app = express();

app.get("/", async (req, res) => {
  const html = await renderLocalPath("src/index.html", vars);
  res.set("Content-Type", "text/html");
  res.send(html);
});

app.listen(process.env.PORT || 8080);
```

For a more complete example, see [examples/rendered](./examples/rendered).

### Web Worker Runtime Server Side Rendering (SSR)

For servers hosted as worker runtimes, such as `Cloudflare Workers`, you will need to import a
stripped down version of `mancha` that does not have the ability to read local files. Any HTML files
will need to be separately hosted by a static server, although you can also generate strings
containing HTML on demand.

```js
import { renderRemotePath } from "mancha/dist/web"

const VARS = {...};
const HTML_ROOT = "https://example.com/html";

self.addEventListener('fetch', async event => {
  const content = await renderRemotePath(`${HTML_ROOT}/index.html`, VARS);
  event.respondWith(new Response(content, { headers: {"Content-Type": "text/html"} }))
});
```

For a more complete example, see [examples/wrangler](./examples/wrangler).

## Compile Time `gulpfile` Scripts

To use `mancha` in your `gulpfile`, you can do the following:

```js
import { mancha } from "mancha/dist/gulp";
gulp.src(...).pipe(mancha({"myvar": "myval"})).pipe(...)
```

The first argument consists of a dictionary of `<key, value>` pairs of literal string replacements.
`key` will become `{{ key }}` before replacing it with `value` in the processed files. For example,
if we passed `{"name": "World"}` as the argument:

Source:

```html
<div>Hello {{ name }}</div>
```

Result:

```html
<div>Hello World</div>
```
