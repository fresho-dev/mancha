export const MEDIA_BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 };
const MEDIA_ENTRIES = Object.entries(MEDIA_BREAKPOINTS);
export const REM_UNIT = 0.25;
// Generate 1-15
const UNITS_SM = [...Array(15)].map((_, i) => i + 1);
const UNITS_LG = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64];
const UNITS_XL = [72, 80, 96, 128, 160, 192, 256, 320, 384, 512];
export const UNITS_ALL = [
	...UNITS_SM,
	...UNITS_LG,
	...UNITS_XL,
	...Object.values(MEDIA_BREAKPOINTS),
];
export const PERCENTS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);
export const COLOR_OPACITY_MODIFIERS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const DURATIONS = [25, 50, 75, 100, 150, 200, 300, 500, 700, 1000];
// Margin and padding share a shape but not a value grammar: margin takes
// negatives and `auto`, padding takes neither.
export const PROPS_MARGIN = { margin: "m" };
export const PROPS_PADDING = { padding: "p" };
export const PROPS_SPACING = { ...PROPS_MARGIN, ...PROPS_PADDING };
export const PROPS_SIZING = {
	width: "w",
	height: "h",
};
export const PROPS_POSITION = {
	top: "top",
	right: "right",
	bottom: "bottom",
	left: "left",
};
export const PROPS_SIZING_MINMAX = {
	"min-width": "min-w",
	"min-height": "min-h",
	"max-width": "max-w",
	"max-height": "max-h",
};
// Shared timing-function and duration so every transition helper animates
// standalone (e.g. `transition-opacity duration-300`) without needing `transition`.
const TRANSITION_BASE =
	"transition-timing-function: ease-in-out; transition-duration: var(--transition-duration, 150ms)";
const RING_COLOR_DEFAULT = "rgb(59 130 246 / 0.5)";
const RING_COLOR = `var(--ring-color, ${RING_COLOR_DEFAULT})`;

