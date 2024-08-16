import { sanitizeHtml } from "safevalues";
import { safeRange, safeDomParser } from "safevalues/dom";
import { Renderer as BrowserRenderer } from "./browser.js";
import { dirname } from "./dome.js";
export class Renderer extends BrowserRenderer {
    dirpath = dirname(self.location.href);
    parseHTML(content, params = { rootDocument: false }) {
        if (params.rootDocument) {
            const parser = new DOMParser();
            return safeDomParser.parseFromString(parser, sanitizeHtml(content), "text/html");
        }
        else {
            const range = document.createRange();
            range.selectNodeContents(document.body);
            return safeRange.createContextualFragment(range, sanitizeHtml(content));
        }
    }
}
export const Mancha = new Renderer();
