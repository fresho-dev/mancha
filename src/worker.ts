import { JSDOM } from "jsdom";
import { IRenderer } from "./core";
import { ParserParams, RenderParams } from "./interfaces";

export class RendererImpl extends IRenderer {
  parseHTML(content: string, params: ParserParams = { root: false }): DocumentFragment {
    const dom = new JSDOM();
    if (params.root) {
      const DOMParser = dom.window.DOMParser;
      return new DOMParser().parseFromString(content, "text/html") as unknown as DocumentFragment;
    } else {
      const range = dom.window.document.createRange();
      range.selectNodeContents(dom.window.document.body);
      return range.createContextualFragment(content);
    }
  }
  serializeHTML(root: Node | DocumentFragment | Document): string {
    const dom = new JSDOM();
    const XMLSerializer = dom.window.XMLSerializer;
    return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
  }
}

// Export the renderer instance directly.
export const Mancha = new RendererImpl();
