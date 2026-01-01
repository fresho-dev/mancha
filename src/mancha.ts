import { type CssName, initMancha, Renderer } from "./browser.js";

// Parse options from the script tag attributes.
const currentScript = globalThis.document?.currentScript;

// Create the global instance immediately for backward compatibility.
const instance = new Renderer();
globalThis.Mancha = instance;

// If the init attribute is present, initialize mancha using the unified initMancha function.
if (currentScript?.hasAttribute("init")) {
	// Parse all configuration from script tag attributes.
	const debug = currentScript.hasAttribute("debug");
	const cachePolicy = (currentScript.getAttribute("cache") as RequestCache) || undefined;
	const targets = currentScript.getAttribute("target")?.split("+") || ["body"];
	const cssNames = currentScript.getAttribute("css")?.split("+") as CssName[] | undefined;

	// Cloaking is ON by default for script tag init.
	// - cloak="false" disables cloaking
	// - cloak="200" enables cloaking with 200ms fade-in animation
	// - no cloak attribute or cloak="" enables cloaking with no animation (default)
	let cloak: boolean | { duration: number } | undefined;
	const cloakValue = currentScript.getAttribute("cloak");
	if (cloakValue === "false") {
		cloak = undefined;
	} else if (cloakValue && !Number.isNaN(parseInt(cloakValue, 10))) {
		const duration = parseInt(cloakValue, 10);
		cloak = duration > 0 ? { duration } : true;
	} else {
		// Default: cloaking enabled with no animation.
		cloak = true;
	}

	window.addEventListener("load", async () => {
		// Use initMancha with the global instance for consistent behavior.
		await initMancha({
			renderer: instance,
			css: cssNames,
			target: targets,
			debug,
			cache: cachePolicy,
			cloak,
		});
	});
} else if (currentScript?.hasAttribute("css")) {
	// Legacy behavior: only inject CSS if css attribute is present but init is not.
	const styleNames = currentScript.getAttribute("css")?.split("+") as CssName[];
	initMancha({ css: styleNames });
}

export default instance;

declare global {
	var Mancha: Renderer;
}
