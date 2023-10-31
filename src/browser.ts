import * as Mancha from "./web.js";

(self as any)["Mancha"] = Mancha;

if (self.document?.currentScript?.getAttribute("init") !== undefined) {
  const vars = JSON.parse(self.document.currentScript.dataset["vars"] || "{}");
  const fsroot = self.location.href.split("/").slice(0, -1).join("/") + "/";
  const targets = self.document.currentScript?.getAttribute("target")?.split(",") || ["body"];
  targets.forEach(async (target) => {
    const node = (self.document as any)[target] as Element;
    node.innerHTML = await Mancha.renderContent(node.innerHTML, vars, fsroot);
  });
}

export default Mancha;
