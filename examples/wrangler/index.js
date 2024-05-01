import { Router } from "itty-router";
import { Mancha } from "mancha/dist/worker";

const HTML_ROOT = "https://fresho-dev.github.io/mancha/examples/rendered/html";

const router = Router();

router.get("/", async (req) => {
  const params = new URL(req.url).searchParams;
  const name = params.get("name") || "Stranger";
  const html = await Mancha.renderRemotePath(`${HTML_ROOT}/index.html`, { name: name });
  return new Response(html, { headers: { "Content-Type": "text/html" } });
});

export default {
  fetch: (req, env, ctx) => router.handle(req, env, ctx),
};
