import { MEDIA_BREAKPOINTS } from "./css_gen_utils.js";
import {
	type Declaration,
	parseColorOpacityClass,
	parseCustomValueClass,
	parseThemeClass,
} from "./css_parse.js";

// A plain class a theme variable could define, e.g. `bg-brand`.
const THEME_CANDIDATE = /^(?:text|bg|border|fill|divide|ring|rounded)-[\w-]+$/;
// The class a static rule's selector starts with, escapes included, as in `.w-1\/2`.
const STATIC_NAME = /^\.((?:[\w-]|\\.)+)/;

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

/** Variant prefixes: "print" or a value starting with "(" is a media query, else a selector suffix. */
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
	print: "print",
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
// Rules without a variant, which sit at the start of our sheet.
let plainRules = 0;
// Rules with print:, which sit at the end of our sheet.
let printRules = 0;
// The static utilities sheet and the class names it defines, which theme names never override.
let utilsSheet: CSSStyleSheet | null = null;
let utilsNames = new Set<string>();
// Custom properties the root defines, snapshotted per task, and the sheet count it was read at.
let rootProperties: { names: Set<string>; sheets: number } | null = null;

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
			// @import rules lead a sheet, after any @layer statements, and their sheets load later.
			for (const rule of sheet.cssRules) {
				if ("nameList" in rule) continue;
				if (!("styleSheet" in rule)) break;
				counts.push(childRules(rule)?.length ?? -1);
			}
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
	const search = (rules: CSSRuleList): string | null => {
		for (const rule of rules) {
			if ((rule as CSSStyleRule).selectorText === targetSelector) {
				return (rule as CSSStyleRule).style.cssText;
			}
			const imported = "styleSheet" in rule ? childRules(rule) : undefined;
			const found = imported && search(imported);
			if (found) return found;
		}
		return null;
	};
	for (const sheet of document.styleSheets) {
		try {
			const found = search(sheet.cssRules);
			if (found) return found;
		} catch {
			// Cross-origin stylesheets throw SecurityError.
		}
	}
	return null;
}

/** A rule's nested or @import-ed rules, or undefined if it has none or they are unreadable. */
function childRules(rule: CSSRule): CSSRuleList | undefined {
	try {
		return (rule as CSSGroupingRule).cssRules ?? (rule as CSSImportRule).styleSheet?.cssRules;
	} catch {
		// A cross-origin @import throws SecurityError.
		return undefined;
	}
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
		plainRules = 0;
		printRules = 0;
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

	// Resolve CSS declarations: parsers first, then the page's own rules, then theme names.
	// A value the browser rejects defers to the page's own rule for the class, if any.
	let declarations = usable(parseCustomValueClass(className) ?? parseColorOpacityClass(className));
	const fromPage = !declarations && variants.length > 0;
	if (fromPage) declarations = findRuleDeclarations(className);
	// For a plain class, a rule for exactly it beats a theme name; a selector naming it does not.
	const use = declarations || variants.length ? null : pageUse(className);
	if (use !== "own" && !declarations && !staticUtilities()?.has(className)) {
		declarations = usable(parseThemeClass(className, rootDefines));
	}
	if (!declarations && use) {
		// The page's own rules already apply to a plain class; a copy would only reorder the cascade.
		injectedRules.add(fullClassName);
		return true;
	}
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
		// A media type must lead the query, once: `print and print` is `not all`.
		if (cond === "print") {
			if (media[0] !== cond) media.unshift(cond);
		} else if (cond.startsWith("(")) media.push(cond);
		else selector += cond;
	}
	const isMedia = media.length > 0;
	const print = media[0] === "print";
	const inner = `.${escapedClass}${selector}${selectorSuffix} { ${declarations} }`;
	const rule = isMedia ? `@media ${media.join(" and ")} { ${inner} }` : inner;

	try {
		// Plain rules go before every variant rule, so a breakpoint can override them, and
		// print rules after, so they win over whatever else matches while printing.
		const plain = variants.length === 0;
		const length = sheet.cssRules.length;
		const index = sheet.insertRule(
			rule,
			plain ? Math.min(plainRules, length) : print ? length : Math.max(0, length - printRules),
		);

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
			if (!fromPage) return recordFailure(className, fullClassName);
			console.warn(`Injected CSS rule had no effect: ${rule}`);
			// Deliberately left uncached, so every later scan re-inserts, re-detects
			// and re-warns for this class. That repeats once per scan rather than
			// being bounded, but it keeps dead classes out of the cache.
			return false;
		}

		if (plain) plainRules++;
		if (print) printRules++;
		injectedRules.add(fullClassName);
		return true;
	} catch {
		// Keyed by the class as written: a variant can break the selector of a base that resolves.
		return recordFailure(fullClassName, fullClassName);
	}
}