export const PROPS_CUSTOM: { [key: string]: string } = {
	// Based on https://tailwindcss.com.
	// Font family.
	"font-mono": "font-family: monospace",
	"font-sans": "font-family: sans-serif",
	"font-serif": "font-family: serif",
	"font-cursive": "font-family: cursive",
	// Font size.
	"text-xs": "font-size: .75rem; line-height: calc(1 / 0.75)",
	"text-sm": "font-size: .875rem; line-height: calc(1.25 / 0.875)",
	"text-base": "font-size: 1rem; line-height: calc(1.5 / 1)",
	"text-lg": "font-size: 1.125rem; line-height: calc(1.75 / 1.125)",
	"text-xl": "font-size: 1.25rem; line-height: calc(1.75 / 1.25)",
	"text-2xl": "font-size: 1.5rem; line-height: calc(2 / 1.5)",
	"text-3xl": "font-size: 1.875rem; line-height: calc(2.25 / 1.875)",
	"text-4xl": "font-size: 2.25rem; line-height: calc(2.5 / 2.25)",
	"text-5xl": "font-size: 3rem; line-height: 1",
	"text-6xl": "font-size: 3.75rem; line-height: 1",
	"text-7xl": "font-size: 4.5rem; line-height: 1",
	// Font weight.
	"font-thin": "font-weight: 100",
	"font-extralight": "font-weight: 200",
	"font-light": "font-weight: 300",
	"font-normal": "font-weight: 400",
	"font-medium": "font-weight: 500",
	"font-semibold": "font-weight: 600",
	"font-bold": "font-weight: 700",
	"font-extrabold": "font-weight: 800",
	"font-black": "font-weight: 900",
	// Font style.
	italic: "font-style: italic",
	"not-italic": "font-style: normal",
	// Sizing.
	"w-max": "width: max-content",
	"w-min": "width: min-content",
	"w-fit": "width: fit-content",
	"h-max": "height: max-content",
	"h-min": "height: min-content",
	"h-fit": "height: fit-content",
	"size-auto": "width: auto; height: auto",
	"size-px": "width: 1px; height: 1px",
	"size-full": "width: 100%; height: 100%",
	"size-dvw": "width: 100dvw; height: 100dvw",
	"size-dvh": "width: 100dvh; height: 100dvh",
	"size-lvw": "width: 100lvw; height: 100lvw",
	"size-lvh": "width: 100lvh; height: 100lvh",
	"size-svw": "width: 100svw; height: 100svw",
	"size-svh": "width: 100svh; height: 100svh",
	"size-min": "width: min-content; height: min-content",
	"size-max": "width: max-content; height: max-content",
	"size-fit": "width: fit-content; height: fit-content",
	// Letter spacing.
	"tracking-tighter": "letter-spacing: -0.05em",
	"tracking-tight": "letter-spacing: -0.025em",
	"tracking-normal": "letter-spacing: 0",
	"tracking-wide": "letter-spacing: 0.025em",
	"tracking-wider": "letter-spacing: 0.05em",
	"tracking-widest": "letter-spacing: 0.1em",
	// Line height.
	"leading-none": "line-height: 1",
	"leading-tight": "line-height: 1.25",
	"leading-snug": "line-height: 1.375",
	"leading-normal": "line-height: 1.5",
	"leading-relaxed": "line-height: 1.625",
	"leading-loose": "line-height: 2",
	// Text align.
	"text-left": "text-align: left",
	"text-right": "text-align: right",
	"text-center": "text-align: center",
	"text-justify": "text-align: justify",
	// Text decoration.
	underline: "text-decoration: underline",
	"no-underline": "text-decoration: none",
	"decoration-none": "text-decoration: none",
	"line-through": "text-decoration: line-through",
	// Text transform.
	uppercase: "text-transform: uppercase",
	lowercase: "text-transform: lowercase",
	capitalize: "text-transform: capitalize",
	// Text overflow.
	truncate: "white-space: nowrap; overflow: hidden; text-overflow: ellipsis",
	"text-elipsis": "text-overflow: ellipsis",
	"text-clip": "text-overflow: clip",
	// Text wrap.
	"text-wrap": "text-wrap: wrap",
	"text-nowrap": "text-wrap: nowrap",
	"text-balance": "text-wrap: balance",
	"text-pretty": "text-wrap: pretty",
	// Whitespace.
	"whitespace-normal": "white-space: normal",
	"whitespace-nowrap": "white-space: nowrap",
	"whitespace-pre": "white-space: pre",
	"whitespace-pre-line": "white-space: pre-line",
	"whitespace-pre-wrap": "white-space: pre-wrap",
	"whitespace-break-spaces": "white-space: break-spaces",
	// Position.
	relative: "position: relative",
	fixed: "position: fixed",
	absolute: "position: absolute",
	sticky: "position: sticky",
	// Object fit.
	"object-contain": "object-fit: contain",
	"object-cover": "object-fit: cover",
	"object-fill": "object-fit: fill",
	"object-none": "object-fit: none",
	// Display.
	block: "display: block",
	contents: "display: contents",
	hidden: "display: none",
	inline: "display: inline",
	"inline-block": "display: inline-block",
	// Visibility.
	visible: "visibility: visible",
	invisible: "visibility: hidden",
	collapse: "visibility: collapse",
	// List style type.
	"list-none": "list-style-type: none",
	"list-disc": "list-style-type: disc",
	"list-decimal": "list-style-type: decimal",
	// Flex.
	flex: "display: flex",
	grid: "display: grid",
	"flex-1": "flex: 1 1 0%",
	"flex-inline": "display: inline-flex",
	"flex-row": "flex-direction: row",
	"flex-col": "flex-direction: column",
	"flex-row-reverse": "flex-direction: row-reverse",
	"flex-col-reverse": "flex-direction: column-reverse",
	"flex-wrap": "flex-wrap: wrap",
	"flex-wrap-reverse": "flex-wrap: wrap-reverse",
	"flex-nowrap": "flex-wrap: nowrap",
	"justify-start": "justify-content: flex-start",
	"justify-end": "justify-content: flex-end",
	"justify-center": "justify-content: center",
	"justify-between": "justify-content: space-between",
	"justify-around": "justify-content: space-around",
	"justify-evenly": "justify-content: space-evenly",
	"justify-stretch": "justify-content: stretch",
	"items-start": "align-items: flex-start",
	"items-end": "align-items: flex-end",
	"items-center": "align-items: center",
	"items-stretch": "align-items: stretch",
	"flex-grow": "flex-grow: 1",
	"flex-shrink": "flex-shrink: 1",
	// Vertical alignment.
	"align-baseline": "vertical-align: baseline",
	"align-top": "vertical-align: top",
	"align-middle": "vertical-align: middle",
	"align-bottom": "vertical-align: bottom",
	"align-text-top": "vertical-align: text-top",
	"align-text-bottom": "vertical-align: text-bottom",
	// Overflow.
	"overflow-auto": "overflow: auto",
	"overflow-x-auto": "overflow-x: auto",
	"overflow-y-auto": "overflow-y: auto",
	"overflow-hidden": "overflow: hidden",
	"overflow-x-hidden": "overflow-x: hidden",
	"overflow-y-hidden": "overflow-y: hidden",
	"overflow-visible": "overflow: visible",
	// Overscroll.
	"overscroll-auto": "overscroll-behavior: auto",
	"overscroll-contain": "overscroll-behavior: contain",
	"overscroll-none": "overscroll-behavior: none",
	"overscroll-x-auto": "overscroll-behavior-x: auto",
	"overscroll-x-contain": "overscroll-behavior-x: contain",
	"overscroll-x-none": "overscroll-behavior-x: none",
	"overscroll-y-auto": "overscroll-behavior-y: auto",
	"overscroll-y-contain": "overscroll-behavior-y: contain",
	"overscroll-y-none": "overscroll-behavior-y: none",
	// Z-index.
	"z-auto": "z-index: auto",
	// Cursors.
	"cursor-pointer": "cursor: pointer",
	"cursor-wait": "cursor: wait",
	"cursor-not-allowed": "cursor: not-allowed",
	// User selection.
	"select-none": "user-select: none",
	"select-all": "user-select: all",
	// Events.
	"pointer-events-auto": "pointer-events: auto",
	"pointer-events-none": "pointer-events: none",
	// Sizing.
	"box-border": "box-sizing: border-box",
	"box-content": "box-sizing: content-box",
	// Resizing.
	resize: "resize: both",
	"resize-x": "resize: horizontal",
	"resize-y": "resize: vertical",
	"resize-none": "resize: none",
	// Appearance.
	"appearance-none": "appearance: none; -webkit-appearance: none; -moz-appearance: none",
	// Borders.
	border: "border: 1px solid",
	"border-none": "border: none",
	"border-solid": "border-style: solid",
	"border-dashed": "border-style: dashed",
	"border-dotted": "border-style: dotted",
	"border-collapse": "border-collapse: collapse",
	// Radius.
	"rounded-none": "border-radius: 0",
	rounded: "border-radius: .25rem",
	"rounded-sm": "border-radius: .125rem",
	"rounded-md": "border-radius: .375rem",
	"rounded-lg": "border-radius: .5rem",
	"rounded-xl": "border-radius: .75rem",
	"rounded-full": "border-radius: 9999px",
	// Shadows (matching Tailwind CSS).
	"shadow-2xs": "box-shadow: 0 1px rgb(0 0 0 / 0.05)",
	"shadow-xs": "box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)",
	shadow: "box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	"shadow-sm": "box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	"shadow-md": "box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
	"shadow-lg": "box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
	"shadow-xl": "box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
	"shadow-2xl": "box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)",
	"shadow-inner": "box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
	"shadow-none": "box-shadow: 0 0 #0000",
	// Ring utilities for focus states. The color goes through --ring-color so the
	// generated ring-<color> classes can override it; the fallback is the default.
	ring: `box-shadow: var(--ring-inset, ) 0 0 0 3px ${RING_COLOR}`,
	"ring-0": `box-shadow: var(--ring-inset, ) 0 0 0 0px ${RING_COLOR}`,
	"ring-1": `box-shadow: var(--ring-inset, ) 0 0 0 1px ${RING_COLOR}`,
	"ring-2": `box-shadow: var(--ring-inset, ) 0 0 0 2px ${RING_COLOR}`,
	"ring-4": `box-shadow: var(--ring-inset, ) 0 0 0 4px ${RING_COLOR}`,
	"ring-8": `box-shadow: var(--ring-inset, ) 0 0 0 8px ${RING_COLOR}`,
	"ring-inset": "--ring-inset: inset",
	// Outline utilities.
	outline: "outline-style: solid",
	"outline-none": "outline: 2px solid transparent; outline-offset: 2px",
	"outline-dashed": "outline-style: dashed",
	"outline-dotted": "outline-style: dotted",
	"outline-double": "outline-style: double",
	"outline-0": "outline-width: 0px",
	"outline-1": "outline-width: 1px",
	"outline-2": "outline-width: 2px",
	"outline-4": "outline-width: 4px",
	"outline-8": "outline-width: 8px",
	"outline-offset-0": "outline-offset: 0px",
	"outline-offset-1": "outline-offset: 1px",
	"outline-offset-2": "outline-offset: 2px",
	"outline-offset-4": "outline-offset: 4px",
	"outline-offset-8": "outline-offset: 8px",
	// Aspect ratio utilities.
	"aspect-auto": "aspect-ratio: auto",
	"aspect-square": "aspect-ratio: 1 / 1",
	"aspect-video": "aspect-ratio: 16 / 9",
	// Backdrop filter utilities.
	"backdrop-blur-none": "backdrop-filter: blur(0)",
	"backdrop-blur-sm": "backdrop-filter: blur(4px)",
	"backdrop-blur": "backdrop-filter: blur(8px)",
	"backdrop-blur-md": "backdrop-filter: blur(12px)",
	"backdrop-blur-lg": "backdrop-filter: blur(16px)",
	"backdrop-blur-xl": "backdrop-filter: blur(24px)",
	"backdrop-blur-2xl": "backdrop-filter: blur(40px)",
	"backdrop-blur-3xl": "backdrop-filter: blur(64px)",
	// Transitions.
	"transition-none": "transition: none",
	transition: `transition-property: all; ${TRANSITION_BASE}`,
	// Per-property helpers mirroring Tailwind's transition-property utilities.
	"transition-all": `transition-property: all; ${TRANSITION_BASE}`,
	"transition-opacity": `transition-property: opacity; ${TRANSITION_BASE}`,
	"transition-transform": `transition-property: transform; ${TRANSITION_BASE}`,
	"transition-shadow": `transition-property: box-shadow; ${TRANSITION_BASE}`,
	"transition-colors": `transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; ${TRANSITION_BASE}`,
	// Animations.
	"animate-none": "animation: none",
	"animate-spin": "animation: spin 1s linear infinite",
	"animate-ping": "animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
	"animate-pulse": "animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
	// Backgrounds.
	"bg-auto": "background-size: auto",
	"bg-cover": "background-size: cover",
	"bg-contain": "background-size: contain",
	"bg-center": "background-position: center",
	"bg-top": "background-position: top",
	"bg-bottom": "background-position: bottom",
	"bg-left": "background-position: left",
	"bg-right": "background-position: right",
	"bg-left-top": "background-position: left top",
	"bg-left-bottom": "background-position: left bottom",
	"bg-right-top": "background-position: right top",
	"bg-right-bottom": "background-position: right bottom",
	"bg-no-repeat": "background-repeat: no-repeat",
	"bg-fixed": "background-attachment: fixed",
	"bg-local": "background-attachment: local",
	"bg-scroll": "background-attachment: scroll",
	// Screen/viewport sizing.
	"min-h-screen": "min-height: 100vh",
	"max-h-screen": "max-height: 100vh",
	"min-w-screen": "min-width: 100vw",
	"h-dvh": "height: 100dvh",
	"h-svh": "height: 100svh",
	"h-lvh": "height: 100lvh",
	"w-dvw": "width: 100dvw",
	"w-svw": "width: 100svw",
	"w-lvw": "width: 100lvw",
	"min-h-dvh": "min-height: 100dvh",
	"min-h-svh": "min-height: 100svh",
	"min-h-lvh": "min-height: 100lvh",
	// Flexbox enhancements.
	"flex-none": "flex: none",
	"flex-auto": "flex: 1 1 auto",
	"flex-initial": "flex: 0 1 auto",
	grow: "flex-grow: 1",
	"grow-0": "flex-grow: 0",
	shrink: "flex-shrink: 1",
	"shrink-0": "flex-shrink: 0",
	"self-auto": "align-self: auto",
	"self-start": "align-self: flex-start",
	"self-end": "align-self: flex-end",
	"self-center": "align-self: center",
	"self-stretch": "align-self: stretch",
	"self-baseline": "align-self: baseline",
	"content-normal": "align-content: normal",
	"content-start": "align-content: flex-start",
	"content-end": "align-content: flex-end",
	"content-center": "align-content: center",
	"content-between": "align-content: space-between",
	"content-around": "align-content: space-around",
	"content-evenly": "align-content: space-evenly",
	"content-stretch": "align-content: stretch",
	"items-baseline": "align-items: baseline",
	// Inset utilities.
	"inset-0": "inset: 0",
	"inset-auto": "inset: auto",
	"inset-x-0": "left: 0; right: 0",
	"inset-y-0": "top: 0; bottom: 0",
	"inset-x-auto": "left: auto; right: auto",
	"inset-y-auto": "top: auto; bottom: auto",
	// Accessibility.
	"sr-only":
		"position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0",
	"not-sr-only":
		"position: static; width: auto; height: auto; padding: 0; margin: 0; overflow: visible; clip: auto; white-space: normal",
};
// Emitted verbatim, so they carry no indentation: every other rule this module
// produces is minified, and these ship in the same stylesheet.
const PROPS_AS_IS = [
	// --ring-color is a custom property, so without this it would inherit: `ring-red-500` on an
	// element would colour every descendant's ring too, and a page using `--ring-color` for its
	// own purposes would recolour every ring on it — or erase them, since an invalid custom
	// property makes the whole box-shadow compute to `none` rather than falling back. Declaring
	// the default on every element stops inheritance from ever reaching one, while the ring-<color>
	// classes still win on specificity. The `var()` fallback stays for anyone using the ring
	// declarations without this sheet.
	`*,::before,::after{--ring-color:${RING_COLOR_DEFAULT}}`,
	"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
	"@keyframes ping{75%,100%{transform:scale(2);opacity:0}}",
	"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}",
];

