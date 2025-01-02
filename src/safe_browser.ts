import { HtmlSanitizerBuilder } from "safevalues";
import { safeDomParser } from "safevalues/dom";
import { dirname } from "./dome.js";
import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./renderer.js";

const TRUSTED_ATTRIBS = [
  ":data",
  ":for",
  ":text",
  ":html",
  ":show",
  ":class",
  ":bind",
  ":on:click",
  ":on:input",
  ":on:change",
  ":on:submit",
  ":attr:src",
  ":attr:href",
  ":attr:title",
  ":prop:checked",
  ":prop:selected",
  ":prop:disabled",
];

export class Renderer extends IRenderer {
  readonly impl = "safe_browser";
  protected readonly dirpath: string = dirname(globalThis.location?.href ?? "http://localhost/");
  parseHTML(
    content: string,
    params: ParserParams = { rootDocument: false }
  ): Document | DocumentFragment {
    // Replace all attributes in content from :colon:notation to data-dash-notation.
    for (const attr of TRUSTED_ATTRIBS) {
      content = content.replace(
        new RegExp(`\\s:${attr.slice(1)}=`, "g"),
        ` data-${attr.slice(1).replace(":", "-")}=`
      );
    }

    const sanitizer = new HtmlSanitizerBuilder()
      .allowClassAttributes()
      .allowStyleAttributes()
      .allowDataAttributes(TRUSTED_ATTRIBS.map((attr) => `data-${attr.slice(1).replace(":", "-")}`))
      .build();
    if (params.rootDocument) {
      const parser = new DOMParser();
      return safeDomParser.parseFromString(parser, sanitizer.sanitize(content), "text/html");
    } else {
      return sanitizer.sanitizeToFragment(content);
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
