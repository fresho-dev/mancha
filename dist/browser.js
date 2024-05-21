"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
class RendererImpl extends core_1.IRenderer {
    dirpath = (0, core_1.dirname)(self.location.href);
    parseHTML(content, params = { root: false }) {
        if (params.root) {
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
        // In the browser, "local" paths (i.e., relative) can still be fetched.
        return this.preprocessRemote(fpath, params);
    }
}
const Mancha = new RendererImpl();
self["Mancha"] = Mancha;
const currentScript = self.document?.currentScript;
if (self.document?.currentScript?.hasAttribute("init")) {
    Mancha.update({ ...currentScript?.dataset });
    const debug = currentScript?.hasAttribute("debug");
    const cachePolicy = currentScript?.getAttribute("cache");
    const targets = currentScript?.getAttribute("target")?.split(",") || ["body"];
    targets.map(async (target) => {
        const fragment = self.document.querySelector(target);
        await Mancha.debug(debug).mount(fragment, { cache: cachePolicy });
    });
}
exports.default = Mancha;