/**
 * The Material palette. Every hue carries the same ten shades, so the table is
 * stored as three flat pieces — hue names, shade stops, and one run of 6-digit
 * hex — instead of 19 nested objects that repeat the same keys. Written out, the
 * repeated syntax costs roughly a tenth of the compressed bundle for data that
 * never changes; packed, it costs the hex itself. Entry (hue i, shade j) lives
 * at offset (i * 10 + j) * 6, which css_gen_utils.test.ts pins.
 */
const COLOR_NAMES =
	"red pink purple deep-purple indigo blue light-blue cyan teal green light-green lime yellow amber orange deep-orange brown gray blue-gray".split(
		" ",
	);
const COLOR_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const COLOR_HEX =
	"ffebeeffcdd2ef9a9ae57373ef5350f44336e53935d32f2fc62828b71c1cfce4ecf8bbd0f48fb1f06292ec407ae91e63d81b60c2185bad1457880e4ff3e5f5e1bee7ce93d8ba68c8ab47bc9c27b08e24aa7b1fa26a1b9a4a148cede7f6d1c4e9b39ddb9575cd7e57c2673ab75e35b1512da84527a0311b92e8eaf6c5cae99fa8da7986cb5c6bc03f51b53949ab303f9f2835931a237ee3f2fdbbdefb90caf964b5f642a5f52196f31e88e51976d21565c00d47a1e1f5feb3e5fc81d4fa4fc3f729b6f603a9f4039be50288d10277bd01579be0f7fab2ebf280deea4dd0e126c6da00bcd400acc10097a700838f006064e0f2f1b2dfdb80cbc44db6ac26a69a00968800897b00796b00695c004d40e8f5e9c8e6c9a5d6a781c78466bb6a4caf5043a047388e3c2e7d321b5e20f1f8e9dcedc8c5e1a5aed5819ccc658bc34a7cb342689f38558b2f33691ef9fbe7f0f4c3e6ee9cdce775d4e157cddc39c0ca33afb42b9e9d24827717fffde7fff9c4fff59dfff176ffee58ffeb3bfdd835fbc02df9a825f57f17fff8e1ffecb3ffe082ffd54fffca28ffc107ffb300ffa000ff8f00ff6f00fff3e0ffe0b2ffcc80ffb74dffa726ff9800fb8c00f57c00ef6c00e65100fbe9e7ffccbcffab91ff8a65ff7043ff5722f4511ee64a19d84315bf360cefebe9d7ccc8bcaaa4a1887f8d6e637955486d4c415d40374e342e3e2723fafafaf5f5f5eeeeeee0e0e0bdbdbd9e9e9e757575616161424242212121eceff1cfd8dcb0bec590a4ae78909c607d8b546e7a455a6437474f263238";

