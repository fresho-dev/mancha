import { IRenderer } from "./core.js";
import { dirname } from "./dome.js";
export class Renderer extends IRenderer {
    dirpath = dirname(self.location.href);
    parseHTML(content, params = { rootDocument: false }) {
        if (params.rootDocument) {
            return new DOMParser().parseFromString(content, "text/html");
        }
        else {
            const range = document.createRange();
            range.selectNodeContents(document.body);
            return range.createContextualFragment(content);
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
