import { safeStyleEl } from "safevalues/dom";
import { dirname } from "./dome.js";
import type { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./renderer.js";
import type { StoreState } from "./store.js";

export { default as basicCssRules } from "./css_gen_basic.js";
export { default as minimalCssRules } from "./css_gen_minimal.js";
export { default as utilsCssRules } from "./css_gen_utils.js";
export type { ParserParams, RendererPlugin, RenderParams } from "./interfaces.js";
export { IRenderer } from "./renderer.js";

import basicCssRules from "./css_gen_basic.js";
import minimalCssRules from "./css_gen_minimal.js";
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

/** Options for cloaking (hiding content until rendered). */
export interface CloakOptions {
	/** Selector(s) for elements to cloak. Defaults to `target` option or 'body'. */
	selector?: string | string[];
	/** Fade-in animation duration in ms. Defaults to 0 (no animation). */
	duration?: number;
}

/** Options for initializing Mancha. */
export interface InitManchaOptions {
	/** Use an existing Renderer instance instead of creating a new one. */
	renderer?: Renderer;
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
	/**
	 * Cloak (hide) content until rendering is complete.
	 * - `true`: cloak with no animation (instant reveal)
	 * - `CloakOptions`: advanced options with custom selector and/or fade-in duration
	 */
	cloak?: boolean | CloakOptions;
	/**
	 * Callback invoked after CSS injection and state setup, but before mounting.
	 * If provided, automatic mounting to `target` is skipped; call `renderer.mount()` manually.
	 * The `uncloak` function is provided to reveal content (called automatically after this resolves).
	 * @param renderer - The initialized Renderer instance.
	 * @param uncloak - Function to reveal cloaked content with optional animation.
	 */
	callback?: (renderer: Renderer, uncloak: () => Promise<void>) => void | Promise<void>;
}

/** CSS rule used to hide cloaked elements. */
const CLOAK_STYLE_ID = "mancha-cloak-style";
const CLOAK_ATTR = "data-mancha-cloak";
const CLOAK_CSS = `[${CLOAK_ATTR}] { opacity: 0 !important; }`;

/**
 * Applies cloaking to the specified elements.
 * @param selectors - Selectors for elements to cloak.
 * @returns The style element that was added.
 */
function applyCloak(selectors: string[]): HTMLStyleElement {
	// Inject the cloaking CSS rule.
	const style = document.createElement("style");
	style.id = CLOAK_STYLE_ID;
	style.textContent = CLOAK_CSS;
	document.head.appendChild(style);

	// Add the cloak attribute to all target elements.
	for (const selector of selectors) {
		const elements = document.querySelectorAll(selector);
		for (const el of elements) {
			el.setAttribute(CLOAK_ATTR, "");
		}
	}

	return style;
}

/**
 * Creates an uncloak function that reveals cloaked elements.
 * @param animate - Animation duration in ms, or false for no animation.
 * @returns A function that removes cloaking.
 */
function createUncloakFn(animate: number | false): () => Promise<void> {
	let called = false;
	return async (): Promise<void> => {
		// Prevent multiple calls.
		if (called) return;
		called = true;

		const elements = document.querySelectorAll(`[${CLOAK_ATTR}]`);
		const style = document.getElementById(CLOAK_STYLE_ID);

		if (animate !== false && elements.length > 0) {
			// Remove the !important rule by removing the style.
			style?.remove();

			// Set inline styles for the transition.
			for (const el of elements) {
				const htmlEl = el as HTMLElement;
				htmlEl.style.opacity = "0";
				htmlEl.style.transition = `opacity ${animate}ms ease-in-out`;
			}

			// Force reflow to ensure the transition starts from opacity 0.
			void document.body.offsetHeight;

			// Trigger the fade-in animation.
			for (const el of elements) {
				const htmlEl = el as HTMLElement;
				htmlEl.style.opacity = "1";
				el.removeAttribute(CLOAK_ATTR);
			}

			// Wait for the animation to complete before cleaning up.
			await new Promise((resolve) => setTimeout(resolve, animate));

			// Remove inline styles after animation completes.
			for (const el of elements) {
				const htmlEl = el as HTMLElement;
				htmlEl.style.transition = "";
				htmlEl.style.opacity = "";
			}
		} else {
			// No animation: just remove cloak.
			style?.remove();
			for (const el of elements) {
				el.removeAttribute(CLOAK_ATTR);
			}
		}
	};
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
	const renderer = (options.renderer as Renderer<T>) ?? new Renderer<T>();

	// Determine cloak settings.
	let uncloak: (() => Promise<void>) | undefined;
	if (options.cloak) {
		// Normalize cloak option to CloakOptions.
		const cloakOpts: CloakOptions = options.cloak === true ? {} : options.cloak;

		// Determine which elements to cloak.
		const defaultSelectors = options.target
			? Array.isArray(options.target)
				? options.target
				: [options.target]
			: ["body"];
		const cloakSelectors = cloakOpts.selector
			? Array.isArray(cloakOpts.selector)
				? cloakOpts.selector
				: [cloakOpts.selector]
			: defaultSelectors;

		// Determine animation duration (0 = no animation).
		const animateDuration = cloakOpts.duration ?? 0;

		// Apply cloaking immediately.
		applyCloak(cloakSelectors);
		uncloak = createUncloakFn(animateDuration > 0 ? animateDuration : false);
	}

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

	// If callback is provided, call it and let user handle mounting.
	if (options.callback) {
		await options.callback(renderer, uncloak ?? (async () => {}));
	} else if (options.target) {
		// Mount to targets if specified (and no callback).
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

	// Uncloak after everything is ready.
	if (uncloak) {
		await uncloak();
	}

	return renderer;
}
