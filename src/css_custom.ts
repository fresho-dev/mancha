import { MEDIA_BREAKPOINTS } from "./css_gen_utils.js";

// Property prefix to CSS property mapping.
const PROPERTY_MAP: Record<string, string> = {
	// Sizing.
	w: "width",
	h: "height",
	"min-w": "min-width",
	"min-h": "min-height",
	"max-w": "max-width",
	"max-h": "max-height",

	// Spacing.
	m: "margin",
	mt: "margin-top",
	mr: "margin-right",
	mb: "margin-bottom",
	ml: "margin-left",
	mx: "margin-inline",
	my: "margin-block",
	p: "padding",
	pt: "padding-top",
	pr: "padding-right",
	pb: "padding-bottom",
	pl: "padding-left",
	px: "padding-inline",
	py: "padding-block",

	// Position.
	top: "top",
	right: "right",
	bottom: "bottom",
	left: "left",

	// Other.
	gap: "gap",
	"gap-x": "column-gap",
	"gap-y": "row-gap",
	text: "font-size",
	z: "z-index",

	// Colors.
	bg: "background-color",
	border: "border-color",
};

// Pattern: optional-negative + prefix + bracket-value.
const CUSTOM_VALUE_PATTERN = /^(-?)([\w-]+)-\[(.+)\]$/;
const VARIANT_PATTERN = /^(hover|focus|disabled|sm|md|lg|xl):(.+)$/;
const PSEUDO_STATES = ["hover", "focus", "disabled"];

// Module state.
const injectedRules = new Set<string>();
let styleSheet: CSSStyleSheet | null = null;

/** Check if CSSStyleSheet API is available. */
export function isSupported(): boolean {
	return (
		typeof document !== "undefined" &&
		typeof CSSStyleSheet !== "undefined" &&
		typeof document.createElement === "function"
	);
}

/** Escape CSS selector special characters. */
function escapeSelector(str: string): string {
	return str.replace(/[[\]#.:>+~()'"]/g, "\\$&");
}

/** Get or create the stylesheet. */
function getStyleSheet(): CSSStyleSheet | null {
	if (!isSupported()) return null;
	if (styleSheet) return styleSheet;

	const style = document.createElement("style");
	style.setAttribute("data-mancha", "custom");
	document.head.appendChild(style);

	// style.sheet may be null if the style element hasn't been attached to the DOM yet.
	if (!style.sheet) return null;

	styleSheet = style.sheet;
	return styleSheet;
}

/** Parse a custom value class. */
export function parseCustomValueClass(
	className: string,
): { property: string; value: string } | null {
	const match = className.match(CUSTOM_VALUE_PATTERN);
	if (!match) return null;

	const [, negative, prefix, rawValue] = match;
	const property = PROPERTY_MAP[prefix];
	if (!property) return null;

	const value = negative ? `-${rawValue}` : rawValue;
	return { property, value };
}

/** Inject a single custom value class (with optional variant). */
export function injectCustomClass(
	className: string,
	variant?: { type: "pseudo" | "media"; name: string },
): boolean {
	const fullClassName = variant ? `${variant.name}:${className}` : className;

	// Already injected.
	if (injectedRules.has(fullClassName)) return true;

	const parsed = parseCustomValueClass(className);
	if (!parsed) return false;

	const sheet = getStyleSheet();
	if (!sheet) return false;

	const { property, value } = parsed;
	const escapedClass = escapeSelector(fullClassName);

	let rule: string;
	if (!variant) {
		rule = `.${escapedClass} { ${property}: ${value}; }`;
	} else if (variant.type === "pseudo") {
		rule = `.${escapedClass}:${variant.name} { ${property}: ${value}; }`;
	} else {
		const bp = MEDIA_BREAKPOINTS[variant.name as keyof typeof MEDIA_BREAKPOINTS];
		rule = `@media (min-width: ${bp}px) { .${escapedClass} { ${property}: ${value}; } }`;
	}

	try {
		sheet.insertRule(rule, sheet.cssRules.length);
		injectedRules.add(fullClassName);
		return true;
	} catch (e) {
		console.warn(`Failed to inject CSS rule: ${rule}`, e);
		return false;
	}
}

/** Process a class string, inject CSS for any custom values. */
export function processClassString(classString: string): void {
	if (!classString || !classString.includes("[")) return;

	for (const cls of classString.trim().split(/\s+/)) {
		// Check for variant prefix.
		const variantMatch = cls.match(VARIANT_PATTERN);
		if (variantMatch) {
			const [, variantName, baseClass] = variantMatch;
			const isPseudo = PSEUDO_STATES.includes(variantName);
			const isMedia = variantName in MEDIA_BREAKPOINTS;
			if (isPseudo || isMedia) {
				injectCustomClass(baseClass, {
					type: isPseudo ? "pseudo" : "media",
					name: variantName,
				});
				continue;
			}
		}

		// Try as base class.
		injectCustomClass(cls);
	}
}

/** Scan a DOM tree and inject CSS for all custom values found. */
export function scanAndInject(root: Element | Document = document): void {
	if (!isSupported()) return;

	const elements = root.querySelectorAll("[class]");
	for (const el of elements) {
		const classAttr = el.getAttribute("class");
		if (classAttr) processClassString(classAttr);
	}
}

/** For testing: reset module state. */
export function _resetForTesting(): void {
	injectedRules.clear();
	if (styleSheet?.ownerNode) {
		(styleSheet.ownerNode as Element).remove();
	}
	styleSheet = null;
}

/** For testing: get injected rules. */
export function _getInjectedRules(): Set<string> {
	return injectedRules;
}
