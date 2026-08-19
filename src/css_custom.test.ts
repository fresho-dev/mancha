import { injectCss } from "./browser.js";
import {
	_getFailedLookups,
	_getInjectedRules,
	_resetForTesting,
	injectCustomClass,
	isSupported,
	parseColorOpacityClass,
	parseCustomValueClass,
	processClassString,
	scanAndInject,
} from "./css_custom.js";
import { assert, isNode } from "./test_utils.js";

/** Rules currently live in the on-demand stylesheet. */
function customRules(): CSSRule[] {
	const style = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement | null;
	return Array.from(style?.sheet?.cssRules ?? []);
}

/** Concatenated text of all live on-demand rules. */
function customRulesText(): string {
	return customRules()
		.map((rule) => rule.cssText)
		.join("\n");
}

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

		it("converts underscores to spaces for calc expressions", () => {
			const result = parseCustomValueClass("max-w-[calc(100%_-_2rem)]");
			assert.deepEqual(result, { property: "max-width", value: "calc(100% - 2rem)" });
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

	describe("orientation variants", () => {
		it("injects landscape: with an orientation media query", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[200px]", { type: "media", name: "landscape" });

			assert.ok(
				_getInjectedRules().has("landscape:w-[200px]"),
				"Should track the injected landscape: rule",
			);

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(
				ruleText.includes("orientation: landscape"),
				`Rule should use a landscape orientation media query, got: ${ruleText}`,
			);
			assert.ok(ruleText.includes("width"), "Rule should contain width");
		});

		it("injects portrait: with an orientation media query", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[200px]", { type: "media", name: "portrait" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(
				ruleText.includes("orientation: portrait"),
				`Rule should use a portrait orientation media query, got: ${ruleText}`,
			);
		});

		it("injects orientation variants for standard utility classes", () => {
			if (!isSupported()) return;

			// The motivating case from the issue: flex-col with landscape:flex-row.
			injectCss(["utils"]);
			processClassString("flex-col landscape:flex-row portrait:hidden");

			assert.ok(
				_getInjectedRules().has("landscape:flex-row"),
				"Should inject landscape:flex-row for a standard utility",
			);
			assert.ok(
				_getInjectedRules().has("portrait:hidden"),
				"Should inject portrait:hidden for a standard utility",
			);
		});

		it("does not treat orientation prefixes as pseudo-states", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[200px]", { type: "media", name: "landscape" });

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(
				!ruleText.includes(":landscape"),
				`Should not emit a :landscape pseudo-selector, got: ${ruleText}`,
			);
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

		it("injects ring colors, whose declaration is only a custom property", () => {
			if (!isSupported()) return;

			// Every other injected class declares a real CSS property. A block holding nothing but
			// `--ring-color` has to survive the "did the browser keep this declaration" check,
			// which reads style.length — so this is the one class shape that check could reject.
			injectCss(["utils"]);
			const warnings: string[] = [];
			const originalWarn = console.warn;
			console.warn = (msg: string) => warnings.push(msg);
			try {
				assert.ok(
					injectCustomClass("ring-indigo-500", { type: "pseudo", name: "focus" }),
					"focus:ring-indigo-500 should inject",
				);
				assert.ok(injectCustomClass("ring-red-500/50"), "ring-red-500/50 should inject");
			} finally {
				console.warn = originalWarn;
			}

			assert.equal(warnings.length, 0, `Injection should be silent, got: ${warnings.join(" | ")}`);
			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const rules = Array.from(customStyle?.sheet?.cssRules ?? []).map((r) => r.cssText);
			assert.ok(
				rules.some((r) => r.includes("focus") && r.includes("--ring-color")),
				`focus:ring-indigo-500 should leave a live rule, got: ${rules.join(" | ")}`,
			);
			assert.ok(
				rules.some((r) => r.includes("0.5") && r.includes("--ring-color")),
				`ring-red-500/50 should leave a live rule, got: ${rules.join(" | ")}`,
			);
		});

		it("processClassString handles dark: prefixed classes", () => {
			if (!isSupported()) return;

			processClassString("dark:bg-[#333] dark:w-[200px]");

			assert.ok(_getInjectedRules().has("dark:bg-[#333]"), "Should inject dark:bg-[#333]");
			assert.ok(_getInjectedRules().has("dark:w-[200px]"), "Should inject dark:w-[200px]");
		});

		it("does not re-inject plain utility classes when mixed with dark: variants", () => {
			if (!isSupported()) return;

			processClassString("bg-white dark:bg-[#1a1a1a]");

			assert.ok(_getInjectedRules().has("dark:bg-[#1a1a1a]"), "Should inject dark variant");
			assert.ok(!_getInjectedRules().has("bg-white"), "Should NOT inject plain bg-white");
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

		it("injects sm: variant for a percentage utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("w-50%", { type: "media", name: "sm" });

			const ruleText = customRulesText();
			assert.ok(ruleText.includes("min-width: 640px"), "Should wrap in sm media query");
			assert.ok(
				ruleText.includes("width: 50%"),
				`Should contain the percentage width rule, got: ${ruleText}`,
			);
		});

		it("injects md: variant for a percentage utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("w-25%", { type: "media", name: "md" });

			const ruleText = customRulesText();
			assert.ok(ruleText.includes("min-width: 768px"), "Should wrap in md media query");
			assert.ok(
				ruleText.includes("width: 25%"),
				`Should contain the percentage width rule, got: ${ruleText}`,
			);
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

		it("injects hover: variant for a percentage utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("w-50%", { type: "pseudo", name: "hover" });

			const ruleText = customRulesText();
			assert.ok(ruleText.includes(":hover"), "Should include :hover pseudo selector");
			assert.ok(
				ruleText.includes("width: 50%"),
				`Should contain the percentage width rule, got: ${ruleText}`,
			);
		});
	});

	describe("selector escaping", () => {
		it("injects bracket values containing a percent sign", () => {
			if (!isSupported()) return;

			assert.ok(injectCustomClass("w-[50%]"), "Should report a successful injection");

			const ruleText = customRulesText();
			assert.ok(ruleText.includes("width: 50%"), `Should contain the width rule, got: ${ruleText}`);
		});

		it("injects bracket values containing calc expressions", () => {
			if (!isSupported()) return;

			// calc() requires spaces around `-`, so calc(100%-2rem) is not a valid
			// value and the rule must be rejected rather than cached as inert.
			assert.ok(
				!injectCustomClass("w-[calc(100%-2rem)]"),
				"Should reject an unparseable calc value",
			);
			assert.ok(
				injectCustomClass("max-w-[calc(100%_-_2rem)]"),
				"Should report a successful injection",
			);

			const ruleText = customRulesText();
			assert.ok(
				ruleText.includes("max-width: calc(100% - 2rem)"),
				`Should contain the max-width rule, got: ${ruleText}`,
			);
		});

		it("injects bracket values containing commas", () => {
			if (!isSupported()) return;

			assert.ok(
				injectCustomClass("w-[clamp(1rem,2vw,3rem)]"),
				"Should report a successful injection",
			);

			const ruleText = customRulesText();
			assert.ok(ruleText.includes("clamp("), `Should contain the clamp value, got: ${ruleText}`);
		});

		it("injects bracket values containing exclamation marks", () => {
			if (!isSupported()) return;

			assert.ok(injectCustomClass("m-[1px!important]"), "Should report a successful injection");

			const ruleText = customRulesText();
			assert.ok(
				ruleText.includes("margin: 1px"),
				`Should contain the margin rule, got: ${ruleText}`,
			);
		});

		it("injects sm: variant for a rem text size utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("text-1.5rem", { type: "media", name: "sm" });

			const ruleText = customRulesText();
			assert.ok(ruleText.includes("min-width: 640px"), "Should wrap in sm media query");
			assert.ok(
				ruleText.includes("font-size: 1.5rem"),
				`Should contain the rem font-size rule, got: ${ruleText}`,
			);
		});

		it("does not leave an empty media block behind for variant bracket values", () => {
			if (!isSupported()) return;

			processClassString("sm:w-[50%]");

			const rules = customRules();
			assert.equal(rules.length, 1, "Should have inserted exactly one rule");
			const media = rules[0] as CSSMediaRule;
			assert.equal(
				media.cssRules.length,
				1,
				`Media block should hold a live style rule, got: ${media.cssText}`,
			);
			assert.ok(
				media.cssRules[0].cssText.includes("width: 50%"),
				`Media block should apply the width, got: ${media.cssText}`,
			);
		});
	});

	describe("declaration invariant", () => {
		it("rejects a rule whose declaration the browser drops", () => {
			if (!isSupported()) return;

			// url() is not a valid width, so the browser parses the selector but
			// discards the declaration, leaving an inert rule behind.
			assert.ok(
				!injectCustomClass("w-[url('a.png')]"),
				"Should report a failed injection for a dropped declaration",
			);
			assert.ok(
				!_getInjectedRules().has("w-[url('a.png')]"),
				"Should not cache a rule that has no declarations",
			);
			assert.equal(
				customRules().length,
				0,
				`Should leave no rule behind, got: ${customRulesText()}`,
			);
		});

		it("rejects a variant rule whose declaration the browser drops", () => {
			if (!isSupported()) return;

			assert.ok(
				!injectCustomClass("w-[url('a.png')]", { type: "media", name: "sm" }),
				"Should report a failed injection for a dropped declaration",
			);
			assert.ok(
				!_getInjectedRules().has("sm:w-[url('a.png')]"),
				"Should not cache a media rule that has no declarations",
			);
			assert.equal(
				customRules().length,
				0,
				`Should leave no rule behind, got: ${customRulesText()}`,
			);
		});

		it("keeps rules that carry a live declaration", () => {
			if (!isSupported()) return;

			assert.ok(injectCustomClass("w-[50%]"), "Should accept a valid declaration");
			assert.ok(
				injectCustomClass("w-[50%]", { type: "media", name: "sm" }),
				"Should accept a valid declaration inside a media wrapper",
			);
			assert.equal(customRules().length, 2, "Should keep both rules");
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

		it("parses ring-red-500/50", () => {
			const result = parseColorOpacityClass("ring-red-500/50");
			assert.ok(result, "Should parse ring-red-500/50");
			assert.equal(result?.property, "--ring-color");
			assert.ok(result?.value.includes("244 67 54"), "Should have red-500 RGB");
			assert.ok(result?.value.includes("/ 0.5"), "Should have 50% alpha");
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

		it("scans DOM for variants of percentage utilities", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			const container = document.createElement("div");
			container.className = "sm:w-50% hover:w-25%";
			document.body.appendChild(container);

			scanAndInject(document);

			const ruleText = customRulesText();
			assert.ok(
				ruleText.includes("width: 50%"),
				`Should inject sm:w-50% as a live rule, got: ${ruleText}`,
			);
			assert.ok(
				ruleText.includes("width: 25%"),
				`Should inject hover:w-25% as a live rule, got: ${ruleText}`,
			);

			container.remove();
		});
	});

	describe("unresolvable classes", () => {
		/**
		 * Outlive the window during which the negative cache is trusted without re-checking the
		 * page's rules. Anything that adds rules after a failed lookup has to clear it.
		 */
		function sleepPastFingerprint(): Promise<void> {
			return new Promise((resolve) => setTimeout(resolve, 60));
		}

		/**
		 * Count how many sheets get their rules walked. Reading cssRules is the
		 * expensive half of a lookup, and the only part that scales with sheet size.
		 */
		function countRuleWalks(fn: () => void): number {
			const saved = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, "cssRules");
			if (!saved?.get) return -1;
			let walks = 0;
			Object.defineProperty(CSSStyleSheet.prototype, "cssRules", {
				...saved,
				get(this: CSSStyleSheet) {
					walks++;
					return saved.get?.call(this);
				},
			});
			try {
				fn();
			} finally {
				Object.defineProperty(CSSStyleSheet.prototype, "cssRules", saved);
			}
			return walks;
		}

		it("caches a class that resolves to nothing", () => {
			if (!isSupported()) return;
			processClassString("hover:bg-nosuchcolor-500");
			assert.ok(
				_getFailedLookups().has("bg-nosuchcolor-500"),
				"Unresolvable class should be recorded under its base name",
			);
		});

		it("does not re-walk the stylesheets on later attempts", () => {
			if (!isSupported()) return;
			processClassString("hover:bg-nosuchcolor-500");
			const walks = countRuleWalks(() => {
				processClassString("hover:bg-nosuchcolor-500");
				processClassString("lg:bg-nosuchcolor-500");
			});
			if (walks < 0) return; // cssRules is not an interceptable accessor here.
			assert.equal(walks, 0, "A cached failure should not walk any stylesheet");
		});

		it("warns once, not on every scan", () => {
			if (!isSupported()) return;
			const originalWarn = console.warn;
			const warnings: string[] = [];
			console.warn = (msg: string) => warnings.push(msg);
			try {
				processClassString("hover:bg-nosuchcolor-500");
				processClassString("hover:bg-nosuchcolor-500");
				processClassString("hover:bg-nosuchcolor-500");
			} finally {
				console.warn = originalWarn;
			}
			const matching = warnings.filter((w) => w.includes("nosuchcolor"));
			assert.equal(matching.length, 1, "Should warn exactly once");
		});

		it("retries after a new stylesheet appears", async () => {
			if (!isSupported()) return;
			processClassString("hover:bg-latecolor");
			assert.ok(_getFailedLookups().has("bg-latecolor"), "Precondition: cached as failed");

			// A stylesheet that loads after the first scan can define the class.
			const late = document.createElement("style");
			late.textContent = ".bg-latecolor { background-color: #abc }";
			document.head.appendChild(late);
			await sleepPastFingerprint();

			try {
				processClassString("hover:bg-latecolor");
				assert.ok(
					_getInjectedRules().has("hover:bg-latecolor"),
					"Should resolve once the defining sheet exists",
				);
			} finally {
				late.remove();
			}
		});

		it("names the class as it was written, not its base name", () => {
			if (!isSupported()) return;
			const originalWarn = console.warn;
			const warnings: string[] = [];
			console.warn = (msg: string) => warnings.push(msg);
			try {
				processClassString("hover:bg-nosuchcolor-500");
			} finally {
				console.warn = originalWarn;
			}
			assert.ok(
				warnings.some((w) => w.includes("hover:bg-nosuchcolor-500")),
				`The warning should name the class as written, got: ${warnings.join(" | ")}`,
			);
		});

		it("reports a class once even after the page's rules change", () => {
			if (!isSupported()) return;
			const originalWarn = console.warn;
			const warnings: string[] = [];
			console.warn = (msg: string) => warnings.push(msg);
			const late = document.createElement("style");
			try {
				processClassString("hover:bg-nosuchcolor-500");

				// Dropping the negative cache makes the next attempt re-resolve, but the class
				// has not changed, so a theme switch or a lazy chunk must not re-report it.
				late.textContent = ".unrelated-late { color: red }";
				document.head.appendChild(late);
				processClassString("hover:bg-nosuchcolor-500");
			} finally {
				console.warn = originalWarn;
				late.remove();
			}
			const matching = warnings.filter((w) => w.includes("nosuchcolor"));
			assert.equal(matching.length, 1, `Should report once, got: ${matching.join(" | ")}`);
		});

		it("stays silent for classes it can resolve", () => {
			if (!isSupported()) return;
			const originalWarn = console.warn;
			const warnings: string[] = [];
			console.warn = (msg: string) => warnings.push(msg);
			try {
				processClassString("md:p-[2rem] bg-red-500/50 hover:w-[50px] disabled:text-blue-700/25");
			} finally {
				console.warn = originalWarn;
			}
			assert.equal(warnings.length, 0, `Resolvable classes must not warn: ${warnings.join(" | ")}`);
		});

		it("retries after a rule is added to a stylesheet that was already there", async () => {
			if (!isSupported()) return;
			// A count of stylesheets cannot see this: the sheet was present for both attempts.
			const existing = document.createElement("style");
			existing.textContent = ".unrelated-anchor { color: red }";
			document.head.appendChild(existing);
			try {
				processClassString("hover:bg-insertedcolor");
				assert.ok(_getFailedLookups().has("bg-insertedcolor"), "Precondition: cached as failed");

				existing.sheet?.insertRule(".bg-insertedcolor { background-color: #abc }", 0);
				await sleepPastFingerprint();
				processClassString("hover:bg-insertedcolor");
				assert.ok(
					_getInjectedRules().has("hover:bg-insertedcolor"),
					"Should resolve once an existing sheet defines the class",
				);
			} finally {
				existing.remove();
			}
		});

		it("keeps cached failures when its own stylesheet is recreated", () => {
			if (!isSupported()) return;
			processClassString("hover:bg-nosuchcolor-500");
			assert.ok(_getFailedLookups().has("bg-nosuchcolor-500"), "Precondition: cached as failed");

			// Losing our own sheet says nothing about what the page's other sheets define, so the
			// negative cache stays: a class that resolved to nothing still does.
			document.querySelector('style[data-mancha="custom"]')?.remove();
			processClassString("hover:bg-nosuchcolor-500");
			assert.ok(
				_getFailedLookups().has("bg-nosuchcolor-500"),
				"A recreated sheet should not cost a re-walk of every other sheet",
			);
		});

		it("bounds how many failures it caches", function () {
			// Every miss walks the stylesheets, and it takes more misses than the cap to show the
			// cap working, so this one test costs a few hundred walks. Enough headroom for that to
			// hold while the rest of the suite competes for the machine.
			this.timeout(10_000);
			if (!isSupported()) return;
			// A dynamic class expression can produce an unbounded number of distinct classes,
			// none of which will ever be a cache hit.
			const originalWarn = console.warn;
			console.warn = () => {};
			try {
				for (let i = 0; i < 300; i++) processClassString(`hover:bg-nocolor-${i}`);
			} finally {
				console.warn = originalWarn;
			}
			assert.ok(
				_getFailedLookups().size < 300,
				`The negative cache should be bounded, holds ${_getFailedLookups().size}`,
			);
		});

		it("is cleared by _resetForTesting", () => {
			if (!isSupported()) return;
			processClassString("hover:bg-nosuchcolor-500");
			assert.ok(_getFailedLookups().size > 0, "Precondition: something cached");
			_resetForTesting();
			assert.equal(_getFailedLookups().size, 0, "Reset should clear failed lookups");
		});
	});

	describe("scanAndInject without a global document", () => {
		// scanAndInject is public API, so consumers may call it from a module that
		// also runs on the server (Next.js, Astro, Remix). Node-only: the browser
		// always has a global document, so there is nothing to simulate there.
		it("no-ops instead of throwing when called with no arguments", () => {
			if (!isNode) return;

			const saved = Object.getOwnPropertyDescriptor(globalThis, "document");
			delete (globalThis as { document?: unknown }).document;

			try {
				assert.equal(typeof globalThis.document, "undefined", "Precondition: no document");
				scanAndInject();
			} finally {
				if (saved) Object.defineProperty(globalThis, "document", saved);
			}
		});
	});

	describe("stylesheet removal", () => {
		it("re-injects on re-scan after the stylesheet element was removed", () => {
			if (!isSupported()) return;

			const container = document.createElement("div");
			container.className = "w-[617px]";
			document.body.appendChild(container);
			scanAndInject(container);

			// An SPA router, hot-reload or head sanitizer wipes the injected sheet.
			document.querySelector('style[data-mancha="custom"]')?.remove();
			scanAndInject(container);

			const style = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			assert.ok(style, "Should recreate the stylesheet element");
			const rules = Array.from(style.sheet?.cssRules ?? []).map((r) => r.cssText);
			assert.ok(
				rules.some((r) => r.includes("617px")),
				`Should re-inject the cached rule, got: ${rules.join(" | ")}`,
			);

			container.remove();
		});
	});

	describe("isSupported", () => {
		it("returns boolean", () => {
			assert.equal(typeof isSupported(), "boolean");
		});
	});
});
