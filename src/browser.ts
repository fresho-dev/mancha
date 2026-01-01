import { safeStyleEl } from "safevalues/dom";
import { dirname } from "./dome.js";
import type { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./renderer.js";
import type { StoreState } from "./store.js";

export { default as minimalCssRules } from "./css_gen_minimal.js";
export { default as basicCssRules } from "./css_gen_basic.js";
export { default as utilsCssRules } from "./css_gen_utils.js";
export type { ParserParams, RendererPlugin, RenderParams } from "./interfaces.js";
export { IRenderer } from "./renderer.js";

import minimalCssRules from "./css_gen_minimal.js";
import basicCssRules from "./css_gen_basic.js";
import utilsCssRules from "./css_gen_utils.js";

export class Renderer<T extends StoreState = StoreState> extends IRenderer<T> {
	readonly impl = "browser";
	protected readonly dirpath: string = dirname(globalThis.location?.href ?? "http://localhost/");
	parseHTML(
		content: string,
		params: ParserParams = { rootDocument: false },
	): Document | DocumentFragment {
		if (params.rootDocument) {
			return new DOMParser().parseFromString(content, "text/html");
		} else {
			const range = document.createRange();
			range.selectNodeContents(document.body);
			return range.createContextualFragment(content);
		}
	}
	serializeHTML(root: Node | DocumentFragment): string {
		return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
	}
	preprocessLocal(
		fpath: string,
		params?: RenderParams & ParserParams,
	): Promise<Document | DocumentFragment> {
		// In the browser, "local" paths (i.e., relative paths) can still be fetched.
		return this.preprocessRemote(fpath, params);
	}
	createElement(tag: string, owner?: Document | null): Element {
		return (owner || document).createElement(tag);
	}
	createComment(content: string, owner?: Document | null): Node {
		return (owner || document).createComment(content);
	}
	textContent(node: Node, content: string): void {
		node.textContent = content;
	}
}

export const Mancha = new Renderer();

/** Options for CSS injection. */
export type CssName = "minimal" | "utils" | "basic";

/**
 * Injects CSS rules into the document head.
 * @param names - Array of CSS names to inject ("minimal", "utils", "basic").
 */
export function injectCss(names: CssName[]): void {
	for (const styleName of names) {
		const style = document.createElement("style");
		switch (styleName) {
			case "minimal":
				safeStyleEl.setTextContent(style, minimalCssRules());
				break;
			case "basic":
				safeStyleEl.setTextContent(style, basicCssRules());
				break;
			case "utils":
				style.textContent = utilsCssRules();
				break;
			default:
				console.error(`Unknown style name: "${styleName}"`);
				continue;
		}
		globalThis.document.head.appendChild(style);
	}
}

/**
 * Injects the minimal CSS rules into the document head.
 */
export function injectMinimalCss(): void {
	injectCss(["minimal"]);
}

/**
 * Injects the basic CSS rules into the document head.
 */
export function injectBasicCss(): void {
	injectCss(["basic"]);
}

/**
 * Injects the utils CSS rules into the document head.
 */
export function injectUtilsCss(): void {
	injectCss(["utils"]);
}

/** Options for initializing Mancha. */
export interface InitManchaOptions {
	/** CSS styles to inject before mounting. */
	css?: CssName[];
	/** Target selector(s) to mount the renderer to. */
	target?: string | string[];
	/** Enable debug mode. */
	debug?: boolean;
	/** Cache policy for fetch requests. */
	cache?: RequestCache;
	/** Initial state to set before mounting. */
	state?: Record<string, unknown>;
}

/**
 * Initializes Mancha with the provided options.
 * This is a convenience function for bundled environments.
 *
 * @param options - Initialization options.
 * @returns A promise that resolves to the Renderer instance.
 */
export async function initMancha<T extends StoreState = StoreState>(
	options: InitManchaOptions = {},
): Promise<Renderer<T>> {
	const renderer = new Renderer<T>();

	// Inject CSS if specified.
	if (options.css && options.css.length > 0) {
		injectCss(options.css);
	}

	// Enable debug mode if specified.
	if (options.debug) {
		renderer.debug(true);
	}

	// Set initial state before mounting to ensure reactivity works.
	if (options.state) {
		for (const [key, value] of Object.entries(options.state)) {
			await renderer.set(key, value);
		}
	}

	// Mount to targets if specified.
	if (options.target) {
		const targets = Array.isArray(options.target) ? options.target : [options.target];
		for (const target of targets) {
			const element = globalThis.document.querySelector(target);
			if (element) {
				await renderer.mount(element as unknown as DocumentFragment, { cache: options.cache });
			} else {
				console.error(`Target element not found: "${target}"`);
			}
		}
	}

	return renderer;
}
