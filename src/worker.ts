import * as htmlparser2 from "htmlparser2";
import { render as renderDOM } from "dom-serializer";
import { IRenderer } from "./core.js";
import { ParserParams } from "./interfaces.js";

export class Renderer extends IRenderer {
  parseHTML(content: string, params: ParserParams = { root: false }): DocumentFragment {
    return htmlparser2.parseDocument(content) as any;
  }
  serializeHTML(root: Node | DocumentFragment | Document): string {
    return renderDOM(root as any);
  }
}

// Export the renderer instance directly.
export const Mancha = new Renderer();