/** A parsed declaration as rule text, or null when the browser rejects its value. */
function usable(parsed: Declaration | null): string | null {
	const css = (globalThis as { CSS?: { supports?: (cond: string) => boolean } }).CSS;
	if (!parsed || css?.supports?.(`${parsed.property}: ${parsed.value}`) === false) return null;
	return `${parsed.property}: ${parsed.value};`;
}

/** Check if a class contains any patterns that need on-demand injection. */
function needsProcessing(cls: string): boolean {
	return /[[:/(]/.test(cls);
}

/** Class names the static utilities define, or null when they are not in the document. */
function staticUtilities(): Set<string> | null {
	if (!isSupported()) return null;
	if (!(utilsSheet?.ownerNode as Element | null)?.isConnected) {
		const style = document.querySelector<HTMLStyleElement>('style[data-mancha="utils"]');
		utilsSheet = style?.sheet ?? null;
		if (!utilsSheet) return null;
		utilsNames = new Set();
		for (const rule of utilsSheet.cssRules) {
			const name = (rule as CSSStyleRule).selectorText?.match(STATIC_NAME)?.[1];
			if (name) utilsNames.add(name.replace(/\\(.)/g, "$1"));
		}
	}
	return utilsNames;
}

/** Whether the root element defines a custom property, which is where theme tokens live. */
function rootDefines(variable: string): boolean {
	if (typeof getComputedStyle !== "function") return false;
	// Reading computed style after an insert forces a style recalc, so snapshot the names once
	// per task, and again only if a stylesheet appears.
	if (rootProperties?.sheets !== document.styleSheets.length) {
		if (!rootProperties) queueMicrotask(() => (rootProperties = null));
		const names = new Set<string>();
		for (const name of getComputedStyle(document.documentElement)) {
			if (name.startsWith("--")) names.add(name);
		}
		rootProperties = { names, sheets: document.styleSheets.length };
	}
	if (rootProperties.names.has(variable)) return true;
	// A token set since the snapshot, e.g. inline on <html>; only a miss pays for this recalc.
	if (!getComputedStyle(document.documentElement).getPropertyValue(variable).trim()) return false;
	rootProperties = null;
	return true;
}

/** Whether a selector names the escaped class `token`, not just a class it prefixes. */
function mentions(selector: string, token: string): boolean {
	for (let i = selector.indexOf(token); i >= 0; i = selector.indexOf(token, i + 1)) {
		const next = selector[i + token.length] ?? "";
		if (!/[\w-]/.test(next) && next !== "\\") return true;
	}
	return false;
}

/** Whether the utilities or page sheets have a rule for exactly a class, only name it, or neither. */
function pageUse(className: string): "own" | "mention" | null {
	if (staticUtilities()?.has(className)) return "own";
	const token = `.${escapeSelector(className)}`;
	let use: "own" | "mention" | null = null;
	const search = (rules: CSSRuleList): void => {
		for (const rule of rules) {
			if (use === "own") return;
			const selector = (rule as CSSStyleRule).selectorText;
			if (selector === token) use = "own";
			else if (selector !== undefined && mentions(selector, token)) use = "mention";
			const nested = childRules(rule);
			if (nested) search(nested);
		}
	};
	for (const sheet of document.styleSheets) {
		// Every utils sheet matches the static names already checked, however often it was injected.
		const owner = (sheet.ownerNode as Element | null)?.getAttribute?.("data-mancha");
		if (sheet === styleSheet || owner === "utils") continue;
		if (use === "own") break;
		try {
			search(sheet.cssRules);
		} catch {
			// Cross-origin stylesheets throw SecurityError; their rules are unreadable anyway.
		}
	}
	return use;
}

/** Process a class string, inject CSS for any custom values. */
export function processClassString(classString: string): void {
	if (!classString) return;

	for (const cls of classString.trim().split(/\s+/)) {
		// Skip plain tokens that don't need custom injection — they're already
		// in the static utilities stylesheet and re-injecting them here would
		// create duplicate rules that break CSS cascade (e.g. dark mode).
		// Plain names the static sheet lacks may be theme names, or typos to report.
		if (!needsProcessing(cls)) {
			if (THEME_CANDIDATE.test(cls) && staticUtilities()?.has(cls) === false) {
				injectCustomClass(cls);
			}
			continue;
		}

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
		injectCustomClass(baseClass, ...variants);
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
	if (!classString || !utilsCssActive()) return;
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
	plainRules = 0;
	printRules = 0;
	utilsSheet = null;
	rootProperties = null;
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
