import { folderPath, IRenderer, ParserParams, RendererParams } from "./core";
import { proxify } from "./reactive";

class RendererImpl extends IRenderer {
  protected readonly fsroot: string = folderPath(self.location.href);
  parseHTML(content: string, params: ParserParams = { isRoot: false }): DocumentFragment {
    if (params.isRoot) {
      return new DOMParser().parseFromString(content, "text/html") as unknown as DocumentFragment;
    } else {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      return range.createContextualFragment(content);
    }
  }
  serializeHTML(root: Node | DocumentFragment): string {
    return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
  }
  renderLocalPath(
    fpath: string,
    params?: RendererParams & ParserParams
  ): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

const Mancha = proxify(new RendererImpl());
(self as any)["Mancha"] = Mancha;
const currentScript = self.document?.currentScript;

if (self.document?.currentScript?.hasAttribute("init")) {
  Mancha.update({ ...currentScript?.dataset });
  const debug = currentScript?.hasAttribute("debug");
  const cachePolicy = currentScript?.getAttribute("cache") as RequestCache | null;
  const targets = currentScript?.getAttribute("target")?.split(",") || ["body"];
  targets.map(async (target: string) => {
    const fragment = self.document.querySelector(target) as unknown as DocumentFragment;
    await Mancha.mount(fragment, { cache: cachePolicy, debug });
  });
}

export default Mancha;
