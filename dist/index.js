import * as fs from "fs/promises";
import { JSDOM } from "jsdom";
import { IRenderer } from "./core.js";
export class Renderer extends IRenderer {
    parseHTML(content, params = { rootDocument: false }) {
        if (params.rootDocument) {
            return new JSDOM(content).window.document;
        }
        else {
            return JSDOM.fragment(content);
        }
    }
    serializeHTML(root) {
        const dom = new JSDOM();
        const XMLSerializer = dom.window.XMLSerializer;
        return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
    }
    createElement(tag, owner) {
        return (owner || new JSDOM().window.document).createElement(tag);
    }
    textContent(node, content) {
        node.textContent = content;
    }
    async fetchLocal(fpath, params) {
        return fs.readFile(fpath, { encoding: params?.encoding || "utf8" });
    }
}
// Export a global renderer instance directly.
export const Mancha = new Renderer();