export const PROPS_COLORS: { [key: string]: { [key: number]: string } } = Object.fromEntries(
	COLOR_NAMES.map((name, i) => [
		name,
		Object.fromEntries(
			COLOR_SHADES.map((shade, j) => {
				const at = (i * COLOR_SHADES.length + j) * 6;
				return [shade, `#${COLOR_HEX.slice(at, at + 6)}`];
			}),
		),
	]),
);

// Pseudo-state and responsive variants are now generated on-demand by css_custom.ts.
function wrap(pairs: string[][]): string[] {
	return pairs.map(([klass, rule]) => `.${klass} { ${rule} }`);
}

// Which value forms a property actually accepts. Negative lengths are legal for
// margins and positional offsets only; `auto` is legal everywhere except
// padding. Generating the rest anyway left rules the browser parsed and then
// discarded, so they cost bytes and matched nothing.
const SIGNS_ANY = ["", "-"];
const SIGNS_POSITIVE = [""];

/** Box sides, paired with the letter their utility classes use. */
const SIDES: Array<[side: string, letter: string]> = [
	["top", "t"],
	["bottom", "b"],
	["left", "l"],
	["right", "r"],
];

/**
 * The rem / pixel / percentage triple that every length utility offers.
 * `sign` prefixes both the class and the value, so a negative class carries a
 * negative length.
 */
