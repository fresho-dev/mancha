import { IRenderer } from "./core.js";
import { ParserParams } from "./interfaces.js";

export class Renderer extends IRenderer {
  parseHTML(content: string, params: ParserParams = { root: false }): DocumentFragment {
    throw new Error("Not implemented.");
  }
  serializeHTML(root: Node | DocumentFragment | Document): string {
    throw new Error("Not implemented.");
  }
}

// Export the renderer instance directly.
export const Mancha = new Renderer();
