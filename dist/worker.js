import { JSDOM } from "jsdom";
import { IRenderer } from "./core.js";
export class RendererImpl extends IRenderer {
    parseHTML(content, params = { root: false }) {
        const dom = new JSDOM();
        if (params.root) {
            const DOMParser = dom.window.DOMParser;
            return new DOMParser().parseFromString(content, "text/html");
        }
        else {
            const range = dom.window.document.createRange();
            range.selectNodeContents(dom.window.document.body);
            return range.createContextualFragment(content);
        }
    }
    serializeHTML(root) {
        const dom = new JSDOM();
        const XMLSerializer = dom.window.XMLSerializer;
        return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
    }
}
// Export the renderer instance directly.
export const Mancha = new RendererImpl();
