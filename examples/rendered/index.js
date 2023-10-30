import express from "express";
import * as Mancha from "mancha";

const app = express();

app.get("/", async (req, res) => {
  const name = req.query.name || "stranger";
  const html = await Mancha.renderLocalPath("html/index.html", { name: name });
  res.set("Content-Type", "text/html");
  res.send(html);
});

app.listen(process.env.PORT || 8080);
