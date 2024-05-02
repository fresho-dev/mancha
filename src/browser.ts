import { datasetAttributes, IRenderer } from "./core";

class RendererImpl extends IRenderer {
  parseDocumentFragment(content: string): DocumentFragment {
    return new DOMParser().parseFromString(content, "text/html") as any as DocumentFragment;
  }
  serializeDocumentFragment(fragment: DocumentFragment): string {
    return new XMLSerializer().serializeToString(fragment);
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
    node.replaceWith(await Mancha.renderDocument(node as unknown as DocumentFragment, vars));
  });

  Promise.all(renderings).then(() => {
    if (attributes["onrender"]) {
      eval(attributes["onrender"]);
    }
    dispatchEvent(new Event("mancha-render", { bubbles: true }));
  });
}

export default Mancha;
