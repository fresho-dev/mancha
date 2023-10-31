import { WorkerRouter } from "@worker-tools/router";
import * as Mancha from "mancha/dist/web";

const HTML_ROOT = "https://fresho-dev.github.io/mancha/examples/rendered/html";

const router = new WorkerRouter();

router.get("/", async (req) => {
  const params = new URL(req.url).searchParams;
  const name = params.get("name") || "stranger";
  const html = await Mancha.renderRemotePath(`${HTML_ROOT}/index.html`, { name: name });
  return new Response(html, { headers: { "Content-Type": "text/html" } });
});

export default router;
