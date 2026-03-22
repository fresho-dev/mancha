import { hexToRgb, MEDIA_BREAKPOINTS, PROPS_COLORS } from "./css_gen_utils.js";

// Color property prefix to CSS property mapping.
const COLOR_PROPERTY_MAP: Record<string, string> = {
	text: "color",
	bg: "background-color",
	border: "border-color",
	fill: "fill",
};

// Color opacity pattern: (text|bg|border|fill)-(color)(-shade)?/(opacity)
const COLOR_OPACITY_PATTERN = /^(text|bg|border|fill)-([\w-]+)\/(\d+)$/;

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
const VARIANT_PATTERN = /^(hover|focus|disabled|sm|md|lg|xl|dark):(.+)$/;
const PSEUDO_STATES = ["hover", "focus", "disabled"];

// Module state.
const injectedRules = new Set<string>();
let styleSheet: CSSStyleSheet | null = null;

/** Look up CSS declarations for an existing class from document stylesheets. */
function findRuleDeclarations(className: string): string | null {
	if (typeof document === "undefined") return null;
	const targetSelector = `.${className}`;
	for (const sheet of document.styleSheets) {
		try {
			for (const rule of sheet.cssRules) {
				if (rule instanceof CSSStyleRule && rule.selectorText === targetSelector) {
					return rule.style.cssText;
				}
			}
		} catch {
			// Cross-origin stylesheets throw SecurityError.
		}
	}
	return null;
}

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
	return str.replace(/[[\]#.:>+~()'"/]/g, "\\$&");
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

/** Parse a color opacity class like bg-red-500/50. */
export function parseColorOpacityClass(
	className: string,
): { property: string; value: string } | null {
	const match = className.match(COLOR_OPACITY_PATTERN);
	if (!match) return null;

	const [, prefix, colorPart, opacityStr] = match;
	const property = COLOR_PROPERTY_MAP[prefix];
	if (!property) return null;

	const opacity = Number.parseInt(opacityStr, 10);
	if (opacity < 0 || opacity > 100) return null;

	// Resolve color hex value.
	let hex: string | null = null;
	if (colorPart === "white") hex = "#fff";
	else if (colorPart === "black") hex = "#000";
	else {
		// Try color-shade (e.g., "red-500") or plain color (e.g., "red" → shade 500).
		const dashIdx = colorPart.lastIndexOf("-");
		if (dashIdx > 0) {
			const colorName = colorPart.substring(0, dashIdx);
			const shade = Number.parseInt(colorPart.substring(dashIdx + 1), 10);
			hex = PROPS_COLORS[colorName]?.[shade] ?? null;
		}
		if (!hex) {
			hex = PROPS_COLORS[colorPart]?.[500] ?? null;
		}
	}
	if (!hex) return null;

	const rgb = hexToRgb(hex);
	const alpha = opacity / 100;
	return { property, value: `rgb(${rgb} / ${alpha})` };
}

/** Inject a single custom value class (with optional variant). */
export function injectCustomClass(
	className: string,
	variant?: { type: "pseudo" | "media"; name: string },
): boolean {
	const fullClassName = variant ? `${variant.name}:${className}` : className;

	// Already injected.
	if (injectedRules.has(fullClassName)) return true;

	const sheet = getStyleSheet();
	if (!sheet) return false;

	const escapedClass = escapeSelector(fullClassName);

	// Resolve CSS declarations: try parsers, then fall back to stylesheet lookup.
	const parsed = parseCustomValueClass(className) ?? parseColorOpacityClass(className);
	const declarations = parsed
		? `${parsed.property}: ${parsed.value};`
		: findRuleDeclarations(className);
	if (!declarations) return false;

	// Build the rule based on variant type.
	let rule: string;
	if (!variant) {
		rule = `.${escapedClass} { ${declarations} }`;
	} else if (variant.type === "pseudo") {
		rule = `.${escapedClass}:${variant.name} { ${declarations} }`;
	} else if (variant.name === "dark") {
		rule = `@media (prefers-color-scheme: dark) { .${escapedClass} { ${declarations} } }`;
	} else {
		const bp = MEDIA_BREAKPOINTS[variant.name as keyof typeof MEDIA_BREAKPOINTS];
		rule = `@media (min-width: ${bp}px) { .${escapedClass} { ${declarations} } }`;
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

/** Check if a class string contains any patterns that need on-demand injection. */
function needsProcessing(classString: string): boolean {
	return classString.includes("[") || classString.includes(":") || classString.includes("/");
}

/** Process a class string, inject CSS for any custom values. */
export function processClassString(classString: string): void {
	if (!classString || !needsProcessing(classString)) return;

	for (const cls of classString.trim().split(/\s+/)) {
		// Check for variant prefix.
		const variantMatch = cls.match(VARIANT_PATTERN);
		if (variantMatch) {
			const [, variantName, baseClass] = variantMatch;
			const isPseudo = PSEUDO_STATES.includes(variantName);
			const isMedia = variantName in MEDIA_BREAKPOINTS;
			const isDark = variantName === "dark";
			if (isPseudo || isMedia || isDark) {
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
