import { hexToRgb, MEDIA_BREAKPOINTS, PROPS_COLORS } from "./css_gen_utils.js";

// Color property prefix to CSS property mapping.
const COLOR_PROPERTY_MAP: Record<string, string> = {
	text: "color",
	bg: "background-color",
	border: "border-color",
	fill: "fill",
	divide: "border-color",
	// Rings take their color from a custom property the width utilities read.
	ring: "--ring-color",
};

// Color opacity pattern: (text|bg|border|fill|divide|ring)-(color)(-shade)?/(opacity)
const COLOR_OPACITY_PATTERN = /^(text|bg|border|fill|divide|ring)-([\w-]+)\/(\d+)$/;

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
const VARIANT_PATTERN = /^(hover|focus|disabled|sm|md|lg|xl|dark|landscape|portrait):(.+)$/;
const PSEUDO_STATES = ["hover", "focus", "disabled"];
const ORIENTATIONS = ["landscape", "portrait"];

// A class per distinct dynamic value (`:class="'p-[' + px + 'px]'"`) can reach the negative
// cache, so it needs a ceiling. Past it the cache is dropped whole rather than evicted one
// entry at a time: the cost of being wrong is one re-walk, which is what the cache saves.
const MAX_FAILED_LOOKUPS = 256;

// How long the negative cache is trusted without re-checking whether the page's rules changed.
// Re-checking costs one read per stylesheet, which is cheap but not free, and paying it for
// every class on every scan would put a cost back on the path this cache exists to make free.
// The consequence is bounded: a sheet that starts defining a class is picked up a frame or two
// later rather than immediately.
const FINGERPRINT_MAX_AGE_MILLIS = 50;

// Module state.
const injectedRules = new Set<string>();
// Classes that resolved to no declarations, keyed by base class name since
// resolution does not depend on the variant. Without this a class that matches
// nothing re-walks every rule of every sheet on each scan, forever.
const failedLookups = new Set<string>();
// Classes already reported. Separate from failedLookups because that one is dropped whenever
// the page's rules change, and re-reporting the same dead class on every theme switch or lazy
// chunk is noise: the warning is about the class, which has not changed.
const warnedLookups = new Set<string>();
// Fingerprint of the page's rules when failedLookups was last known good, as a sheet loading
// after the first scan can define a class that did not resolve before.
let failedLookupsFingerprint = "";
let failedLookupsCheckedAt = 0;
let styleSheet: CSSStyleSheet | null = null;

/**
 * Cheap summary of the rules a lookup would search. Counting each sheet's rules as well as the
 * sheets themselves catches a `<link href>` swapped in place and rules inserted into a sheet
 * that was already there, which a count of sheets alone misses. Our own sheet is excluded so
 * that injecting a rule does not invalidate the cache that injection just consulted.
 *
 * Not detected: an edit that leaves every count identical, such as replacing a `<style>`
 * element's text with the same number of different rules. Catching that would mean reading
 * every selector on every call, which is the walk this cache exists to avoid.
 */
function ruleFingerprint(): string {
	const counts: number[] = [];
	for (const sheet of document.styleSheets) {
		if (sheet === styleSheet) continue;
		try {
			counts.push(sheet.cssRules.length);
		} catch {
			// Cross-origin stylesheets throw SecurityError; their rules are unreadable anyway.
			counts.push(-1);
		}
	}
	return counts.join(",");
}

/** Drop the negative cache when the rules a lookup would search have changed. */
function syncFailedLookups(): void {
	if (failedLookups.size === 0) return;

	// Throttled, so a scan of a thousand elements re-checks once rather than a thousand times.
	const now = Date.now();
	if (now - failedLookupsCheckedAt < FINGERPRINT_MAX_AGE_MILLIS) return;
	failedLookupsCheckedAt = now;

	const fingerprint = ruleFingerprint();
	if (fingerprint === failedLookupsFingerprint) return;
	failedLookups.clear();
	failedLookupsFingerprint = fingerprint;
}

/** Forget every cached failure, so the next lookup resolves from scratch. */
function clearFailedLookups(): void {
	failedLookups.clear();
	failedLookupsFingerprint = "";
	failedLookupsCheckedAt = 0;
}

