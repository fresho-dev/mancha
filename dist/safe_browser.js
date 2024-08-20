import { sanitizeHtml } from "safevalues";
import { safeRange, safeDomParser } from "safevalues/dom";
import { dirname } from "./dome.js";
import { IRenderer } from "./core.js";
export class Renderer extends IRenderer {
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
    serializeHTML(root) {
        return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
    }
    preprocessLocal(fpath, params) {
        // In the browser, "local" paths (i.e., relative paths) can still be fetched.
        return this.preprocessRemote(fpath, params);
    }
    createElement(tag, owner) {
        return (owner || document).createElement(tag);
    }
    textContent(node, content) {
        node.textContent = content;
    }
}
export const Mancha = new Renderer();
