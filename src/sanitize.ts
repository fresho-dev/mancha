import { HtmlSanitizerBuilder } from "safevalues";
import { safeDomParser } from "safevalues/dom";
import { SAFE_DATA_ATTRIBS, TRUSTED_ATTRIBS } from "./trusted_attributes.js";

/**
 * Rewrite mancha syntax into forms the sanitizer preserves.
 *
 * The sanitizer drops unknown attributes and elements, which would strip every
 * directive and custom tag from a template. Directives become `data-*` and
 * custom tags become `div` with a role, both of which survive; the renderer
 * reads either spelling.
 *
 * Only the first custom element in a fragment survives the rewrite, and the
 * substitution is textual, so a literal directive inside text is rewritten too.
 */
export function prepareForSanitizer(content: string): string {
	// Directives: :text => data-text, :on:click => data-on-click.
	for (const attr of TRUSTED_ATTRIBS) {
		content = content.replace(
			new RegExp(`\\s:${attr.slice(1)}=`, "g"),
			` data-${attr.slice(1).replace(":", "-")}=`,
		);
	}

	// <include src="..."> => <link rel="subresource" href="...">.
	content = content.replace(
		/<include(.*) src="([^"]+)"(.*)><\/include>/g,
		`<link $1 rel="subresource" href="$2" $3>`,
	);

	// <template is="..."> => <div role="template" alt="...">.
	content = content.replace(
		/<template is="([^"]+)">([\s\S]*)<\/template>/g,
		`<div role="template" alt="$1">$2</div>`,
	);

	// <custom-element> => <div role="custom-element">.
	content = content.replace(
		/<(\w+)-(\w+)(.*)>([\s\S]*)<\/(\w+)-(\w+)>/g,
		`<div role="$1-$2" $3>$4</div>`,
	);

	return content;
}

/**
 * The sanitizer used for semi-trusted template content. Built once: the
 * configuration is fixed, and parsing happens on every render.
 *
 * Note this deliberately preserves the `data-*` directives the renderer
 * evaluates, so it strips markup-level script injection but is NOT a
 * code-execution boundary. See docs/02_initialization.md.
 */
const sanitizer = new HtmlSanitizerBuilder()
	.allowDataAttributes(SAFE_DATA_ATTRIBS)
	.allowClassAttributes()
	.allowStyleAttributes()
	.build();

/** Sanitize semi-trusted content into a document fragment. */
export function sanitizeToFragment(content: string): DocumentFragment {
	return sanitizer.sanitizeToFragment(prepareForSanitizer(content));
}

/** Sanitize semi-trusted content into a full document. */
export function sanitizeToDocument(content: string): Document {
	const sanitized = sanitizer.sanitize(prepareForSanitizer(content));
	return safeDomParser.parseFromString(new DOMParser(), sanitized, "text/html");
}