/** Look up CSS declarations for an existing class from document stylesheets. */
function findRuleDeclarations(className: string): string | null {
	if (typeof document === "undefined") return null;
	// selectorText is serialized escaped (e.g. ".w-50\%"), so escape before comparing.
	const targetSelector = `.${escapeSelector(className)}`;
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
	// A consumer that installs a fuller set of DOM globals can make isSupported()
	// true while leaving CSS undefined. The regex fallback is approximate, but it
	// keeps those environments working.
	const css = (globalThis as { CSS?: { escape?: (str: string) => string } }).CSS;
	if (typeof css?.escape === "function") return css.escape(str);
	return str.replace(/[[\]#.:>+~()'"/%,!]/g, "\\$&");
}

/** Get or create the stylesheet. */
function getStyleSheet(): CSSStyleSheet | null {
	if (!isSupported()) return null;

	// Recreate the stylesheet if its element was removed from the document,
	// otherwise new rules would be inserted into a detached (invisible) sheet.
	if (styleSheet && !(styleSheet.ownerNode as Element)?.isConnected) {
		styleSheet = null;
		// The rules that lived in the removed sheet went with it, so forget them:
		// otherwise the dedup cache would suppress re-injecting them forever. Cached failures
		// survive: they record what the page's other sheets do not define, which losing our
		// own sheet does not change, and the fingerprint ignores our sheet for the same reason.
		injectedRules.clear();
	}
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

	const decoded = rawValue.replace(/_/g, " ");
	const value = negative ? `-${decoded}` : decoded;
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

	// Resolve the stylesheet before consulting the cache: getStyleSheet() drops
	// the cache when it has to recreate a removed sheet, and only the rules in
	// the live sheet count as injected.
	const sheet = getStyleSheet();
	if (!sheet) return false;

	// Already injected.
	if (injectedRules.has(fullClassName)) return true;

	// Known not to resolve. Checked after the injected cache so a class that was
	// once unresolvable still short-circuits on the cheaper path once it exists.
	syncFailedLookups();
	if (failedLookups.has(className)) return false;

	const escapedClass = escapeSelector(fullClassName);

	// Resolve CSS declarations: try parsers, then fall back to stylesheet lookup.
	const parsed = parseCustomValueClass(className) ?? parseColorOpacityClass(className);
	const declarations = parsed
		? `${parsed.property}: ${parsed.value};`
		: findRuleDeclarations(className);
	if (!declarations) {
		// Cache under the base name, but report the class as it was written: the base name of
		// `hover:bg-brand-500` appears nowhere in the markup, so it is not something a reader
		// can search for. Reported once per class for the life of the page.
		if (failedLookups.size >= MAX_FAILED_LOOKUPS) failedLookups.clear();
		if (failedLookups.size === 0) {
			failedLookupsFingerprint = ruleFingerprint();
			failedLookupsCheckedAt = Date.now();
		}
		failedLookups.add(className);
		if (!warnedLookups.has(fullClassName)) {
			warnedLookups.add(fullClassName);
			console.warn(`No CSS rule for class: ${fullClassName}`);
		}
		return false;
	}

	// Divide classes need a child selector suffix.
	const selectorSuffix = className.startsWith("divide-") ? " > :not(:last-child)" : "";

	// Build the rule based on variant type.
	let rule: string;
	if (!variant) {
		rule = `.${escapedClass}${selectorSuffix} { ${declarations} }`;
	} else if (variant.type === "pseudo") {
		rule = `.${escapedClass}${selectorSuffix}:${variant.name} { ${declarations} }`;
	} else if (variant.name === "dark") {
		rule = `@media (prefers-color-scheme: dark) { .${escapedClass}${selectorSuffix} { ${declarations} } }`;
	} else if (ORIENTATIONS.includes(variant.name)) {
		rule = `@media (orientation: ${variant.name}) { .${escapedClass}${selectorSuffix} { ${declarations} } }`;
	} else {
		const bp = MEDIA_BREAKPOINTS[variant.name as keyof typeof MEDIA_BREAKPOINTS];
		rule = `@media (min-width: ${bp}px) { .${escapedClass}${selectorSuffix} { ${declarations} } }`;
	}

	try {
		const index = sheet.insertRule(rule, sheet.cssRules.length);

		// The browser accepts a rule whose selector parses but whose declaration it
		// cannot use, and an @media wrapper parses even with an invalid inner
		// selector. Both leave an inert rule behind, so require a surviving
		// declaration before caching. Which level holds it follows from the rule we
		// built, not from the rule's shape: CSS Nesting gives plain style rules a
		// cssRules list too, and `instanceof CSSMediaRule` would throw in a DOM shim
		// lacking that global.
		const inserted = sheet.cssRules[index];
		const styleRule = (
			variant?.type === "media" ? (inserted as CSSGroupingRule).cssRules[0] : inserted
		) as CSSStyleRule | undefined;
		if (!styleRule?.style?.length) {
			sheet.deleteRule(index);
			console.warn(`Injected CSS rule had no effect: ${rule}`);
			// Deliberately left uncached, so every later scan re-inserts, re-detects
			// and re-warns for this class. That repeats once per scan rather than
			// being bounded, but it keeps dead classes out of the cache.
			return false;
		}

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
			const isOrientation = ORIENTATIONS.includes(variantName);
			if (isPseudo || isMedia || isDark || isOrientation) {
				injectCustomClass(baseClass, {
					type: isPseudo ? "pseudo" : "media",
					name: variantName,
				});
				continue;
			}
		}

		// Skip plain tokens that don't need custom injection — they're already
		// in the static utilities stylesheet and re-injecting them here would
		// create duplicate rules that break CSS cascade (e.g. dark mode).
		if (!needsProcessing(cls)) continue;

		// Try as base class.
		injectCustomClass(cls);
	}
}

/** Scan a DOM tree and inject CSS for all custom values found. Defaults to the whole document. */
export function scanAndInject(root?: Element | Document | DocumentFragment): void {
	// Guard first: a default parameter would evaluate `document` before this
	// runs and throw on the server, where the global does not exist.
	if (!isSupported()) return;
	const target = root ?? document;

	// querySelectorAll only matches descendants; include the root's own classes.
	if (target instanceof Element) {
		const rootClass = target.getAttribute("class");
		if (rootClass) processClassString(rootClass);
	}

	const elements = target.querySelectorAll("[class]");
	for (const el of elements) {
		const classAttr = el.getAttribute("class");
		if (classAttr) processClassString(classAttr);
	}
}

/** Check whether utils CSS is active in the document; gates the render hooks. */
function utilsCssActive(): boolean {
	return isSupported() && document.querySelector('style[data-mancha="utils"]') !== null;
}

/**
 * Render hook: scan a tree rendered by mount() for on-demand rules.
 * Content rendered during mount (e.g. includes) postdates the injectCss()
 * scan, so its variant classes (lg:, hover:, etc.) must be injected here.
 * No-op unless utils CSS is in use, so apps using their own CSS are left alone.
 */
export function scanRenderedTree(root: Node): void {
	if (!utilsCssActive()) return;
	const elem = root as Element;
	if (typeof elem.querySelectorAll !== "function") return;
	scanAndInject(elem);
}

/**
 * Render hook: process a class string written by a directive (e.g. :class).
 * Expression results may contain variant classes that never appear in any
 * class attribute until a state change, so no DOM scan can see them.
 */
export function processRenderedClasses(classString: string): void {
	// Cheap string pre-check before touching the DOM.
	if (!classString || !needsProcessing(classString)) return;
	if (!utilsCssActive()) return;
	processClassString(classString);
}

/** For testing: reset module state. */
export function _resetForTesting(): void {
	injectedRules.clear();
	clearFailedLookups();
	warnedLookups.clear();
	if (styleSheet?.ownerNode) {
		(styleSheet.ownerNode as Element).remove();
	}
	styleSheet = null;
}

/** For testing: get injected rules. */
export function _getInjectedRules(): Set<string> {
	return injectedRules;
}

/** For testing: get classes cached as unresolvable. */
export function _getFailedLookups(): Set<string> {
	return failedLookups;
}
