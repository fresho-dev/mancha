import * as htmlparser2 from "htmlparser2";
import { render as renderDOM } from "dom-serializer";
import { IRenderer } from "./core";

export class RendererImpl extends IRenderer {
  parseDocumentFragment(content: string): DocumentFragment {
    return htmlparser2.parseDocument(content) as any as DocumentFragment;
  }
  serializeDocumentFragment(document: DocumentFragment): string {
    return renderDOM(document as any);
  }
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
  async renderLocalPath(
    fpath: string,
    vars: { [key: string]: string } = {},
    encoding: BufferEncoding = "utf8"
  ): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

// Re-exports from core.
export { preprocess, folderPath, resolvePath, encodeHtmlAttrib, decodeHtmlAttrib } from "./core";

// Export the renderer instance directly.
export const Mancha = new RendererImpl();
