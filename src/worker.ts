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

/**
 * 
  replaceNodeWith(original: Node, replacement: Node[]): void {
    const elem = original as Element;
    const parent = elem.parentNode as ParentNode;
    const index = Array.from(parent.childNodes).indexOf(elem);
    replacement.forEach((elem) => ((elem as any).parentNode = parent));
    (parent as any).childNodes = ([] as ChildNode[])
      .concat(Array.from(parent.childNodes).slice(0, index))
      .concat(replacement as ChildNode[])
      .concat(Array.from(parent.childNodes).slice(index + 1));
  }
 */

// Export the renderer instance directly.
export const Mancha = new Renderer();
