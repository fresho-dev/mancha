import * as Mancha from "../index.js";

(self as any)["Mancha"] = Mancha;

if (self.document?.currentScript?.getAttribute("init") !== undefined) {
  const vars = JSON.parse(self.document.currentScript.dataset["vars"] || "{}");
  const fsroot = self.location.href.split("/").slice(0, -1).join("/") + "/";
  Mancha.renderContent(self.document.body.innerHTML, vars, fsroot).then((content) => {
    self.document.body.innerHTML = content;
  });
}

export default Mancha;
