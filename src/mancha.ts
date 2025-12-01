import { Renderer, injectCss, CssName } from "./browser.js";

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
  const styleNames = currentScript?.getAttribute("css")?.split("+") as CssName[];
  injectCss(styleNames);
}

export default Mancha;
