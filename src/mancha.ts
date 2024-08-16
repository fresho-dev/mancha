import { safeStyleEl } from "safevalues/dom";
import { Renderer } from "./browser.js";
import basicCssRules from "./css_gen_basic.js";
import utilsCssRules from "./css_gen_utils.js";

const Mancha = new Renderer();
(globalThis as any)["Mancha"] = Mancha;
const currentScript = globalThis.document?.currentScript;

// If the init attribute is present, mount the content to the target element(s).
if (globalThis.document?.currentScript?.hasAttribute("init")) {
  const debug = currentScript?.hasAttribute("debug");
  const cachePolicy = currentScript?.getAttribute("cache") as RequestCache | null;
  const targets = currentScript?.getAttribute("target")?.split("+") || ["body"];
  window.addEventListener("load", () => {
    targets.map(async (target: string) => {
      const fragment = globalThis.document.querySelector(target) as unknown as DocumentFragment;
      await Mancha.debug(debug!!).mount(fragment, { cache: cachePolicy });
    });
  });
}

// If the css attribute is present, inject the specified CSS rules.
if (globalThis.document?.currentScript?.hasAttribute("css")) {
  const styleNames = currentScript?.getAttribute("css")?.split("+") as string[];
  for (const styleName of styleNames) {
    const style = document.createElement("style");
    switch (styleName) {
      case "basic":
        safeStyleEl.setTextContent(style, basicCssRules());
        break;
      case "utils":
        style.textContent = utilsCssRules();
        break;
      default:
        console.error(`Unknown style name: "${styleName}"`);
        break;
    }
    globalThis.document.head.appendChild(style);
  }
}

export default Mancha;
