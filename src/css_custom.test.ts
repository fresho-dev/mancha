import { injectCss } from "./browser.js";
import {
	_getInjectedRules,
	_resetForTesting,
	injectCustomClass,
	isSupported,
	parseColorOpacityClass,
	parseCustomValueClass,
	processClassString,
	scanAndInject,
} from "./css_custom.js";
import { assert } from "./test_utils.js";

describe("css_custom", () => {
	beforeEach(() => _resetForTesting());

	describe("parseCustomValueClass", () => {
		it("parses width", () => {
			const result = parseCustomValueClass("w-[133px]");
			assert.deepEqual(result, { property: "width", value: "133px" });
		});

		it("parses negative margin", () => {
			const result = parseCustomValueClass("-mt-[2rem]");
			assert.deepEqual(result, { property: "margin-top", value: "-2rem" });
		});

		it("parses max-width", () => {
			const result = parseCustomValueClass("max-w-[900px]");
			assert.deepEqual(result, { property: "max-width", value: "900px" });
		});

		it("parses background color", () => {
			const result = parseCustomValueClass("bg-[#ff5733]");
			assert.deepEqual(result, { property: "background-color", value: "#ff5733" });
		});

		it("parses rem values", () => {
			const result = parseCustomValueClass("p-[2.5rem]");
			assert.deepEqual(result, { property: "padding", value: "2.5rem" });
		});

		it("parses calc expressions", () => {
			const result = parseCustomValueClass("w-[calc(100%-2rem)]");
			assert.deepEqual(result, { property: "width", value: "calc(100%-2rem)" });
		});

		it("parses height", () => {
			const result = parseCustomValueClass("h-[50vh]");
			assert.deepEqual(result, { property: "height", value: "50vh" });
		});

		it("parses min-height", () => {
			const result = parseCustomValueClass("min-h-[100px]");
			assert.deepEqual(result, { property: "min-height", value: "100px" });
		});

		it("parses gap", () => {
			const result = parseCustomValueClass("gap-[1.5rem]");
			assert.deepEqual(result, { property: "gap", value: "1.5rem" });
		});

		it("parses gap-x", () => {
			const result = parseCustomValueClass("gap-x-[10px]");
			assert.deepEqual(result, { property: "column-gap", value: "10px" });
		});

		it("parses gap-y", () => {
			const result = parseCustomValueClass("gap-y-[20px]");
			assert.deepEqual(result, { property: "row-gap", value: "20px" });
		});

		it("parses z-index", () => {
			const result = parseCustomValueClass("z-[9999]");
			assert.deepEqual(result, { property: "z-index", value: "9999" });
		});

		it("parses font-size", () => {
			const result = parseCustomValueClass("text-[14px]");
			assert.deepEqual(result, { property: "font-size", value: "14px" });
		});

		it("parses border-color", () => {
			const result = parseCustomValueClass("border-[#ccc]");
			assert.deepEqual(result, { property: "border-color", value: "#ccc" });
		});

		it("parses margin-inline", () => {
			const result = parseCustomValueClass("mx-[auto]");
			assert.deepEqual(result, { property: "margin-inline", value: "auto" });
		});

		it("parses position properties", () => {
			assert.deepEqual(parseCustomValueClass("top-[10px]"), { property: "top", value: "10px" });
			assert.deepEqual(parseCustomValueClass("left-[50%]"), { property: "left", value: "50%" });
		});

		it("returns null for non-custom class", () => {
			assert.equal(parseCustomValueClass("w-4"), null);
		});

		it("returns null for unknown prefix", () => {
			assert.equal(parseCustomValueClass("foo-[bar]"), null);
		});

		it("returns null for empty brackets", () => {
			assert.equal(parseCustomValueClass("w-[]"), null);
		});
	});

	describe("processClassString", () => {
		it("skips strings without brackets or dark prefix", () => {
			processClassString("flex w-4 mt-8");
			assert.equal(_getInjectedRules().size, 0);
		});

		it("skips empty strings", () => {
			processClassString("");
			assert.equal(_getInjectedRules().size, 0);
		});

		it("skips null-like values", () => {
			processClassString(null as unknown as string);
			assert.equal(_getInjectedRules().size, 0);
		});
	});

	describe("dark variant", () => {
		it("injects dark: custom bracket value with prefers-color-scheme media query", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-[#1a1a1a]", { type: "media", name: "dark" });

			assert.ok(
				_getInjectedRules().has("dark:bg-[#1a1a1a]"),
				"Should track the injected dark: rule",
			);

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			assert.ok(customStyle?.sheet, "Should have created a stylesheet");

			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(
				ruleText.includes("prefers-color-scheme: dark"),
				"Rule should use dark media query",
			);
			assert.ok(ruleText.includes("background-color"), "Rule should contain background-color");
		});

		it("injects dark: for standard utility classes by looking up existing rules", () => {
			if (!isSupported()) return;

			// Inject utils so standard classes exist in document stylesheets.
			injectCss(["utils"]);

			injectCustomClass("bg-gray-900", { type: "media", name: "dark" });

			assert.ok(
				_getInjectedRules().has("dark:bg-gray-900"),
				"Should track the injected dark: rule",
			);

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			assert.ok(customStyle?.sheet, "Should have created a stylesheet");

			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(
				ruleText.includes("prefers-color-scheme: dark"),
				"Rule should use dark media query",
			);
		});

		it("processClassString handles dark: prefixed classes", () => {
			if (!isSupported()) return;

			processClassString("dark:bg-[#333] dark:w-[200px]");

			assert.ok(_getInjectedRules().has("dark:bg-[#333]"), "Should inject dark:bg-[#333]");
			assert.ok(_getInjectedRules().has("dark:w-[200px]"), "Should inject dark:w-[200px]");
		});

		it("deduplicates dark: rules", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-[#111]", { type: "media", name: "dark" });
			injectCustomClass("bg-[#111]", { type: "media", name: "dark" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			assert.equal(customStyle.sheet?.cssRules.length, 1, "Should not duplicate rules");
		});
	});

	describe("responsive variants", () => {
		it("injects sm: variant with correct media query", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[200px]", { type: "media", name: "sm" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("min-width: 640px"), "Should use sm breakpoint (640px)");
			assert.ok(ruleText.includes("width"), "Should contain width property");
			assert.ok(ruleText.includes("200px"), "Should contain 200px value");
		});

		it("injects md: variant with correct media query", () => {
			if (!isSupported()) return;

			injectCustomClass("p-[1rem]", { type: "media", name: "md" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("min-width: 768px"), "Should use md breakpoint (768px)");
		});

		it("injects lg: and xl: variants with correct breakpoints", () => {
			if (!isSupported()) return;

			injectCustomClass("h-[50vh]", { type: "media", name: "lg" });
			injectCustomClass("gap-[2rem]", { type: "media", name: "xl" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const rules = Array.from(customStyle.sheet?.cssRules ?? []).map((r) => r.cssText);
			assert.ok(
				rules.some((r) => r.includes("min-width: 1024px")),
				"Should include lg breakpoint",
			);
			assert.ok(
				rules.some((r) => r.includes("min-width: 1280px")),
				"Should include xl breakpoint",
			);
		});

		it("injects responsive variant for standard utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("flex", { type: "media", name: "sm" });

			assert.ok(_getInjectedRules().has("sm:flex"), "Should track sm:flex");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("min-width: 640px"), "Should wrap in sm media query");
			assert.ok(ruleText.includes("display"), "Should contain the flex display rule");
		});

		it("processClassString handles responsive prefixed classes", () => {
			if (!isSupported()) return;

			processClassString("sm:w-[100px] md:bg-[#eee]");

			assert.ok(_getInjectedRules().has("sm:w-[100px]"), "Should inject sm:w-[100px]");
			assert.ok(_getInjectedRules().has("md:bg-[#eee]"), "Should inject md:bg-[#eee]");
		});
	});

	describe("pseudo-state variants", () => {
		it("injects hover: variant with pseudo selector", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-[#ff0000]", { type: "pseudo", name: "hover" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":hover"), "Should include :hover pseudo selector");
			assert.ok(ruleText.includes("background-color"), "Should contain background-color");
		});

		it("injects focus: variant with pseudo selector", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[300px]", { type: "pseudo", name: "focus" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":focus"), "Should include :focus pseudo selector");
		});

		it("injects disabled: variant with pseudo selector", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-[gray]", { type: "pseudo", name: "disabled" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":disabled"), "Should include :disabled pseudo selector");
		});

		it("injects pseudo variant for standard utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("hidden", { type: "pseudo", name: "hover" });

			assert.ok(_getInjectedRules().has("hover:hidden"), "Should track hover:hidden");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":hover"), "Should include :hover pseudo selector");
			assert.ok(ruleText.includes("display: none"), "Should contain the hidden display rule");
		});
	});

	describe("parseColorOpacityClass", () => {
		it("parses bg-red-500/50", () => {
			const result = parseColorOpacityClass("bg-red-500/50");
			assert.ok(result, "Should parse bg-red-500/50");
			assert.equal(result?.property, "background-color");
			assert.ok(result?.value.includes("/ 0.5"), "Should have 50% alpha");
		});

		it("parses text-black/20", () => {
			const result = parseColorOpacityClass("text-black/20");
			assert.ok(result, "Should parse text-black/20");
			assert.equal(result?.property, "color");
			assert.ok(result?.value.includes("0 0 0"), "Should have black RGB");
			assert.ok(result?.value.includes("/ 0.2"), "Should have 20% alpha");
		});

		it("parses border-blue-500/100", () => {
			const result = parseColorOpacityClass("border-blue-500/100");
			assert.ok(result, "Should parse border-blue-500/100");
			assert.equal(result?.property, "border-color");
			assert.ok(result?.value.includes("/ 1"), "Should have 100% alpha");
		});

		it("parses fill-gray-500/50", () => {
			const result = parseColorOpacityClass("fill-gray-500/50");
			assert.ok(result, "Should parse fill-gray-500/50");
			assert.equal(result?.property, "fill");
		});

		it("parses color without shade (defaults to 500)", () => {
			const result = parseColorOpacityClass("bg-red/50");
			assert.ok(result, "Should parse bg-red/50");
			assert.equal(result?.property, "background-color");
		});

		it("parses white/50", () => {
			const result = parseColorOpacityClass("bg-white/50");
			assert.ok(result, "Should parse bg-white/50");
			assert.ok(result?.value.includes("/ 0.5"), "Should have 50% alpha");
		});

		it("returns null for unknown color", () => {
			assert.equal(parseColorOpacityClass("bg-foobar/50"), null);
		});

		it("returns null for non-color prefix", () => {
			assert.equal(parseColorOpacityClass("w-red-500/50"), null);
		});

		it("returns null for no opacity", () => {
			assert.equal(parseColorOpacityClass("bg-red-500"), null);
		});
	});

	describe("color opacity injection", () => {
		it("injects color opacity class on demand", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-red-500/50");

			assert.ok(_getInjectedRules().has("bg-red-500/50"), "Should track the rule");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("background-color"), "Should contain background-color");
		});

		it("injects color opacity with dark: variant", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-red-500/50", { type: "media", name: "dark" });

			assert.ok(_getInjectedRules().has("dark:bg-red-500/50"), "Should track dark: rule");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("prefers-color-scheme: dark"), "Should use dark media query");
		});

		it("processClassString handles color opacity classes", () => {
			if (!isSupported()) return;

			processClassString("bg-black/50 text-white/80");

			assert.ok(_getInjectedRules().has("bg-black/50"), "Should inject bg-black/50");
			assert.ok(_getInjectedRules().has("text-white/80"), "Should inject text-white/80");
		});
	});

	describe("scanAndInject end-to-end", () => {
		it("scans DOM for bracket values and injects rules", () => {
			if (!isSupported()) return;

			const container = document.createElement("div");
			container.className = "w-[250px] mt-[1rem]";
			document.body.appendChild(container);

			scanAndInject(document);

			assert.ok(_getInjectedRules().has("w-[250px]"), "Should inject w-[250px]");
			assert.ok(_getInjectedRules().has("mt-[1rem]"), "Should inject mt-[1rem]");

			container.remove();
		});

		it("scans DOM for dark: prefixed classes and injects rules", () => {
			if (!isSupported()) return;

			const container = document.createElement("div");
			container.className = "dark:bg-[#222] dark:p-[2rem]";
			document.body.appendChild(container);

			scanAndInject(document);

			assert.ok(_getInjectedRules().has("dark:bg-[#222]"), "Should inject dark:bg-[#222]");
			assert.ok(_getInjectedRules().has("dark:p-[2rem]"), "Should inject dark:p-[2rem]");

			container.remove();
		});

		it("scans DOM for mixed variant classes", () => {
			if (!isSupported()) return;

			const container = document.createElement("div");
			container.className = "hover:bg-[#ccc] sm:w-[500px] dark:mt-[1rem]";
			document.body.appendChild(container);

			scanAndInject(document);

			assert.ok(_getInjectedRules().has("hover:bg-[#ccc]"), "Should inject hover:bg-[#ccc]");
			assert.ok(_getInjectedRules().has("sm:w-[500px]"), "Should inject sm:w-[500px]");
			assert.ok(_getInjectedRules().has("dark:mt-[1rem]"), "Should inject dark:mt-[1rem]");

			container.remove();
		});
	});

	describe("isSupported", () => {
		it("returns boolean", () => {
			assert.equal(typeof isSupported(), "boolean");
		});
	});
});
