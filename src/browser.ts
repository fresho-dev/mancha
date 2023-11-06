import * as Mancha from "./web.js";

(self as any)["Mancha"] = Mancha;

if (self.document?.currentScript?.hasAttribute("init")) {
  const vars = JSON.parse(self.document.currentScript.dataset["vars"] || "{}");
  const fsroot = self.location.href.split("/").slice(0, -1).join("/") + "/";
  const attributes = Array.from(self.document.currentScript?.attributes || []).reduce(
    (dict, attr) => Object.assign(dict, { [attr.name]: attr.value }),
    {} as { [key: string]: string }
  );
  const targets = attributes["target"]?.split(",") || ["body"];
  const renderings = targets.map(async (target: string) => {
    const node = (self.document as any)[target] as Element;
    node.innerHTML = await Mancha.renderContent(node.innerHTML, vars, fsroot);
  });

  Promise.all(renderings).then(() => {
    if (attributes["onrender"]) {
      eval(attributes["onrender"]);
    }
    dispatchEvent(new Event("mancha-render", { bubbles: true }));
  });
}

export default Mancha;
