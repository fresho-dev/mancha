# Server-Side Rendering (SSR)

`mancha` supports multiple server-side rendering strategies, allowing you to preprocess and render your templates on the server before sending them to the client.

## Compile Time SSR

To use `mancha` on the server at compile time, you can use the `npx mancha` command. For example, if this is your project structure:

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

For a more complete example, see [examples/compiled](../examples/compiled).

## On Demand SSR

You can also use `mancha` as part of your server's request handling. Assuming a similar folder structure as described in the previous section, the following `express` node server would render the HTML code on demand for each incoming request:

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

For a more complete example, see [examples/express](../examples/express).

## Web Worker Runtime SSR

For servers hosted as worker runtimes, such as `Cloudflare Workers`, you will need to import a stripped down version of `mancha` that does not have the ability to read local files.

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

To meet the size requirements of popular worker runtimes, the worker version of `mancha` uses `htmlparser2` instead of `jsdom` for the underlying HTML and DOM manipulation. This keeps the footprint of `mancha` and its dependencies under 100kb.

For a more complete example, see [examples/wrangler](../examples/wrangler).
