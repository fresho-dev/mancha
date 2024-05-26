import express from "express";
import { RendererImpl } from "mancha";

const app = express();

app.get("/", async (req, res) => {
  const name = req.query.name || "Stranger";
  const renderer = new RendererImpl({ name });
  const fragment = await renderer.preprocessLocal("html/index.html");
  const html = renderer.serializeHTML(await renderer.renderNode(fragment));
  res.set("Content-Type", "text/html");
  res.send(html);
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server started on port ${port}`));
