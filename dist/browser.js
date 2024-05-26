import { dirname, IRenderer } from "./core.js";
class RendererImpl extends IRenderer {
    dirpath = dirname(self.location.href);
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
    const debug = currentScript?.hasAttribute("debug");
    const cachePolicy = currentScript?.getAttribute("cache");
    const targets = currentScript?.getAttribute("target")?.split(",") || ["body"];
    window.addEventListener("load", () => {
        targets.map(async (target) => {
            const fragment = self.document.querySelector(target);
            await Mancha.debug(debug).mount(fragment, { cache: cachePolicy });
        });
    });
}
export default Mancha;
