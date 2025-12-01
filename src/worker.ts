import * as htmlparser2 from "htmlparser2";
import { Element, Text } from "domhandler";
import { render as renderDOM } from "dom-serializer";
import { IRenderer } from "./renderer.js";
import { ParserParams } from "./interfaces.js";

export { IRenderer } from "./renderer.js";
export type { ParserParams, RenderParams, RendererPlugin } from "./interfaces.js";

export class Renderer extends IRenderer {
  readonly impl = "htmlparser2";
  parseHTML(
    content: string,
    params: ParserParams = { rootDocument: false }
  ): Document | DocumentFragment {
    return htmlparser2.parseDocument(content) as unknown as Document;
  }
  serializeHTML(root: Node | DocumentFragment | Document): string {
    return renderDOM(root as any);
  }
  createElement(tag: string, owner?: Document | null): globalThis.Element {
    return new Element(tag, {}) as unknown as globalThis.Element;
  }
  textContent(node: Node, content: string): void {
    (node as any).children = [new Text(content)];
  }
}

// Export the renderer instance directly.
export const Mancha = new Renderer();
