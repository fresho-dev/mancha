import { sanitizeHtml } from "safevalues";
import { safeRange, safeDomParser } from "safevalues/dom";
import { Renderer as BrowserRenderer } from "./browser.js";
import { dirname } from "./dome.js";
import { ParserParams } from "./interfaces.js";

export class Renderer extends BrowserRenderer {
  protected readonly dirpath: string = dirname(self.location.href);
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
}

export const Mancha = new Renderer();
