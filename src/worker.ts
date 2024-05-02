import { JSDOM } from "jsdom";
import { IRenderer, ParserParams, RendererParams } from "./core";

export class RendererImpl extends IRenderer {
  parseHTML(content: string, params: ParserParams = { isRoot: false }): DocumentFragment {
    // return JSDOM.fragment(content) as unknown as DocumentFragment;
    const dom = new JSDOM();
    if (params.isRoot) {
      const DOMParser = dom.window.DOMParser;
      return new DOMParser().parseFromString(content, "text/html") as unknown as DocumentFragment;
    } else {
      const range = dom.window.document.createRange();
      range.selectNodeContents(dom.window.document.body);
      return range.createContextualFragment(content);
    }
  }
  serializeHTML(root: Node | DocumentFragment): string {
    const dom = new JSDOM();
    const XMLSerializer = dom.window.XMLSerializer;
    return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
  }
  renderLocalPath(
    fpath: string,
    params?: RendererParams & ParserParams
  ): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

// Re-exports from core.
export { folderPath, resolvePath } from "./core";

// Export the renderer instance directly.
export const Mancha = new RendererImpl();
