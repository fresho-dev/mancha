import { Renderer as BrowserRenderer } from "./browser.js";
import type { ParserParams } from "./interfaces.js";
import type { StoreState } from "./store.js";

/**
 * Browser renderer that sanitizes every template it parses.
 *
 * @deprecated Use the standard browser `Renderer` with `{ sanitize: true }` in
 * the parser params instead. The two now share one implementation, so this
 * class only preselects the flag. It will be removed in a future release.
 */
export class Renderer<T extends StoreState = StoreState> extends BrowserRenderer<T> {
	readonly impl: string = "safe_browser";

	parseHTML(
		content: string,
		params: ParserParams = { rootDocument: false },
	): Document | DocumentFragment {
		return super.parseHTML(content, { ...params, sanitize: true });
	}
}

/** @deprecated See {@link Renderer}. */
export const Mancha = new Renderer();
