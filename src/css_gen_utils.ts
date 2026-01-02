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
const PSEUDO_STATES = ["hover", "focus"];
export const PROPS_SPACING = {
	margin: "m",
	padding: "p",
};
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
export const PROPS_CUSTOM = {
	// Based on https://tailwindcss.com.
	// Font family.
	"font-mono": { "font-family": "monospace" },
	"font-sans": { "font-family": "sans-serif" },
	"font-serif": { "font-family": "serif" },
	"font-cursive": { "font-family": "cursive" },
	// Font size.
	"text-xs": { "font-size": ".75rem", "line-height": "calc(1 / 0.75)" },
	"text-sm": { "font-size": ".875rem", "line-height": "calc(1.25 / 0.875)" },
	"text-base": { "font-size": "1rem", "line-height": "calc(1.5 / 1)" },
	"text-lg": { "font-size": "1.125rem", "line-height": "calc(1.75 / 1.125)" },
	"text-xl": { "font-size": "1.25rem", "line-height": "calc(1.75 / 1.25)" },
	"text-2xl": { "font-size": "1.5rem", "line-height": "calc(2 / 1.5)" },
	"text-3xl": { "font-size": "1.875rem", "line-height": "calc(2.25 / 1.875)" },
	"text-4xl": { "font-size": "2.25rem", "line-height": "calc(2.5 / 2.25)" },
	"text-5xl": { "font-size": "3rem", "line-height": "1" },
	"text-6xl": { "font-size": "3.75rem", "line-height": "1" },
	"text-7xl": { "font-size": "4.5rem", "line-height": "1" },
	// Font weight.
	"font-thin": { "font-weight": 100 },
	"font-extralight": { "font-weight": 200 },
	"font-light": { "font-weight": 300 },
	"font-normal": { "font-weight": 400 },
	"font-medium": { "font-weight": 500 },
	"font-semibold": { "font-weight": 600 },
	"font-bold": { "font-weight": 700 },
	"font-extrabold": { "font-weight": 800 },
	"font-black": { "font-weight": 900 },
	// Font style.
	italic: { "font-style": "italic" },
	"not-italic": { "font-style": "normal" },
	// Sizing.
	"w-max": { width: "max-content" },
	"w-min": { width: "min-content" },
	"w-fit": { width: "fit-content" },
	"h-max": { height: "max-content" },
	"h-min": { height: "min-content" },
	"h-fit": { height: "fit-content" },
	"size-auto": { width: "auto", height: "auto" },
	"size-px": { width: "1px", height: "1px" },
	"size-full": { width: "100%", height: "100%" },
	"size-dvw": { width: "100dvw", height: "100dvw" },
	"size-dvh": { width: "100dvh", height: "100dvh" },
	"size-lvw": { width: "100lvw", height: "100lvw" },
	"size-lvh": { width: "100lvh", height: "100lvh" },
	"size-svw": { width: "100svw", height: "100svw" },
	"size-svh": { width: "100svh", height: "100svh" },
	"size-min": { width: "min-content", height: "min-content" },
	"size-max": { width: "max-content", height: "max-content" },
	"size-fit": { width: "fit-content", height: "fit-content" },
	// Letter spacing.
	"tracking-tighter": { "letter-spacing": "-0.05em" },
	"tracking-tight": { "letter-spacing": "-0.025em" },
	"tracking-normal": { "letter-spacing": "0" },
	"tracking-wide": { "letter-spacing": "0.025em" },
	"tracking-wider": { "letter-spacing": "0.05em" },
	"tracking-widest": { "letter-spacing": "0.1em" },
	// Line height.
	"leading-none": { "line-height": "1" },
	"leading-tight": { "line-height": "1.25" },
	"leading-snug": { "line-height": "1.375" },
	"leading-normal": { "line-height": "1.5" },
	"leading-relaxed": { "line-height": "1.625" },
	"leading-loose": { "line-height": "2" },
	// Text align.
	"text-left": { "text-align": "left" },
	"text-right": { "text-align": "right" },
	"text-center": { "text-align": "center" },
	"text-justify": { "text-align": "justify" },
	// Text decoration.
	underline: { "text-decoration": "underline" },
	"no-underline": { "text-decoration": "none" },
	"decoration-none": { "text-decoration": "none" },
	"line-through": { "text-decoration": "line-through" },
	// Text transform.
	uppercase: { "text-transform": "uppercase" },
	lowercase: { "text-transform": "lowercase" },
	capitalize: { "text-transform": "capitalize" },
	// Text overflow.
	truncate: { "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" },
	"text-elipsis": { "text-overflow": "ellipsis" },
	"text-clip": { "text-overflow": "clip" },
	// Text wrap.
	"text-wrap": { "text-wrap": "wrap" },
	"text-nowrap": { "text-wrap": "nowrap" },
	"text-balance": { "text-wrap": "balance" },
	"text-pretty": { "text-wrap": "pretty" },
	// Whitespace.
	"whitespace-normal": { "white-space": "normal" },
	"whitespace-nowrap": { "white-space": "nowrap" },
	"whitespace-pre": { "white-space": "pre" },
	"whitespace-pre-line": { "white-space": "pre-line" },
	"whitespace-pre-wrap": { "white-space": "pre-wrap" },
	"whitespace-break-spaces": { "white-space": "break-spaces" },
	// Position.
	relative: { position: "relative" },
	fixed: { position: "fixed" },
	absolute: { position: "absolute" },
	sticky: { position: "sticky" },
	// Object fit.
	"object-contain": { "object-fit": "contain" },
	"object-cover": { "object-fit": "cover" },
	"object-fill": { "object-fit": "fill" },
	"object-none": { "object-fit": "none" },
	// Display.
	block: { display: "block" },
	contents: { display: "contents" },
	hidden: { display: "none" },
	inline: { display: "inline" },
	"inline-block": { display: "inline-block" },
	// Visibility.
	visible: { visibility: "visible" },
	invisible: { visibility: "hidden" },
	collapse: { visibility: "collapse" },
	// List style type.
	"list-none": { "list-style-type": "none" },
	"list-disc": { "list-style-type": "disc" },
	"list-decimal": { "list-style-type": "decimal" },
	// Flex.
	flex: { display: "flex" },
	grid: { display: "grid" },
	"flex-1": { flex: "1 1 0%" },
	"flex-inline": { display: "inline-flex" },
	"flex-row": { "flex-direction": "row" },
	"flex-col": { "flex-direction": "column" },
	"flex-row-reverse": { "flex-direction": "row-reverse" },
	"flex-col-reverse": { "flex-direction": "column-reverse" },
	"flex-wrap": { "flex-wrap": "wrap" },
	"flex-wrap-reverse": { "flex-wrap": "wrap-reverse" },
	"flex-nowrap": { "flex-wrap": "nowrap" },
	"justify-start": { "justify-content": "flex-start" },
	"justify-end": { "justify-content": "flex-end" },
	"justify-center": { "justify-content": "center" },
	"justify-between": { "justify-content": "space-between" },
	"justify-around": { "justify-content": "space-around" },
	"justify-evenly": { "justify-content": "space-evenly" },
	"justify-stretch": { "justify-content": "stretch" },
	"items-start": { "align-items": "flex-start" },
	"items-end": { "align-items": "flex-end" },
	"items-center": { "align-items": "center" },
	"items-stretch": { "align-items": "stretch" },
	"flex-grow": { "flex-grow": 1 },
	"flex-shrink": { "flex-shrink": 1 },
	// Vertical alignment.
	"align-baseline": { "vertical-align": "baseline" },
	"align-top": { "vertical-align": "top" },
	"align-middle": { "vertical-align": "middle" },
	"align-bottom": { "vertical-align": "bottom" },
	"align-text-top": { "vertical-align": "text-top" },
	"align-text-bottom": { "vertical-align": "text-bottom" },
	// Overflow.
	"overflow-auto": { overflow: "auto" },
	"overflow-x-auto": { "overflow-x": "auto" },
	"overflow-y-auto": { "overflow-y": "auto" },
	"overflow-hidden": { overflow: "hidden" },
	"overflow-x-hidden": { "overflow-x": "hidden" },
	"overflow-y-hidden": { "overflow-y": "hidden" },
	"overflow-visible": { overflow: "visible" },
	// Overscroll.
	"overscroll-auto": { "overscroll-behavior": "auto" },
	"overscroll-contain": { "overscroll-behavior": "contain" },
	"overscroll-none": { "overscroll-behavior": "none" },
	"overscroll-x-auto": { "overscroll-behavior-x": "auto" },
	"overscroll-x-contain": { "overscroll-behavior-x": "contain" },
	"overscroll-x-none": { "overscroll-behavior-x": "none" },
	"overscroll-y-auto": { "overscroll-behavior-y": "auto" },
	"overscroll-y-contain": { "overscroll-behavior-y": "contain" },
	"overscroll-y-none": { "overscroll-behavior-y": "none" },
	// Z-index.
	"z-auto": { "z-index": "auto" },
	// Cursors.
	"cursor-pointer": { cursor: "pointer" },
	"cursor-wait": { cursor: "wait" },
	"cursor-not-allowed": { cursor: "not-allowed" },
	// User selection.
	"select-none": { "user-select": "none" },
	"select-all": { "user-select": "all" },
	// Events.
	"pointer-events-auto": { "pointer-events": "auto" },
	"pointer-events-none": { "pointer-events": "none" },
	// Sizing.
	"box-border": { "box-sizing": "border-box" },
	"box-content": { "box-sizing": "content-box" },
	// Resizing.
	resize: { resize: "both" },
	"resize-x": { resize: "horizontal" },
	"resize-y": { resize: "vertical" },
	"resize-none": { resize: "none" },
	// Appearance.
	"appearance-none": {
		appearance: "none",
		"-webkit-appearance": "none",
		"-moz-appearance": "none",
	},
	// Borders.
	border: { border: "1px solid" },
	"border-none": { border: "none" },
	"border-solid": { "border-style": "solid" },
	"border-dashed": { "border-style": "dashed" },
	"border-dotted": { "border-style": "dotted" },
	"border-collapse": { "border-collapse": "collapse" },
	// Radius.
	"rounded-none": { "border-radius": "0" },
	rounded: { "border-radius": ".25rem" },
	"rounded-sm": { "border-radius": ".125rem" },
	"rounded-md": { "border-radius": ".375rem" },
	"rounded-lg": { "border-radius": ".5rem" },
	"rounded-xl": { "border-radius": ".75rem" },
	"rounded-full": { "border-radius": "9999px" },
	// Shadows (matching Tailwind CSS).
	"shadow-2xs": { "box-shadow": "0 1px rgb(0 0 0 / 0.05)" },
	"shadow-xs": { "box-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
	shadow: { "box-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
	"shadow-sm": { "box-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
	"shadow-md": {
		"box-shadow": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
	},
	"shadow-lg": {
		"box-shadow": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
	},
	"shadow-xl": {
		"box-shadow": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
	},
	"shadow-2xl": { "box-shadow": "0 25px 50px -12px rgb(0 0 0 / 0.25)" },
	"shadow-inner": { "box-shadow": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)" },
	"shadow-none": { "box-shadow": "0 0 #0000" },
	// Ring utilities for focus states.
	ring: { "box-shadow": "var(--ring-inset, ) 0 0 0 3px rgb(59 130 246 / 0.5)" },
	"ring-0": { "box-shadow": "var(--ring-inset, ) 0 0 0 0px rgb(59 130 246 / 0.5)" },
	"ring-1": { "box-shadow": "var(--ring-inset, ) 0 0 0 1px rgb(59 130 246 / 0.5)" },
	"ring-2": { "box-shadow": "var(--ring-inset, ) 0 0 0 2px rgb(59 130 246 / 0.5)" },
	"ring-4": { "box-shadow": "var(--ring-inset, ) 0 0 0 4px rgb(59 130 246 / 0.5)" },
	"ring-8": { "box-shadow": "var(--ring-inset, ) 0 0 0 8px rgb(59 130 246 / 0.5)" },
	"ring-inset": { "--ring-inset": "inset" },
	// Outline utilities.
	outline: { "outline-style": "solid" },
	"outline-none": { outline: "2px solid transparent", "outline-offset": "2px" },
	"outline-dashed": { "outline-style": "dashed" },
	"outline-dotted": { "outline-style": "dotted" },
	"outline-double": { "outline-style": "double" },
	"outline-0": { "outline-width": "0px" },
	"outline-1": { "outline-width": "1px" },
	"outline-2": { "outline-width": "2px" },
	"outline-4": { "outline-width": "4px" },
	"outline-8": { "outline-width": "8px" },
	"outline-offset-0": { "outline-offset": "0px" },
	"outline-offset-1": { "outline-offset": "1px" },
	"outline-offset-2": { "outline-offset": "2px" },
	"outline-offset-4": { "outline-offset": "4px" },
	"outline-offset-8": { "outline-offset": "8px" },
	// Aspect ratio utilities.
	"aspect-auto": { "aspect-ratio": "auto" },
	"aspect-square": { "aspect-ratio": "1 / 1" },
	"aspect-video": { "aspect-ratio": "16 / 9" },
	// Backdrop filter utilities.
	"backdrop-blur-none": { "backdrop-filter": "blur(0)" },
	"backdrop-blur-sm": { "backdrop-filter": "blur(4px)" },
	"backdrop-blur": { "backdrop-filter": "blur(8px)" },
	"backdrop-blur-md": { "backdrop-filter": "blur(12px)" },
	"backdrop-blur-lg": { "backdrop-filter": "blur(16px)" },
	"backdrop-blur-xl": { "backdrop-filter": "blur(24px)" },
	"backdrop-blur-2xl": { "backdrop-filter": "blur(40px)" },
	"backdrop-blur-3xl": { "backdrop-filter": "blur(64px)" },
	// Transitions.
	"transition-none": { transition: "none" },
	transition: {
		"transition-property": "all",
		"transition-timing-function": "ease-in-out",
		"transition-duration": "var(--transition-duration, 150ms)",
	},
	// Animations.
	"animate-none": { animation: "none" },
	"animate-spin": { animation: "spin 1s linear infinite" },
	"animate-ping": { animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" },
	"animate-pulse": { animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" },
	// Backgrounds.
	"bg-auto": { "background-size": "auto" },
	"bg-cover": { "background-size": "cover" },
	"bg-contain": { "background-size": "contain" },
	"bg-no-repeat": { "background-repeat": "no-repeat" },
	"bg-fixed": { "background-attachment": "fixed" },
	"bg-local": { "background-attachment": "local" },
	"bg-scroll": { "background-attachment": "scroll" },
	// Screen/viewport sizing.
	"min-h-screen": { "min-height": "100vh" },
	"max-h-screen": { "max-height": "100vh" },
	"min-w-screen": { "min-width": "100vw" },
	"h-dvh": { height: "100dvh" },
	"h-svh": { height: "100svh" },
	"h-lvh": { height: "100lvh" },
	"w-dvw": { width: "100dvw" },
	"w-svw": { width: "100svw" },
	"w-lvw": { width: "100lvw" },
	"min-h-dvh": { "min-height": "100dvh" },
	"min-h-svh": { "min-height": "100svh" },
	"min-h-lvh": { "min-height": "100lvh" },
	// Flexbox enhancements.
	"flex-none": { flex: "none" },
	"flex-auto": { flex: "1 1 auto" },
	"flex-initial": { flex: "0 1 auto" },
	grow: { "flex-grow": "1" },
	"grow-0": { "flex-grow": "0" },
	shrink: { "flex-shrink": "1" },
	"shrink-0": { "flex-shrink": "0" },
	"self-auto": { "align-self": "auto" },
	"self-start": { "align-self": "flex-start" },
	"self-end": { "align-self": "flex-end" },
	"self-center": { "align-self": "center" },
	"self-stretch": { "align-self": "stretch" },
	"self-baseline": { "align-self": "baseline" },
	"content-normal": { "align-content": "normal" },
	"content-start": { "align-content": "flex-start" },
	"content-end": { "align-content": "flex-end" },
	"content-center": { "align-content": "center" },
	"content-between": { "align-content": "space-between" },
	"content-around": { "align-content": "space-around" },
	"content-evenly": { "align-content": "space-evenly" },
	"content-stretch": { "align-content": "stretch" },
	"items-baseline": { "align-items": "baseline" },
	// Inset utilities.
	"inset-0": { inset: "0" },
	"inset-auto": { inset: "auto" },
	"inset-x-0": { left: "0", right: "0" },
	"inset-y-0": { top: "0", bottom: "0" },
	"inset-x-auto": { left: "auto", right: "auto" },
	"inset-y-auto": { top: "auto", bottom: "auto" },
	// Accessibility.
	"sr-only": {
		position: "absolute",
		width: "1px",
		height: "1px",
		padding: "0",
		margin: "-1px",
		overflow: "hidden",
		clip: "rect(0, 0, 0, 0)",
		"white-space": "nowrap",
		"border-width": "0",
	},
	"not-sr-only": {
		position: "static",
		width: "auto",
		height: "auto",
		padding: "0",
		margin: "0",
		overflow: "visible",
		clip: "auto",
		"white-space": "normal",
	},
};
const PROPS_AS_IS = [
	`@keyframes spin {
    from { transform: rotate(0deg) }
    to { transform: rotate(360deg) }
  }`,
	`@keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }`,
	`@keyframes pulse {
    0%, 100% { opacity: 1 }
    50% { opacity: .5 }
  }`,
];

export const PROPS_COLORS: { [key: string]: { [key: number]: string } } = {
	red: {
		50: "#ffebee",
		100: "#ffcdd2",
		200: "#ef9a9a",
		300: "#e57373",
		400: "#ef5350",
		500: "#f44336",
		600: "#e53935",
		700: "#d32f2f",
		800: "#c62828",
		900: "#b71c1c",
	},
	pink: {
		50: "#fce4ec",
		100: "#f8bbd0",
		200: "#f48fb1",
		300: "#f06292",
		400: "#ec407a",
		500: "#e91e63",
		600: "#d81b60",
		700: "#c2185b",
		800: "#ad1457",
		900: "#880e4f",
	},
	purple: {
		50: "#f3e5f5",
		100: "#e1bee7",
		200: "#ce93d8",
		300: "#ba68c8",
		400: "#ab47bc",
		500: "#9c27b0",
		600: "#8e24aa",
		700: "#7b1fa2",
		800: "#6a1b9a",
		900: "#4a148c",
	},
	"deep-purple": {
		50: "#ede7f6",
		100: "#d1c4e9",
		200: "#b39ddb",
		300: "#9575cd",
		400: "#7e57c2",
		500: "#673ab7",
		600: "#5e35b1",
		700: "#512da8",
		800: "#4527a0",
		900: "#311b92",
	},
	indigo: {
		50: "#e8eaf6",
		100: "#c5cae9",
		200: "#9fa8da",
		300: "#7986cb",
		400: "#5c6bc0",
		500: "#3f51b5",
		600: "#3949ab",
		700: "#303f9f",
		800: "#283593",
		900: "#1a237e",
	},
	blue: {
		50: "#e3f2fd",
		100: "#bbdefb",
		200: "#90caf9",
		300: "#64b5f6",
		400: "#42a5f5",
		500: "#2196f3",
		600: "#1e88e5",
		700: "#1976d2",
		800: "#1565c0",
		900: "#0d47a1",
	},
	"light-blue": {
		50: "#e1f5fe",
		100: "#b3e5fc",
		200: "#81d4fa",
		300: "#4fc3f7",
		400: "#29b6f6",
		500: "#03a9f4",
		600: "#039be5",
		700: "#0288d1",
		800: "#0277bd",
		900: "#01579b",
	},
	cyan: {
		50: "#e0f7fa",
		100: "#b2ebf2",
		200: "#80deea",
		300: "#4dd0e1",
		400: "#26c6da",
		500: "#00bcd4",
		600: "#00acc1",
		700: "#0097a7",
		800: "#00838f",
		900: "#006064",
	},
	teal: {
		50: "#e0f2f1",
		100: "#b2dfdb",
		200: "#80cbc4",
		300: "#4db6ac",
		400: "#26a69a",
		500: "#009688",
		600: "#00897b",
		700: "#00796b",
		800: "#00695c",
		900: "#004d40",
	},
	green: {
		50: "#e8f5e9",
		100: "#c8e6c9",
		200: "#a5d6a7",
		300: "#81c784",
		400: "#66bb6a",
		500: "#4caf50",
		600: "#43a047",
		700: "#388e3c",
		800: "#2e7d32",
		900: "#1b5e20",
	},
	"light-green": {
		50: "#f1f8e9",
		100: "#dcedc8",
		200: "#c5e1a5",
		300: "#aed581",
		400: "#9ccc65",
		500: "#8bc34a",
		600: "#7cb342",
		700: "#689f38",
		800: "#558b2f",
		900: "#33691e",
	},
	lime: {
		50: "#f9fbe7",
		100: "#f0f4c3",
		200: "#e6ee9c",
		300: "#dce775",
		400: "#d4e157",
		500: "#cddc39",
		600: "#c0ca33",
		700: "#afb42b",
		800: "#9e9d24",
		900: "#827717",
	},
	yellow: {
		50: "#fffde7",
		100: "#fff9c4",
		200: "#fff59d",
		300: "#fff176",
		400: "#ffee58",
		500: "#ffeb3b",
		600: "#fdd835",
		700: "#fbc02d",
		800: "#f9a825",
		900: "#f57f17",
	},
	amber: {
		50: "#fff8e1",
		100: "#ffecb3",
		200: "#ffe082",
		300: "#ffd54f",
		400: "#ffca28",
		500: "#ffc107",
		600: "#ffb300",
		700: "#ffa000",
		800: "#ff8f00",
		900: "#ff6f00",
	},
	orange: {
		50: "#fff3e0",
		100: "#ffe0b2",
		200: "#ffcc80",
		300: "#ffb74d",
		400: "#ffa726",
		500: "#ff9800",
		600: "#fb8c00",
		700: "#f57c00",
		800: "#ef6c00",
		900: "#e65100",
	},
	"deep-orange": {
		50: "#fbe9e7",
		100: "#ffccbc",
		200: "#ffab91",
		300: "#ff8a65",
		400: "#ff7043",
		500: "#ff5722",
		600: "#f4511e",
		700: "#e64a19",
		800: "#d84315",
		900: "#bf360c",
	},
	brown: {
		50: "#efebe9",
		100: "#d7ccc8",
		200: "#bcaaa4",
		300: "#a1887f",
		400: "#8d6e63",
		500: "#795548",
		600: "#6d4c41",
		700: "#5d4037",
		800: "#4e342e",
		900: "#3e2723",
	},
	gray: {
		50: "#fafafa",
		100: "#f5f5f5",
		200: "#eeeeee",
		300: "#e0e0e0",
		400: "#bdbdbd",
		500: "#9e9e9e",
		600: "#757575",
		700: "#616161",
		800: "#424242",
		900: "#212121",
	},
	"blue-gray": {
		50: "#eceff1",
		100: "#cfd8dc",
		200: "#b0bec5",
		300: "#90a4ae",
		400: "#78909c",
		500: "#607d8b",
		600: "#546e7a",
		700: "#455a64",
		800: "#37474f",
		900: "#263238",
	},
};

function wrapPseudoStates(klass: string): string[] {
	return PSEUDO_STATES.map((state) => `.${state}\\:${klass}:${state}`);
}

function wrapMediaQueries(klass: string, rule: string): string[] {
	return MEDIA_ENTRIES.map(
		([bp, width]) => `@media (min-width: ${width}px) { .${bp}\\:${klass} { ${rule} } }`,
	);
}

function wrapAll(pairs: string[][]): string[] {
	return pairs.flatMap(([klass, rule]) => [
		`.${klass} { ${rule} }`,
		`${wrapPseudoStates(klass).join(",")} { ${rule} }`,
		...wrapMediaQueries(klass, rule),
	]);
}

// Lighter wrapper without media queries - for utilities like colors that rarely need responsive variants
function wrapBase(pairs: string[][]): string[] {
	return pairs.flatMap(([klass, rule]) => [
		`.${klass} { ${rule} }`,
		`${wrapPseudoStates(klass).join(",")} { ${rule} }`,
	]);
}

function ruleSorter(a: string, b: string): number {
	// Media queries start with '@', regular rules start with '.'
	const aMedia = a[0] === "@";
	const bMedia = b[0] === "@";
	if (aMedia && !bMedia) return 1;
	if (!aMedia && bMedia) return -1;
	return a.localeCompare(b);
}

function posneg(props: { [key: string]: string }): string[] {
	return wrapAll(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}-0`, `${prop}: 0`],
			[`${klass}-screen`, `${prop}: 100v${prop.includes("height") ? "h" : "w"}`],
			[`${klass}-full`, `${prop}: 100%`],
			...UNITS_ALL.map((v) => [`${klass}-${v}`, `${prop}: ${v * REM_UNIT}rem`]),
			...UNITS_ALL.map((v) => [`-${klass}-${v}`, `${prop}: -${v * REM_UNIT}rem`]),
			...UNITS_ALL.map((v) => [`${klass}-${v}px`, `${prop}: ${v}px`]),
			...UNITS_ALL.map((v) => [`-${klass}-${v}px`, `${prop}: -${v}px`]),
			...PERCENTS.map((v) => [`${klass}-${v}\\%`, `${prop}: ${v}%`]),
			...PERCENTS.map((v) => [`-${klass}-${v}\\%`, `${prop}: -${v}%`]),
			...MEDIA_ENTRIES.map(([bp, width]) => [`${klass}-${bp}`, `${prop}: ${width}px`]),
		]),
	);
}

function autoxy(props: { [key: string]: string }): string[] {
	return wrapAll(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}-auto`, `${prop}: auto`],
			[`${klass}x-auto`, `${prop}-left: auto; ${prop}-right: auto;`],
			[`${klass}y-auto`, `${prop}-top: auto; ${prop}-bottom: auto;`],
			[`${klass}x-0`, `${prop}-left: 0; ${prop}-right: 0;`],
			[`${klass}y-0`, `${prop}-top: 0; ${prop}-bottom: 0;`],
			...UNITS_ALL.map((v) => [
				`${klass}x-${v}`,
				`${prop}-left: ${v * REM_UNIT}rem; ${prop}-right: ${v * REM_UNIT}rem;`,
			]),
			...UNITS_ALL.map((v) => [
				`${klass}y-${v}`,
				`${prop}-top: ${v * REM_UNIT}rem; ${prop}-bottom: ${v * REM_UNIT}rem;`,
			]),
			...UNITS_ALL.map((v) => [`${klass}x-${v}px`, `${prop}-left: ${v}px; ${prop}-right: ${v}px;`]),
			...UNITS_ALL.map((v) => [`${klass}y-${v}px`, `${prop}-top: ${v}px; ${prop}-bottom: ${v}px;`]),
			...PERCENTS.map((v) => [`${klass}x-${v}\\%`, `${prop}-left: ${v}%; ${prop}-right: ${v}%;`]),
			...PERCENTS.map((v) => [`${klass}y-${v}\\%`, `${prop}-top: ${v}%; ${prop}-bottom: ${v}%;`]),
		]),
	);
}

function tblr(props: { [key: string]: string }): string[] {
	return wrapAll(
		Object.entries(props).flatMap(([prop, klass]) => [
			[`${klass}t-0`, `${prop}-top: 0`],
			[`${klass}b-0`, `${prop}-bottom: 0`],
			[`${klass}l-0`, `${prop}-left: 0`],
			[`${klass}r-0`, `${prop}-right: 0`],
			[`${klass}t-auto`, `${prop}-top: auto`],
			[`${klass}b-auto`, `${prop}-bottom: auto`],
			[`${klass}l-auto`, `${prop}-left: auto`],
			[`${klass}r-auto`, `${prop}-right: auto`],
			...["", "-"].flatMap((sign) => [
				...UNITS_ALL.map((v) => [
					`${sign}${klass}t-${v}`,
					`${prop}-top: ${sign}${v * REM_UNIT}rem`,
				]),
				...UNITS_ALL.map((v) => [
					`${sign}${klass}b-${v}`,
					`${prop}-bottom: ${sign}${v * REM_UNIT}rem`,
				]),
				...UNITS_ALL.map((v) => [
					`${sign}${klass}l-${v}`,
					`${prop}-left: ${sign}${v * REM_UNIT}rem`,
				]),
				...UNITS_ALL.map((v) => [
					`${sign}${klass}r-${v}`,
					`${prop}-right: ${sign}${v * REM_UNIT}rem`,
				]),
				...UNITS_ALL.map((v) => [`${sign}${klass}t-${v}px`, `${prop}-top: ${sign}${v}px`]),
				...UNITS_ALL.map((v) => [`${sign}${klass}b-${v}px`, `${prop}-bottom: ${sign}${v}px`]),
				...UNITS_ALL.map((v) => [`${sign}${klass}l-${v}px`, `${prop}-left: ${sign}${v}px`]),
				...UNITS_ALL.map((v) => [`${sign}${klass}r-${v}px`, `${prop}-right: ${sign}${v}px`]),
				...PERCENTS.map((v) => [`${sign}${klass}t-${v}\\%`, `${prop}-top: ${sign}${v}%`]),
				...PERCENTS.map((v) => [`${sign}${klass}b-${v}\\%`, `${prop}-bottom: ${sign}${v}%`]),
				...PERCENTS.map((v) => [`${sign}${klass}l-${v}\\%`, `${prop}-left: ${sign}${v}%`]),
				...PERCENTS.map((v) => [`${sign}${klass}r-${v}\\%`, `${prop}-right: ${sign}${v}%`]),
			]),
		]),
	);
}

function border(): string[] {
	return wrapAll([
		[`border`, `border: 1px`],
		[`border-x`, `border-inline-width: 1px`],
		[`border-y`, `border-block-width: 1px`],
		...[0, ...UNITS_SM].map((v) => [`border-${v}`, `border-width: ${v}px`]),
		...[0, ...UNITS_SM].map((v) => [`border-x-${v}`, `border-inline-width: ${v}px;`]),
		...[0, ...UNITS_SM].map((v) => [`border-y-${v}`, `border-block-width: ${v}px;`]),
		...["top", "bottom", "left", "right"].flatMap((dir) => [
			[`border-${dir.slice(0, 1)}`, `border-${dir}: 1px`],
			...[0, ...UNITS_SM].map((v) => [
				`border-${dir.slice(0, 1)}-${v}`,
				`border-${dir}-width: ${v}px`,
			]),
		]),
	]);
}

function zIndex(): string[] {
	return wrapAll(PERCENTS.map((v) => [`z-${v}`, `z-index: ${v}`]));
}

function transitions(): string[] {
	return wrapAll(
		DURATIONS.map((v) => [
			`duration-${v}`,
			`--transition-duration: ${v}ms; transition-duration: ${v}ms`,
		]),
	);
}

function between(): string[] {
	return wrapAll([
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
	return wrapAll([
		...Array.from({ length: 100 }, (_, i) => [`text-${i}px`, `font-size: ${i}px`]),
		...Array.from({ length: 100 }, (_, i) => [
			`text-${i * REM_UNIT}rem`,
			`font-size: ${i * REM_UNIT}rem`,
		]),
	]);
}

function gridPatterns(): string[] {
	return wrapAll([
		// Grid template columns
		// grid-cols-1 to grid-cols-12
		...Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [
			`grid-cols-${n}`,
			`grid-template-columns: repeat(${n}, minmax(0, 1fr))`,
		]),
		[`grid-cols-none`, `grid-template-columns: none`],

		// Grid column span
		// col-span-1 to col-span-12
		...Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [
			`col-span-${n}`,
			`grid-column: span ${n} / span ${n}`,
		]),
		[`col-span-full`, `grid-column: 1 / -1`],

		// Grid column start/end
		...Array.from({ length: 13 }, (_, i) => i + 1).map((n) => [
			`col-start-${n}`,
			`grid-column-start: ${n}`,
		]),
		[`col-start-auto`, `grid-column-start: auto`],
		...Array.from({ length: 13 }, (_, i) => i + 1).map((n) => [
			`col-end-${n}`,
			`grid-column-end: ${n}`,
		]),
		[`col-end-auto`, `grid-column-end: auto`],
	]);
}

function custom(): string[] {
	return Object.entries(PROPS_CUSTOM).flatMap(([klass, props]) => {
		const rules = Object.entries(props)
			.map(([k, v]) => `${k}: ${v}`)
			.join("; ");
		return [
			`.${klass} { ${rules} }`,
			`${wrapPseudoStates(klass).join(",")} { ${rules} }`,
			...wrapMediaQueries(klass, rules),
		];
	});
}

function hexToRgb(hex: string): string {
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

function colors(): string[] {
	const colorVariants = (color: string, value: string) => {
		const variants = [
			[`text-${color}`, `color: ${value}`],
			[`fill-${color}`, `fill: ${value}`],
			[`bg-${color}`, `background-color: ${value}`],
			[`border-${color}`, `border-color: ${value}`],
		];
		if (value.startsWith("#")) {
			const rgb = hexToRgb(value);
			for (const opacity of COLOR_OPACITY_MODIFIERS) {
				const alpha = opacity / 100;
				variants.push(
					[`text-${color}\\/${opacity}`, `color: rgb(${rgb} / ${alpha})`],
					[`bg-${color}\\/${opacity}`, `background-color: rgb(${rgb} / ${alpha})`],
					[`border-${color}\\/${opacity}`, `border-color: rgb(${rgb} / ${alpha})`],
				);
			}
		}
		return variants;
	};
	return wrapBase([
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
	return wrapAll([
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
		// Sizing.
		...posneg(PROPS_SIZING),
		...autoxy(PROPS_SIZING),
		// Spacing.
		...tblr(PROPS_SPACING),
		...posneg(PROPS_SPACING),
		...autoxy(PROPS_SPACING),
		...between(),
		// Minmax.
		...posneg(PROPS_SIZING_MINMAX),
		// Border.
		...border(),
		// Text sizes.
		...textSizes(),
		// Grid.
		...gridPatterns(),
	]
		// Sort lexicographical to ensure media queries appear after their base rules.
		.sort(ruleSorter)
		.join("\n");
	return cachedRules;
}
