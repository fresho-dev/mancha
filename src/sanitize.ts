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

/** Build the sanitizer used for untrusted template content. */
function buildSanitizer() {
	return new HtmlSanitizerBuilder()
		.allowDataAttributes(SAFE_DATA_ATTRIBS)
		.allowClassAttributes()
		.allowStyleAttributes()
		.build();
}

/** Sanitize untrusted content into a document fragment. */
export function sanitizeToFragment(content: string): DocumentFragment {
	return buildSanitizer().sanitizeToFragment(prepareForSanitizer(content));
}

/** Sanitize untrusted content into a full document. */
export function sanitizeToDocument(content: string): Document {
	const sanitized = buildSanitizer().sanitize(prepareForSanitizer(content));
	return safeDomParser.parseFromString(new DOMParser(), sanitized, "text/html");
}
