import { IRenderer } from "./renderer.js";
import type { StoreState } from "./store.js";
import { dirname } from "./dome.js";
import type { ParserParams, RenderParams } from "./interfaces.js";
export { default as basicCssRules } from "./css_gen_basic.js";
export { default as utilsCssRules } from "./css_gen_utils.js";

export class Renderer<T extends StoreState = StoreState> extends IRenderer<T> {
  readonly impl = "browser";
  protected readonly dirpath: string = dirname(globalThis.location?.href ?? "http://localhost/");
  parseHTML(
    content: string,
    params: ParserParams = { rootDocument: false }
  ): Document | DocumentFragment {
    if (params.rootDocument) {
      return new DOMParser().parseFromString(content, "text/html");
    } else {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      return range.createContextualFragment(content);
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
