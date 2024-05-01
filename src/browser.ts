import { datasetAttributes, IRenderer } from "./core";

class RendererImpl extends IRenderer {
  parseDocument(content: string): Document {
    return new DOMParser().parseFromString(content, "text/html");
  }
  serializeDocument(document: Document): string {
    return new XMLSerializer().serializeToString(document);
  }
  replaceNodeWith(node: Node, children: Node[]): void {
    (node as Element).replaceWith(...children);
  }
}

const Mancha = new RendererImpl();
(self as any)["Mancha"] = Mancha;

if (self.document?.currentScript?.hasAttribute("init")) {
  const vars = datasetAttributes(self.document.currentScript.attributes);
  const attributes = Array.from(self.document.currentScript?.attributes || []).reduce(
    (dict, attr) => Object.assign(dict, { [attr.name]: attr.value }),
    {} as { [key: string]: string }
  );
  const targets = attributes["target"]?.split(",") || ["body"];
  const renderings = targets.map(async (target: string) => {
    const node = (self.document as any)[target] as Element;
    node.innerHTML = await Mancha.renderContent(node.innerHTML, vars);
  });

  Promise.all(renderings).then(() => {
    if (attributes["onrender"]) {
      eval(attributes["onrender"]);
    }
    dispatchEvent(new Event("mancha-render", { bubbles: true }));
  });
}

export default Mancha;
