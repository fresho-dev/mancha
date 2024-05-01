import express from "express";
import { Mancha } from "mancha";

const app = express();

app.get("/", async (req, res) => {
  const name = req.query.name || "Stranger";
  const html = await Mancha.renderLocalPath("html/index.html", { name: name });
  res.set("Content-Type", "text/html");
  res.send(html);
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server started on port ${port}`));