function scaled(
	sign: string,
	klass: (suffix: string) => string,
	decl: (value: string) => string,
): string[][] {
	const at = (suffix: string, value: string) => [
		`${sign}${klass(suffix)}`,
		decl(`${sign}${value}`),
	];
	return [
		...UNITS_ALL.map((v) => at(`${v}`, `${v * REM_UNIT}rem`)),
		...UNITS_ALL.map((v) => at(`${v}px`, `${v}px`)),
		...PERCENTS.map((v) => at(`${v}\\%`, `${v}%`)),
	];
}

function posneg(props: { [key: string]: string }, signs: string[] = SIGNS_ANY): string[] {
	return wrap(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}-0`, `${prop}: 0`],
			[`${klass}-screen`, `${prop}: 100v${prop.includes("height") ? "h" : "w"}`],
			[`${klass}-full`, `${prop}: 100%`],
			...signs.flatMap((sign) =>
				scaled(
					sign,
					(s) => `${klass}-${s}`,
					(v) => `${prop}: ${v}`,
				),
			),
			...MEDIA_ENTRIES.map(([bp, width]) => [`${klass}-${bp}`, `${prop}: ${width}px`]),
		]),
	);
}

/** `auto` shorthand, for properties that accept it. */
function autoShorthand(props: { [key: string]: string }): string[] {
	return wrap(Object.entries(props).map(([prop, klass]) => [`${klass}-auto`, `${prop}: auto`]));
}

/** `auto` on each axis and side, for properties with longhands that accept it. */
function autoSides(props: { [key: string]: string }): string[] {
	return wrap(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}x-auto`, `${prop}-left: auto; ${prop}-right: auto;`],
			[`${klass}y-auto`, `${prop}-top: auto; ${prop}-bottom: auto;`],
			...SIDES.map(([side, letter]) => [`${klass}${letter}-auto`, `${prop}-${side}: auto`]),
		]),
	);
}

