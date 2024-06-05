import { dirname, IRenderer } from "./core.js";
import basicCssRules from "./css_gen_basic.js";
import utilsCssRules from "./css_gen_utils.js";
class Renderer extends IRenderer {
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
}
const Mancha = new Renderer();
self["Mancha"] = Mancha;
const currentScript = self.document?.currentScript;
// If the init attribute is present, mount the content to the target element(s).
if (self.document?.currentScript?.hasAttribute("init")) {
    const debug = currentScript?.hasAttribute("debug");
    const cachePolicy = currentScript?.getAttribute("cache");
    const targets = currentScript?.getAttribute("target")?.split("+") || ["body"];
    window.addEventListener("load", () => {
        targets.map(async (target) => {
            const fragment = self.document.querySelector(target);
            await Mancha.debug(debug).mount(fragment, { cache: cachePolicy });
        });
    });
}
// If the css attribute is present, inject the specified CSS rules.
if (self.document?.currentScript?.hasAttribute("css")) {
    const styleNames = currentScript?.getAttribute("css")?.split("+");
    for (const styleName of styleNames) {
        const style = document.createElement("style");
        switch (styleName) {
            case "basic":
                style.textContent = basicCssRules();
                break;
            case "utils":
                style.textContent = utilsCssRules();
                break;
            default:
                console.error(`Unknown style name: "${styleName}"`);
                break;
        }
        self.document.head.appendChild(style);
    }
}
export default Mancha;
