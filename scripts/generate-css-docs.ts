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
	md += "\n";

	md += "### Shadows & Effects\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const effectProps = ["shadow", "opacity-", "mix-blend-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (effectProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "### Transitions & Animations\n\n";
	md += "| Utility | Description |\n";
	md += "| --- | --- |\n";
	const animProps = ["transition", "duration-", "animate-"];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (animProps.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
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
		"top-",
		"bottom-",
		"left-",
		"right-",
		"z-",
		"object-",
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (posProps.some((p) => klass.startsWith(p))) {
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
		"block",
		"inline",
		"hidden",
		"contents",
		"visible",
		"invisible",
		"collapse",
		"overflow-",
		"overscroll-",
		"list-",
		"align-",
		"sr-only",
		"not-sr-only",
	];
	for (const [klass, props] of Object.entries(PROPS_CUSTOM)) {
		if (!allHandledPrefixes.some((p) => klass.startsWith(p))) {
			md += `| \`${klass}\` | \`${JSON.stringify(props)}\` |\n`;
		}
	}
	md += "\n";

	md += "--- \n\n*Generated automatically from `src/css_gen_utils.ts`*\n";

	return md;
}

fs.writeFileSync(DOCS_PATH, generateMarkdown());
console.log(`Documentation generated at ${DOCS_PATH}`);