/**
 * Axis (x/y) split, for properties with -left/-right/-top/-bottom longhands.
 * Width and height have none, so they are not eligible.
 */
function axis(props: { [key: string]: string }): string[] {
	return wrap(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}x-0`, `${prop}-left: 0; ${prop}-right: 0;`],
			[`${klass}y-0`, `${prop}-top: 0; ${prop}-bottom: 0;`],
			...scaled(
				"",
				(s) => `${klass}x-${s}`,
				(v) => `${prop}-left: ${v}; ${prop}-right: ${v};`,
			),
			...scaled(
				"",
				(s) => `${klass}y-${s}`,
				(v) => `${prop}-top: ${v}; ${prop}-bottom: ${v};`,
			),
		]),
	);
}

function tblr(props: { [key: string]: string }, signs: string[] = SIGNS_ANY): string[] {
	return wrap(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}t-0`, `${prop}-top: 0`],
			[`${klass}b-0`, `${prop}-bottom: 0`],
			[`${klass}l-0`, `${prop}-left: 0`],
			[`${klass}r-0`, `${prop}-right: 0`],
			...signs.flatMap((sign) =>
				SIDES.flatMap(([side, letter]) =>
					scaled(
						sign,
						(s) => `${klass}${letter}-${s}`,
						(v) => `${prop}-${side}: ${v}`,
					),
				),
			),
		]),
	);
}

