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
	"grid-cols": "grid-template-columns",
	"grid-rows": "grid-template-rows",
	rounded: "border-radius",
	leading: "line-height",

	// Colors.
	bg: "background-color",
	border: "border-width",
};

// `text-[…]` and `border-[…]` take a size, else a color or other identifier, as in Tailwind.
const LENGTH_VALUE =
	/^(-?[\d.]+[a-z%]*|(calc|min|max|clamp)\(.*\)|(x*-)?(small|large)|smaller|larger|medium|thin|thick)$/i;
const COLOR_VALUE = /^(#([\da-f]{3,4}|([\da-f]{2}){3,4})|[a-z-]+(\(.*\))?)$/i;

// Pattern: optional-negative + prefix + bracket-value.
const CUSTOM_VALUE_PATTERN = /^(-?)([\w-]+)-\[(.+)\]$/;
// Bracket values are spliced into the rule verbatim, so allow only characters that cannot end it.
const SAFE_VALUE = /^[\w#.%+*/(),!-]+$/;
// Splits `variant:class` at the first colon outside brackets.
const VARIANT_SPLIT = /^((?:[^:[]|\[[^\]]*\])+):(.+)$/;

// Arbitrary forms: `aria-[name=value]:` and `has-[selector]:`, the latter checked for balance below.
const ARIA_VARIANT = /^aria-\[([\w-]+)=([\w-]+)\]$/;
const HAS_VARIANT = /^has-\[([\w:.#>+~*(),-]+)\]$/;
const ARIA_STATES = [
	"busy",
	"checked",
	"disabled",
	"expanded",
	"hidden",
	"pressed",
	"readonly",
	"required",
	"selected",
];
const HAS_STATES = ["checked", "focus", "disabled", "hover"];

/** Variant prefixes: a value starting with "(" is a media condition, else a selector suffix. */
export const VARIANTS: Record<string, string> = {
	hover: ":hover",
	focus: ":focus",
	disabled: ":disabled",
	empty: ":empty",
	...Object.fromEntries(ARIA_STATES.map((s) => [`aria-${s}`, `[aria-${s}="true"]`])),
	...Object.fromEntries(HAS_STATES.map((s) => [`has-${s}`, `:has(*:${s})`])),
	dark: "(prefers-color-scheme: dark)",
	landscape: "(orientation: landscape)",
	portrait: "(orientation: portrait)",
	...Object.fromEntries(
		Object.entries(MEDIA_BREAKPOINTS).map(([bp, px]) => [bp, `(min-width: ${px}px)`]),
	),
};

/** CSS for a variant prefix, or undefined if it is not one. */
function variantCss(name: string): string | undefined {
	if (Object.hasOwn(VARIANTS, name)) return VARIANTS[name];
	const aria = name.match(ARIA_VARIANT);
	if (aria) return `[aria-${aria[1]}="${aria[2]}"]`;
	const has = name.match(HAS_VARIANT)?.[1];
	if (!has) return undefined;
	// Unbalanced parentheses could close :has() early and widen the selector.
	let depth = 0;
	for (const c of has) {
		depth += c === "(" ? 1 : c === ")" ? -1 : 0;
		if (depth < 0) return undefined;
	}
	return depth ? undefined : `:has(${has})`;
}

// A class per distinct dynamic value (`:class="'p-[' + px + 'px]'"`) can reach the negative
// cache, so it needs a ceiling. Past it the cache is dropped whole rather than evicted one
// entry at a time: the cost of being wrong is one re-walk, which is what the cache saves.
const MAX_FAILED_LOOKUPS = 256;

// Module state.
const injectedRules = new Set<string>();
// Classes that resolved to no declarations, keyed by base class name since resolution does not
// depend on the variant, or by full name when insertRule rejected it. Without this a class that
// matches nothing re-walks every rule of every sheet on each scan, forever.
const failedLookups = new Set<string>();
// Classes already reported. Separate from failedLookups because that one is dropped whenever
// the page's rules change, and re-reporting the same dead class on every theme switch or lazy
// chunk is noise: the warning is about the class, which has not changed.
const warnedLookups = new Set<string>();
// Fingerprint of the page's rules when failedLookups was last known good, as a sheet loading
// after the first scan can define a class that did not resolve before.
let failedLookupsFingerprint = "";
// Sheet count when the fingerprint was read this task, or -1: a scan pays for it once per task.
let failedLookupsCheckedSheets = -1;
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

/** Record that the fingerprint is current until the end of this task. */
function markFingerprintChecked(): void {
	if (failedLookupsCheckedSheets < 0) {
		queueMicrotask(() => {
			failedLookupsCheckedSheets = -1;
		});
	}
	failedLookupsCheckedSheets = document.styleSheets.length;
}

/** Drop the negative cache when the rules a lookup would search have changed. */
function syncFailedLookups(): void {
	if (failedLookups.size === 0) return;
	if (document.styleSheets.length === failedLookupsCheckedSheets) return;
	markFingerprintChecked();

	const fingerprint = ruleFingerprint();
	if (fingerprint === failedLookupsFingerprint) return;
	failedLookups.clear();
	failedLookupsFingerprint = fingerprint;
}

/** Forget every cached failure, so the next lookup resolves from scratch. */
function clearFailedLookups(): void {
	failedLookups.clear();
	failedLookupsFingerprint = "";
	failedLookupsCheckedSheets = -1;
}

/** Report an unresolvable class once, as written. */
function warnUnresolved(fullClassName: string): void {
	if (warnedLookups.has(fullClassName)) return;
	if (warnedLookups.size >= MAX_FAILED_LOOKUPS) warnedLookups.clear();
	warnedLookups.add(fullClassName);
	console.warn(`No CSS rule for class: ${fullClassName}`);
}

/** Cache a class as unresolvable under `key` and report it as written. */
function recordFailure(key: string, fullClassName: string): false {
	if (failedLookups.size >= MAX_FAILED_LOOKUPS) failedLookups.clear();
	if (failedLookups.size === 0) {
		failedLookupsFingerprint = ruleFingerprint();
		markFingerprintChecked();
	}
	failedLookups.add(key);
	warnUnresolved(fullClassName);
	return false;
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
	let property = PROPERTY_MAP[prefix];
	if (!property || !SAFE_VALUE.test(rawValue) || rawValue.includes("/*")) return null;
	let depth = 0;
	for (const c of rawValue) {
		depth += c === "(" ? 1 : c === ")" ? -1 : 0;
		if (depth < 0) return null;
	}
	if (depth) return null;

	const decoded = rawValue.replace(/_/g, " ");
	if (prefix === "text" || prefix === "border") {
		if (negative) return null;
		if (!LENGTH_VALUE.test(decoded)) {
			if (!COLOR_VALUE.test(decoded)) return null;
			property = COLOR_PROPERTY_MAP[prefix];
		}
	}
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

/** Inject a single custom value class (with optional stacked variants). */
export function injectCustomClass(className: string, ...variants: string[]): boolean {
	const fullClassName = [...variants, className].join(":");

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
	if (failedLookups.has(className) || failedLookups.has(fullClassName)) {
		warnUnresolved(fullClassName);
		return false;
	}

	const escapedClass = escapeSelector(fullClassName);

	// Resolve CSS declarations: try parsers, then fall back to stylesheet lookup.
	const parsed = parseCustomValueClass(className) ?? parseColorOpacityClass(className);
	// A value the browser rejects defers to the page's own rule for the class, if any.
	const css = (globalThis as { CSS?: { supports?: (cond: string) => boolean } }).CSS;
	const usable = parsed && css?.supports?.(`${parsed.property}: ${parsed.value}`) !== false;
	const declarations = usable
		? `${parsed.property}: ${parsed.value};`
		: findRuleDeclarations(className);
	if (!declarations) {
		// Cache under the base name, but report the class as it was written: the base name of
		// `hover:bg-brand-500` appears nowhere in the markup, so it is not something a reader
		// can search for.
		return recordFailure(className, fullClassName);
	}

	// Divide classes need a child selector suffix.
	const selectorSuffix = className.startsWith("divide-") ? " > :not(:last-child)" : "";

	let selector = "";
	const media: string[] = [];
	for (const variant of variants) {
		const cond = variantCss(variant) ?? "";
		if (cond.startsWith("(")) media.push(cond);
		else selector += cond;
	}
	const isMedia = media.length > 0;
	const inner = `.${escapedClass}${selector}${selectorSuffix} { ${declarations} }`;
	const rule = isMedia ? `@media ${media.join(" and ")} { ${inner} }` : inner;

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
		const styleRule = (isMedia ? (inserted as CSSGroupingRule).cssRules[0] : inserted) as
			| CSSStyleRule
			| undefined;
		if (!styleRule?.style?.length) {
			sheet.deleteRule(index);
			// An @media holding no rule means the inner selector was rejected, which is permanent.
			if (!styleRule) return recordFailure(fullClassName, fullClassName);
			// A parsed value is fixed, so an unusable one never recovers.
			if (parsed) return recordFailure(className, fullClassName);
			console.warn(`Injected CSS rule had no effect: ${rule}`);
			// Deliberately left uncached, so every later scan re-inserts, re-detects
			// and re-warns for this class. That repeats once per scan rather than
			// being bounded, but it keeps dead classes out of the cache.
			return false;
		}

		injectedRules.add(fullClassName);
		return true;
	} catch {
		// Keyed by the class as written: a variant can break the selector of a base that resolves.
		return recordFailure(fullClassName, fullClassName);
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
		const variants: string[] = [];
		let baseClass = cls;
		// Peel known prefixes; the rest, colons included, is the base class.
		for (
			let m = cls.match(VARIANT_SPLIT);
			m && variantCss(m[1]) !== undefined;
			m = baseClass.match(VARIANT_SPLIT)
		) {
			variants.push(m[1]);
			baseClass = m[2];
		}
		if (variants.length) {
			injectCustomClass(baseClass, ...variants);
			continue;
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

/** For testing: get classes already reported as unresolvable. */
export function _getWarnedLookups(): Set<string> {
	return warnedLookups;
}
