"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mancha = exports.RendererImpl = void 0;
const jsdom_1 = require("jsdom");
const core_1 = require("./core");
class RendererImpl extends core_1.IRenderer {
    parseHTML(content, params = { root: false }) {
        const dom = new jsdom_1.JSDOM();
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
        const dom = new jsdom_1.JSDOM();
        const XMLSerializer = dom.window.XMLSerializer;
        return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
    }
}
exports.RendererImpl = RendererImpl;
// Export the renderer instance directly.
exports.Mancha = new RendererImpl();