function border(): string[] {
	return wrap([
		[`border`, `border-width: 1px`],
		[`border-x`, `border-inline-width: 1px`],
		[`border-y`, `border-block-width: 1px`],
		...[0, ...UNITS_SM].map((v) => [`border-${v}`, `border-width: ${v}px`]),
		...[0, ...UNITS_SM].map((v) => [`border-x-${v}`, `border-inline-width: ${v}px;`]),
		...[0, ...UNITS_SM].map((v) => [`border-y-${v}`, `border-block-width: ${v}px;`]),
		...SIDES.flatMap(([side, letter]) => [
			[`border-${letter}`, `border-${side}-width: 1px`],
			...[0, ...UNITS_SM].map((v) => [`border-${letter}-${v}`, `border-${side}-width: ${v}px`]),
		]),
	]);
}

function zIndex(): string[] {
	return wrap(PERCENTS.map((v) => [`z-${v}`, `z-index: ${v}`]));
}

function transitions(): string[] {
	return wrap(
		DURATIONS.map((v) => [
			`duration-${v}`,
			`--transition-duration: ${v}ms; transition-duration: ${v}ms`,
		]),
	);
}

function between(): string[] {
	return wrap([
		[`space-x-0 > *`, `margin-left: 0`],
		[`space-y-0 > *`, `margin-top: 0`],
		...UNITS_ALL.map((v) => [
			`space-x-${v} > :not(:first-child)`,
			`margin-left: ${v * REM_UNIT}rem`,
		]),
		...UNITS_ALL.map((v) => [
			`space-y-${v} > :not(:first-child)`,
			`margin-top: ${v * REM_UNIT}rem`,
		]),
		...UNITS_ALL.map((v) => [`space-x-${v}px > :not(:first-child)`, `margin-left: ${v}px`]),
		...UNITS_ALL.map((v) => [`space-y-${v}px > :not(:first-child)`, `margin-top: ${v}px`]),
		[`gap-0`, `gap: 0`],
		...UNITS_ALL.map((v) => [`gap-${v}`, `gap: ${v * REM_UNIT}rem`]),
		...UNITS_ALL.map((v) => [`gap-${v}px`, `gap: ${v}px`]),
		...UNITS_ALL.map((v) => [`gap-x-${v}`, `column-gap: ${v * REM_UNIT}rem`]),
		...UNITS_ALL.map((v) => [`gap-y-${v}`, `row-gap: ${v * REM_UNIT}rem`]),
		...UNITS_ALL.map((v) => [`gap-x-${v}px`, `column-gap: ${v}px`]),
		...UNITS_ALL.map((v) => [`gap-y-${v}px`, `row-gap: ${v}px`]),
		// Divide utilities for adding borders between child elements.
		[`divide-x > :not(:last-child)`, `border-inline-end-width: 1px`],
		[`divide-y > :not(:last-child)`, `border-bottom-width: 1px`],
		[`divide-x-0 > :not(:last-child)`, `border-inline-end-width: 0px`],
		[`divide-y-0 > :not(:last-child)`, `border-bottom-width: 0px`],
		...[2, 4, 8].map((v) => [
			`divide-x-${v} > :not(:last-child)`,
			`border-inline-end-width: ${v}px`,
		]),
		...[2, 4, 8].map((v) => [`divide-y-${v} > :not(:last-child)`, `border-bottom-width: ${v}px`]),
		[`divide-solid > :not(:last-child)`, `border-style: solid`],
		[`divide-dashed > :not(:last-child)`, `border-style: dashed`],
		[`divide-dotted > :not(:last-child)`, `border-style: dotted`],
		[`divide-none > :not(:last-child)`, `border-style: none`],
	]);
}

function textSizes(): string[] {
	return wrap([
		...Array.from({ length: 100 }, (_, i) => [`text-${i}px`, `font-size: ${i}px`]),
		// Sizes are fractional, and a bare "." in a selector starts a new compound
		// selector, so escape it here. Markup keeps class="text-1.25rem" unescaped.
		...Array.from({ length: 100 }, (_, i) => [
			`text-${String(i * REM_UNIT).replace(".", "\\.")}rem`,
			`font-size: ${i * REM_UNIT}rem`,
		]),
	]);
}

