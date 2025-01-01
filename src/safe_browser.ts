import { sanitizeHtml } from "safevalues";
import { safeRange, safeDomParser } from "safevalues/dom";
import { dirname } from "./dome.js";
import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";

export class Renderer extends IRenderer {
  protected readonly dirpath: string = dirname(globalThis.location?.href ?? "");
  parseHTML(
    content: string,
    params: ParserParams = { rootDocument: false }
  ): Document | DocumentFragment {
    if (params.rootDocument) {
      const parser = new DOMParser();
      return safeDomParser.parseFromString(parser, sanitizeHtml(content), "text/html");
    } else {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      return safeRange.createContextualFragment(range, sanitizeHtml(content));
    }
  }
  serializeHTML(root: Node | DocumentFragment): string {
    return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
  }
  preprocessLocal(
    fpath: string,
    params?: RenderParams & ParserParams
  ): Promise<Document | DocumentFragment> {
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
