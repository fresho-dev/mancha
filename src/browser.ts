import { IRenderer } from "./core.js";
import { dirname } from "./dome.js";
import { ParserParams, RenderParams } from "./interfaces.js";

export class Renderer extends IRenderer {
  protected readonly dirpath: string = dirname(self.location.href);
  parseHTML(content: string, params: ParserParams = { rootDocument: false }): DocumentFragment {
    if (params.rootDocument) {
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
    // In the browser, "local" paths (i.e., relative paths) can still be fetched.
    return this.preprocessRemote(fpath, params);
  }
  createElement(tag: string, owner?: Document | null): Element {
    return (owner || document).createElement(tag);
  }
  textContent(node: Node, content: string): void {
    node.textContent = content;
  }
}

export const Mancha = new Renderer();
