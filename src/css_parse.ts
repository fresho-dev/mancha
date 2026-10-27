import { hexToRgb, PROPS_COLORS } from "./css_gen_utils.js";

/** A single CSS declaration resolved from a class name. */
export type Declaration = { property: string; value: string };

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

// Theme names, as in Tailwind v4: `bg-brand` reads `--color-brand`, `rounded-card` `--radius-card`.
const THEME_CLASS_PATTERN = /^(text|bg|border|fill|divide|ring|rounded)-([\w-]+?)(?:\/(\d+))?$/;

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

// Pattern: optional-negative + prefix + bracket-value + optional color opacity.
const CUSTOM_VALUE_PATTERN = /^(-?)([\w-]+)-\[(.+)\](?:\/(\d+))?$/;
// Variable shorthand, as in Tailwind v4: `bg-(--x)` is `bg-[var(--x)]`; `text-(length:--x)` is a size.
const VAR_VALUE_PATTERN = /^(-?)([\w-]+)-\((?:(length|color):)?(--[\w-]+)\)(?:\/(\d+))?$/;
// Properties a leading `-` can negate; elsewhere a negative value is invalid or meaningless.
const NEGATABLE = /^(margin|top|right|bottom|left|z-index)/;
// Bracket values are spliced into the rule verbatim, so allow only characters that cannot end it.
const SAFE_VALUE = /^[\w#.%+*/(),!-]+$/;

/** Mix a color with transparency, or null for an opacity outside 0-100. */
function withOpacity(property: string, value: string, opacity?: string): Declaration | null {
	if (opacity === undefined) return { property, value };
	const percent = Number.parseInt(opacity, 10);
	if (percent > 100) return null;
	return { property, value: `color-mix(in oklab, ${value} ${percent}%, transparent)` };
}

/** Parse a custom value class, in bracket (`w-[1px]`) or variable (`w-(--x)`) form. */
export function parseCustomValueClass(className: string): Declaration | null {
	let negative: string;
	let prefix: string;
	let value: string;
	let hint: string | undefined;
	let opacity: string | undefined;
	const shorthand = className.match(VAR_VALUE_PATTERN);
	if (shorthand) {
		[, negative, prefix, hint, value, opacity] = shorthand;
		value = negative ? `calc(var(${value}) * -1)` : `var(${value})`;
	} else {
		const match = className.match(CUSTOM_VALUE_PATTERN);
		if (!match) return null;
		let rawValue: string;
		[, negative, prefix, rawValue, opacity] = match;
		if (!SAFE_VALUE.test(rawValue) || rawValue.includes("/*")) return null;
		let depth = 0;
		for (const c of rawValue) {
			depth += c === "(" ? 1 : c === ")" ? -1 : 0;
			if (depth < 0) return null;
		}
		if (depth) return null;
		const decoded = rawValue.replace(/_/g, " ");
		value = negative ? `-${decoded}` : decoded;
	}

	let property = PROPERTY_MAP[prefix];
	if (!property) return null;
	if (prefix === "text" || prefix === "border") {
		if (negative) return null;
		if (!(hint ? hint === "length" : LENGTH_VALUE.test(value))) {
			if (!COLOR_VALUE.test(value)) return null;
			property = COLOR_PROPERTY_MAP[prefix];
		}
	} else if (hint) {
		return null;
	}
	if (negative && !NEGATABLE.test(property)) return null;
	if (opacity !== undefined && !property.endsWith("color")) return null;
	return withOpacity(property, value, opacity);
}

/** Parse a color opacity class like bg-red-500/50. */
export function parseColorOpacityClass(className: string): Declaration | null {
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

/** Parse a theme class like bg-brand/50, if `isDefined` reports its variable. */
export function parseThemeClass(
	className: string,
	isDefined: (variable: string) => boolean,
): Declaration | null {
	const match = className.match(THEME_CLASS_PATTERN);
	if (!match) return null;

	const [, prefix, name, opacity] = match;
	const radius = prefix === "rounded";
	const variable = `--${radius ? "radius" : "color"}-${name}`;
	if ((radius && opacity !== undefined) || !isDefined(variable)) return null;
	const property = radius ? "border-radius" : COLOR_PROPERTY_MAP[prefix];
	return withOpacity(property, `var(${variable})`, opacity);
}
