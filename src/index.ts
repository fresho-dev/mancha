import * as fs from "fs/promises";
import { JSDOM } from "jsdom";
import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";

export class Renderer extends IRenderer {
  parseHTML(content: string, params: ParserParams = { rootDocument: false }): DocumentFragment {
    const dom = new JSDOM();
    if (params.rootDocument) {
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
  createElement(tag: string, owner?: Document | null): Element {
    return (owner || new JSDOM().window.document).createElement(tag);
  }
  textContent(node: Node, content: string): void {
    node.textContent = content;
  }

  async fetchLocal(fpath: string, params?: RenderParams & ParserParams): Promise<string> {
    return fs.readFile(fpath, { encoding: params?.encoding || "utf8" });
  }
}

// Export a global renderer instance directly.
export const Mancha = new Renderer();
