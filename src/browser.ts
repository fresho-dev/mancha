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
	callback?: (renderer: Renderer) => void | Promise<void>;
}

/** CSS rule used to hide cloaked elements. */
const CLOAK_STYLE_ID = "mancha-cloak-style";

/**
 * Applies cloaking to the specified elements immediately.
 * @param selectors - Selectors for elements to cloak.
 * @param duration - Animation duration in ms.
 */
function applyCloak(selectors: string[], duration: number): void {
	// Idempotency check: if style already exists, do nothing.
	// We assume selectors don't change between calls for the same page load.
	if (document.getElementById(CLOAK_STYLE_ID)) {
		return;
	}

	const selectorList = selectors.join(", ");
	// Important: use !important to override any existing styles that might cause a flash.
	// We include the transition in the initial style so browser handles it.
	const transition =
		duration > 0 ? `transition: opacity ${duration}ms ease-in-out !important;` : "";
	const css = `${selectorList} { opacity: 0 !important; ${transition} }`;

	const style = document.createElement("style");
	style.id = CLOAK_STYLE_ID;
	style.textContent = css;
	document.head.appendChild(style);
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

		const style = document.getElementById(CLOAK_STYLE_ID) as HTMLStyleElement;
		if (!style) return;

		if (animate !== false) {
			// CSSOM approach: Update the single global rule to trigger the transition
			// for all elements simultaneously, without DOM iteration.
			const sheet = style.sheet;
			if (sheet && sheet.cssRules.length > 0) {
				const rule = sheet.cssRules[0] as CSSStyleRule;
				rule.style.setProperty("opacity", "1", "important");
			}

			// Wait for animation to complete.
			await new Promise((resolve) => setTimeout(resolve, animate));
		}

		// Remove the style tag (cleanup).
		style.remove();
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
	// 1. Apply cloaking immediately if requested.
	// This prevents FOUC even if we have to wait for DOMContentLoaded.
	let uncloak: (() => Promise<void>) | undefined;
	const cloakOpts: CloakOptions | undefined = options.cloak
		? options.cloak === true
			? {}
			: options.cloak
		: undefined;

	if (cloakOpts) {
		const defaultSelectors = options.target
			? Array.isArray(options.target)
				? options.target
				: [options.target]
			: ["body"];
		const cloakSelectors =
			cloakOpts.selector &&
			(Array.isArray(cloakOpts.selector) || typeof cloakOpts.selector === "string")
				? Array.isArray(cloakOpts.selector)
					? cloakOpts.selector
					: [cloakOpts.selector]
				: defaultSelectors;

		const animateDuration = cloakOpts.duration ?? 0;

		// Apply styles immediately.
		applyCloak(cloakSelectors, animateDuration);

		// Prepare uncloak function.
		uncloak = createUncloakFn(animateDuration > 0 ? animateDuration : false);
	}

	// 2. Wait for DOMContentLoaded if necessary.
	if (document.readyState === "loading") {
		await new Promise<void>((resolve) => {
			window.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
		});
	}

	const renderer = (options.renderer as Renderer<T>) ?? new Renderer<T>();

	// Inject CSS if specified.
	if (options.css && options.css.length > 0) {
		injectCss(options.css);
	}

	// Enable debug mode if specified.
	if (options.debug) {
		renderer.debug(true);
	}

	// Set initial state before mounting.
	if (options.state) {
		for (const [key, value] of Object.entries(options.state)) {
			await renderer.set(key, value);
		}
	}

	// If callback is provided, call it and let user handle mounting.
	if (options.callback) {
		await options.callback(renderer);
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

	// Uncloak after everything is ready (initMancha uncloak is idempotent).
	if (uncloak) {
		await uncloak();
	}

	return renderer;
}
