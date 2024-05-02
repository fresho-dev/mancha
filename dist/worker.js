"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mancha = exports.resolvePath = exports.folderPath = exports.RendererImpl = void 0;
const jsdom_1 = require("jsdom");
const core_1 = require("./core");
class RendererImpl extends core_1.IRenderer {
    parseHTML(content, params = { isRoot: false }) {
        // return JSDOM.fragment(content) as unknown as DocumentFragment;
        const dom = new jsdom_1.JSDOM();
        if (params.isRoot) {
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
    renderLocalPath(fpath, params) {
        throw new Error("Not implemented.");
    }
}
exports.RendererImpl = RendererImpl;
// Re-exports from core.
var core_2 = require("./core");
Object.defineProperty(exports, "folderPath", { enumerable: true, get: function () { return core_2.folderPath; } });
Object.defineProperty(exports, "resolvePath", { enumerable: true, get: function () { return core_2.resolvePath; } });
// Export the renderer instance directly.
exports.Mancha = new RendererImpl();
