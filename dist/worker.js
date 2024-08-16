import * as htmlparser2 from "htmlparser2";
import { Element, Text } from "domhandler";
import { render as renderDOM } from "dom-serializer";
import { IRenderer } from "./core.js";
export class Renderer extends IRenderer {
    parseHTML(content, params = { rootDocument: false }) {
        return htmlparser2.parseDocument(content);
    }
    serializeHTML(root) {
        return renderDOM(root);
    }
    createElement(tag, owner) {
        return new Element(tag, {});
    }
    textContent(node, content) {
        node.children = [new Text(content)];
    }
}
// Export the renderer instance directly.
export const Mancha = new Renderer();
