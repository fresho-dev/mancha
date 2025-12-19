import * as fs from "node:fs";
import * as path from "node:path";
import {
	MEDIA_BREAKPOINTS,
	PROPS_CUSTOM,
	PROPS_COLORS,
	PROPS_SPACING,
	PROPS_SIZING,
	PROPS_POSITION,
	PROPS_SIZING_MINMAX,
	UNITS_ALL,
	REM_UNIT,
	PERCENTS,
	DURATIONS,
} from "../src/css_gen_utils.ts";

const DOCS_PATH = path.join(process.cwd(), "docs", "css.md");

function handledBySize(klass: string) {
	return klass.startsWith("text-") && (klass.endsWith("px") || klass.endsWith("rem"));
}

function generateMarkdown() {
	let md = "# CSS Documentation\n\n";

	md +=
		"Mancha provides a set of CSS utilities and basic styles to help you build your application.\n\n";

	md += "## Basic CSS\n\n";
	md +=
		'The basic CSS rules provide a clean, readable default style for standard HTML elements. You can inject them using `injectBasicCss()` or by adding `css="basic"` to your script tag.\n\n';
	md += "### Reset & Defaults\n";
	md += "- **Max Width**: 70ch (centered)\n";
	md += "- **Padding**: 2em 1em\n";
	md += "- **Line Height**: 1.75\n";
	md += "- **Font Family**: sans-serif\n";
	md += "- **H1-H6 Margin**: 1em 0 0.5em\n";
	md += "- **P, UL, OL Margin Bottom**: 1em\n\n";

	md += "## Utility CSS\n\n";
	md +=
		'The utility CSS rules are inspired by Tailwind CSS. You can inject them using `injectUtilsCss()` or by adding `css="utils"` to your script tag.\n\n';

	md += "### Media Breakpoints\n\n";
	md += "| Prefix | Min Width |\n";
	md += "| --- | --- |\n";
	for (const [bp, width] of Object.entries(MEDIA_BREAKPOINTS)) {
		md += `| \`${bp}:\` | \`${width}px\` |\n`;
	}
	md += "\n";

	md += "### Pseudo States\n\n";
	md += "The following pseudo states are supported for all utilities:\n";
	md += "- `hover:`\n";
	md += "- `focus:`\n";
	md += "- `disabled:`\n";
	md += "- `active:`\n\n";

	md += "### Spacing (Margin & Padding)\n\n";
	md += "Spacing utilities use a 0.25rem (4px) unit by default.\n\n";
	md += "| Prefix | Property | Values |\n";
	md += "| --- | --- | --- |\n";
	for (const [prop, prefix] of Object.entries(PROPS_SPACING)) {
		md += `| \`${prefix}-\` | \`${prop}\` | \`0\`, \`0.25rem\` - \`128rem\` (and negative versions) |\n`;
		md += `| \`${prefix}x-\` | \`${prop}-left/right\` | Same as above |\n`;
		md += `| \`${prefix}y-\` | \`${prop}-top/bottom\` | Same as above |\n`;
		md += `| \`${prefix}t-\` | \`${prop}-top\` | Same as above |\n`;
		md += `| \`${prefix}b-\` | \`${prop}-bottom\` | Same as above |\n`;
		md += `| \`${prefix}l-\` | \`${prop}-left\` | Same as above |\n`;
		md += `| \`${prefix}r-\` | \`${prop}-right\` | Same as above |\n`;
	}
	md += "\n";

	md += "### Sizing (Width & Height)\n\n";
	md += "| Prefix | Property | Values |\n";
	md += "| --- | --- | --- |\n";
	for (const [prop, prefix] of Object.entries(PROPS_SIZING)) {
		md += `| \`${prefix}-\` | \`${prop}\` | \`0\`, \`full\` (100%), \`screen\` (100vw/vh), \`auto\`, \`px\`, \`0.25rem\` - \`128rem\` |\n`;
		md += `| \`${prefix}-dvw/dvh/svw/svh/lvw/lvh\` | \`${prop}\` | Viewport-relative units |\n`;
		md += `| \`${prefix}-fit/min/max\` | \`${prop}\` | \`fit-content\`, \`min-content\`, \`max-content\` |\n`;
	}
	for (const [prop, prefix] of Object.entries(PROPS_SIZING_MINMAX)) {
		md += `| \`${prefix}-\` | \`${prop}\` | Same as sizing |\n`;
	}
	md +=
		"| `size-` | `width` & `height` | `auto`, `px`, `full`, `dvw`, `dvh`, `svw`, `svh`, `lvw`, `lvh`, `min`, `max`, `fit` |\n";
	md += "\n";

	md += "### Colors\n\n";
	md += "Supported prefixes: `text-`, `bg-`, `border-`, `fill-`.\n\n";
	md += "| Color | Shades |\n";
	md += "| --- | --- |\n";
	md += "| `white`, `black`, `transparent` | N/A |\n";
	for (const [color, shades] of Object.entries(PROPS_COLORS)) {
		md += `| \`${color}\` | \`50\`, \`100\`, \`200\`, \`300\`, \`400\`, \`500\`, \`600\`, \`700\`, \`800\`, \`900\` |\n`;
	}
	md += "\n";

	md += "### Borders & Corners\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const borderProps = ["border", "rounded"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (borderProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	// Document dynamic border widths
	md += "| `border-{0-15}` | Border width in pixels (e.g., `border-0`, `border-1`, ..., `border-15`) |\n";
	md += "| `border-x-{0-15}` | Horizontal border width in pixels |\n";
	md += "| `border-y-{0-15}` | Vertical border width in pixels |\n";
	md += "| `border-{t,b,l,r}-{0-15}` | Individual side border width in pixels |\n";
	md += "\n";

	md += "### Shadows & Effects\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const effectProps = ["shadow", "ring", "mix-blend-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (effectProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	// Document opacity
	md += "| `opacity-0` | Fully transparent |\n";
	md += `| \`opacity-{${PERCENTS.join(",")}}\` | Opacity values from 0-100 |\n`;
	md += "\n";

	md += "### Outline\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const outlineProps = ["outline"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (outlineProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Aspect Ratio\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const aspectProps = ["aspect-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (aspectProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Backdrop Filters\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const backdropProps = ["backdrop-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (backdropProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Transitions & Animations\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const animProps = ["transition", "animate-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (animProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	// Document durations
	md += `| \`duration-{${DURATIONS.join(",")}}\` | Transition duration in milliseconds |\n`;
	md += "\n";

	md += "### Interactivity\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const interProps = ["cursor-", "select-", "pointer-events-", "resize", "user-select"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (interProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Typography\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const typoProps = [
		"font-",
		"text-",
		"italic",
		"not-italic",
		"leading-",
		"tracking-",
		"uppercase",
		"lowercase",
		"capitalize",
		"truncate",
		"whitespace-",
		"decoration-",
		"underline",
		"line-through",
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (typoProps.some((p) => klass.startsWith(p)) && !handledBySize(klass)) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Flexbox & Layout\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const flexProps = [
		"flex",
		"justify-",
		"items-",
		"self-",
		"content-",
		"grow",
		"shrink",
		"gap-",
		"order-",
		"grid-",
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (flexProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	// Document gap utilities
	md += "| `gap-0` | No gap |\n";
	md += "| `gap-{1-512}` | Gap in rem units (0.25rem increments) |\n";
	md += "| `gap-{1-512}px` | Gap in pixels |\n";
	md += "| `gap-x-{1-512}` | Horizontal gap in rem units |\n";
	md += "| `gap-y-{1-512}` | Vertical gap in rem units |\n";
	md += "| `gap-x-{1-512}px` | Horizontal gap in pixels |\n";
	md += "| `gap-y-{1-512}px` | Vertical gap in pixels |\n";
	md += "| `space-x-{0-512}` | Horizontal spacing between children (rem) |\n";
	md += "| `space-y-{0-512}` | Vertical spacing between children (rem) |\n";
	md += "| `space-x-{0-512}px` | Horizontal spacing between children (px) |\n";
	md += "| `space-y-{0-512}px` | Vertical spacing between children (px) |\n";
	// Document divide utilities
	md += "| `divide-x` | Add 1px vertical border between horizontal children |\n";
	md += "| `divide-y` | Add 1px horizontal border between vertical children |\n";
	md += "| `divide-x-{0,2,4,8}` | Vertical border width between horizontal children |\n";
	md += "| `divide-y-{0,2,4,8}` | Horizontal border width between vertical children |\n";
	md += "| `divide-solid` | Solid border style for dividers |\n";
	md += "| `divide-dashed` | Dashed border style for dividers |\n";
	md += "| `divide-dotted` | Dotted border style for dividers |\n";
	md += "| `divide-none` | Remove divider borders |\n";
	md += "\n";

	md += "### Position & Inset\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const posProps = [
		"relative",
		"absolute",
		"fixed",
		"sticky",
		"inset-",
		"object-",
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (posProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	// Document position values
	md += "| `top-{0-512}`, `bottom-{0-512}`, `left-{0-512}`, `right-{0-512}` | Position in rem units (0.25rem increments) |\n";
	md += "| `top-{0-512}px`, `bottom-{0-512}px`, `left-{0-512}px`, `right-{0-512}px` | Position in pixels |\n";
	md += "| `top-{1-100}%`, `bottom-{1-100}%`, `left-{1-100}%`, `right-{1-100}%` | Position in percentages |\n";
	md += "| `top-auto`, `bottom-auto`, `left-auto`, `right-auto` | Auto positioning |\n";
	// Document z-index
	md += `| \`z-{${PERCENTS.join(",")}}\` | Z-index values |\n`;
	md += "\n";

	md += "### Display & Visibility\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const displayProps = ["block", "inline", "hidden", "contents", "visible", "invisible", "collapse"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (displayProps.some((p) => klass === p)) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Overflow & Scrolling\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const overflowProps = ["overflow-", "overscroll-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (overflowProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Backgrounds\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const bgProps = ["bg-auto", "bg-cover", "bg-contain", "bg-no-repeat", "bg-fixed", "bg-local", "bg-scroll"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (bgProps.some((p) => klass === p)) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Lists\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const listProps = ["list-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (listProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Vertical Alignment\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const alignProps = ["align-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (alignProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Viewport Sizing\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const viewportProps = [
		"min-h-screen", "max-h-screen", "min-w-screen",
		"h-dvh", "h-svh", "h-lvh",
		"w-dvw", "w-svw", "w-lvw",
		"min-h-dvh", "min-h-svh", "min-h-lvh"
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (viewportProps.some((p) => klass === p)) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Accessibility\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const a11yProps = ["sr-only", "not-sr-only"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (a11yProps.some((p) => klass === p)) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Other Utilities\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const allHandledPrefixes = [
		...typoProps,
		...flexProps,
		...posProps,
		...borderProps,
		...effectProps,
		...animProps,
		...interProps,
		...displayProps,
		...overflowProps,
		...bgProps,
		...listProps,
		...alignProps,
		...a11yProps,
		...viewportProps,
		...outlineProps,
		...aspectProps,
		...backdropProps,
		"w-",
		"h-",
		"min-w-",
		"min-h-",
		"max-w-",
		"max-h-",
		"bg-",
		"border-",
		"opacity-",
		"cursor-",
		"size-",
		"top-",
		"bottom-",
		"left-",
		"right-",
		"z-",
		"duration-",
		"gap-",
		"space-",
		"divide-",
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (!allHandledPrefixes.some((p) => klass.startsWith(p) || klass === p)) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	// Document text sizes
	md += "| `text-{0-99}px` | Font size in pixels (e.g., `text-12px`, `text-16px`) |\n";
	md += "| `text-{0-24.75}rem` | Font size in rem units (0.25rem increments) |\n";
	md += "\n";

	md += "--- \n\n*Generated automatically from `src/css_gen_utils.ts`*\n";

	return md;
}

fs.writeFileSync(DOCS_PATH, generateMarkdown());
console.log(`Documentation generated at ${DOCS_PATH}`);
