import * as htmlparser2 from "htmlparser2";
import { render as renderDOM } from "dom-serializer";
import { IRenderer } from "./core.js";
export class Renderer extends IRenderer {
    parseHTML(content, params = { root: false }) {
        return htmlparser2.parseDocument(content);
    }
    serializeHTML(root) {
        return renderDOM(root);
    }
}
// Export the renderer instance directly.
export const Mancha = new Renderer();
