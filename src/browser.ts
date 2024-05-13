import { dirname, IRenderer } from "./core";
import { ParserParams, RenderParams } from "./interfaces";

class RendererImpl extends IRenderer {
  protected readonly dirpath: string = dirname(self.location.href);
  parseHTML(content: string, params: ParserParams = { root: false }): DocumentFragment {
    if (params.root) {
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
  preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment> {
    // In the browser, "local" paths (i.e., relative) can still be fetched.
    return this.preprocessRemote(fpath, params);
  }
}

const Mancha = new RendererImpl();
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
