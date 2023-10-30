import * as Mancha from "../index.js";

((window as any) || {})["Mancha"] = Mancha;

if (document.currentScript?.getAttribute("init") !== undefined) {
  const vars = JSON.parse(document.currentScript.dataset["vars"] || "{}");
  const fsroot = window.location.href.split("/").slice(0, -1).join("/") + "/";
  Mancha.renderContent(document.body.innerHTML, vars, fsroot).then((content) => {
    document.body.innerHTML = content;
  });
}