function gridPatterns(): string[] {
	return wrap(
		["column", "row"].flatMap((axis) => {
			const short = axis.slice(0, 3);
			return [
				// Grid template: grid-cols-*, grid-rows-*
				...Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [
					`grid-${short}s-${n}`,
					`grid-template-${axis}s: repeat(${n}, minmax(0, 1fr))`,
				]),
				[`grid-${short}s-none`, `grid-template-${axis}s: none`],

				// Grid span: col-span-*, row-span-*
				...Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [
					`${short}-span-${n}`,
					`grid-${axis}: span ${n} / span ${n}`,
				]),
				[`${short}-span-full`, `grid-${axis}: 1 / -1`],

				// Grid start/end: col-start-*, row-start-*, col-end-*, row-end-*
				...Array.from({ length: 13 }, (_, i) => i + 1).map((n) => [
					`${short}-start-${n}`,
					`grid-${axis}-start: ${n}`,
				]),
				[`${short}-start-auto`, `grid-${axis}-start: auto`],
				...Array.from({ length: 13 }, (_, i) => i + 1).map((n) => [
					`${short}-end-${n}`,
					`grid-${axis}-end: ${n}`,
				]),
				[`${short}-end-auto`, `grid-${axis}-end: auto`],
			];
		}),
	);
}

function custom(): string[] {
	return Object.entries(PROPS_CUSTOM).map(([klass, decls]) => `.${klass} { ${decls} }`);
}

export function hexToRgb(hex: string): string {
	let r = 0,
		g = 0,
		b = 0;
	if (hex.length === 4) {
		r = parseInt(hex[1] + hex[1], 16);
		g = parseInt(hex[2] + hex[2], 16);
		b = parseInt(hex[3] + hex[3], 16);
	} else if (hex.length === 7) {
		r = parseInt(hex.slice(1, 3), 16);
		g = parseInt(hex.slice(3, 5), 16);
		b = parseInt(hex.slice(5, 7), 16);
	}
	return `${r} ${g} ${b}`;
}

/**
 * Every class prefix that takes a color, with the property it writes and any selector it has to
 * append. A table rather than a line each, so the docs generator can name the prefixes from here
 * instead of keeping its own copy — which drifted twice, most recently by omitting `ring-`.
 */
export const COLOR_PROPS: Array<[prefix: string, property: string, suffix: string]> = [
	["text", "color", ""],
	["fill", "fill", ""],
	["bg", "background-color", ""],
	["border", "border-color", ""],
	["divide", "border-color", " > :not(:last-child)"],
	["ring", "--ring-color", ""],
];

// Color opacity variants are now generated on-demand by css_custom.ts.
function colors(): string[] {
	const colorVariants = (color: string, value: string): string[][] =>
		COLOR_PROPS.map(([prefix, property, suffix]) => [
			`${prefix}-${color}${suffix}`,
			`${property}: ${value}`,
		]);
	return wrap([
		...colorVariants("white", "#fff"),
		...colorVariants("black", "#000"),
		...colorVariants("transparent", "transparent"),
		...Object.entries(PROPS_COLORS).flatMap(([color, shades]) => [
			...colorVariants(color, shades[500]),
			...Object.entries(shades).flatMap(([shade, hex]) => colorVariants(`${color}-${shade}`, hex)),
		]),
	]);
}

function opacity(): string[] {
	return wrap([
		[`opacity-0`, `opacity: 0`],
		...PERCENTS.map((v) => [`opacity-${v}`, `opacity: ${v / 100}`]),
	]);
}

let cachedRules: string | null = null;

export default function rules(): string {
	if (cachedRules !== null) return cachedRules;
	cachedRules = [
		// As-is.
		...PROPS_AS_IS,
		// Custom.
		...custom(),
		// Colors.
		...colors(),
		// Opacity.
		...opacity(),
		// Z-Index.
		...zIndex(),
		// Transitions.
		...transitions(),
		// Position.
		...posneg(PROPS_POSITION),
		// Sizing. Width and height take neither negatives nor an axis split.
		...posneg(PROPS_SIZING, SIGNS_POSITIVE),
		...autoShorthand(PROPS_SIZING),
		// Spacing. Order matters: shorthand (p-*) -> axis (px-*) -> sides (pt-*),
		// so the more targeted rule wins the cascade at equal specificity.
		...posneg(PROPS_MARGIN),
		...posneg(PROPS_PADDING, SIGNS_POSITIVE),
		...autoShorthand(PROPS_MARGIN),
		...autoSides(PROPS_MARGIN),
		...axis(PROPS_SPACING),
		...tblr(PROPS_MARGIN),
		...tblr(PROPS_PADDING, SIGNS_POSITIVE),
		...between(),
		// Minmax.
		...posneg(PROPS_SIZING_MINMAX, SIGNS_POSITIVE),
		// Border.
		...border(),
		// Text sizes.
		...textSizes(),
		// Grid.
		...gridPatterns(),
	].join("\n");
	return cachedRules;
}
