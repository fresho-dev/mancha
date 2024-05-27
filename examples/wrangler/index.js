import { Router } from "itty-router";
import { Renderer } from "mancha/dist/worker";

const HTML_ROOT = "https://fresho-dev.github.io/mancha/examples/express/html";

const router = Router();

router.get("/", async (req) => {
  const name = req.query.name || "Stranger";
  const renderer = new Renderer({ name });
  const fragment = await renderer.preprocessRemote(`${HTML_ROOT}/index.html`);
  const html = renderer.serializeHTML(await renderer.renderNode(fragment));
  return new Response(html, { headers: { "Content-Type": "text/html" } });
});

export default {
  fetch: (req, env, ctx) => router.handle(req, env, ctx),
};
