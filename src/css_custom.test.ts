import { injectCss } from "./browser.js";
import {
	_getFailedLookups,
	_getInjectedRules,
	_getWarnedLookups,
	_resetForTesting,
	injectCustomClass,
	isSupported,
	processClassString,
	scanAndInject,
} from "./css_custom.js";
import { parseColorOpacityClass, parseCustomValueClass } from "./css_parse.js";
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

		it("parses grid templates with spaces and nested functions", () => {
			assert.deepEqual(
				parseCustomValueClass("grid-cols-[max-content_minmax(0,max-content)_max-content]"),
				{
					property: "grid-template-columns",
					value: "max-content minmax(0,max-content) max-content",
				},
			);
			assert.deepEqual(parseCustomValueClass("grid-rows-[auto_1fr]"), {
				property: "grid-template-rows",
				value: "auto 1fr",
			});
		});

		it("parses border radius and line height", () => {
			assert.deepEqual(parseCustomValueClass("rounded-[12px]"), {
				property: "border-radius",
				value: "12px",
			});
			assert.deepEqual(parseCustomValueClass("leading-[1.1]"), {
				property: "line-height",
				value: "1.1",
			});
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

			injectCustomClass("w-[200px]", "landscape");

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

			injectCustomClass("w-[200px]", "portrait");

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

			injectCustomClass("w-[200px]", "landscape");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(
				!ruleText.includes(":landscape"),
				`Should not emit a :landscape pseudo-selector, got: ${ruleText}`,
			);
		});
	});

	describe("print variant", () => {
		it("injects print: for standard utility classes", () => {
			if (!isSupported()) return;
			injectCss(["utils"]);
			processClassString("print:hidden");
			const rule = customRules()[0] as CSSMediaRule;
			assert.equal(rule.conditionText, "print");
			assert.equal((rule.cssRules[0] as CSSStyleRule).style.display, "none");
		});
	});

	describe("dark variant", () => {
		it("injects dark: custom bracket value with prefers-color-scheme media query", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-[#1a1a1a]", "dark");

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

			injectCustomClass("bg-gray-900", "dark");

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
					injectCustomClass("ring-indigo-500", "focus"),
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

			injectCustomClass("bg-[#111]", "dark");
			injectCustomClass("bg-[#111]", "dark");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			assert.equal(customStyle.sheet?.cssRules.length, 1, "Should not duplicate rules");
		});
	});

	describe("responsive variants", () => {
		it("injects sm: variant with correct media query", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[200px]", "sm");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("min-width: 640px"), "Should use sm breakpoint (640px)");
			assert.ok(ruleText.includes("width"), "Should contain width property");
			assert.ok(ruleText.includes("200px"), "Should contain 200px value");
		});

		it("injects md: variant with correct media query", () => {
			if (!isSupported()) return;

			injectCustomClass("p-[1rem]", "md");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("min-width: 768px"), "Should use md breakpoint (768px)");
		});

		it("injects lg: and xl: variants with correct breakpoints", () => {
			if (!isSupported()) return;

			injectCustomClass("h-[50vh]", "lg");
			injectCustomClass("gap-[2rem]", "xl");

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

			injectCustomClass("flex", "sm");

			assert.ok(_getInjectedRules().has("sm:flex"), "Should track sm:flex");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes("min-width: 640px"), "Should wrap in sm media query");
			assert.ok(ruleText.includes("display"), "Should contain the flex display rule");
		});

		it("injects sm: variant for a percentage utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("w-50%", "sm");

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

			injectCustomClass("w-25%", "md");

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

			injectCustomClass("bg-[#ff0000]", "hover");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":hover"), "Should include :hover pseudo selector");
			assert.ok(ruleText.includes("background-color"), "Should contain background-color");
		});

		it("injects focus: variant with pseudo selector", () => {
			if (!isSupported()) return;

			injectCustomClass("w-[300px]", "focus");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":focus"), "Should include :focus pseudo selector");
		});

		it("injects disabled: variant with pseudo selector", () => {
			if (!isSupported()) return;

			injectCustomClass("bg-[gray]", "disabled");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":disabled"), "Should include :disabled pseudo selector");
		});

		it("injects pseudo variant for standard utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("hidden", "hover");

			assert.ok(_getInjectedRules().has("hover:hidden"), "Should track hover:hidden");

			const customStyle = document.querySelector('style[data-mancha="custom"]') as HTMLStyleElement;
			const ruleText = customStyle.sheet?.cssRules[0].cssText ?? "";
			assert.ok(ruleText.includes(":hover"), "Should include :hover pseudo selector");
			assert.ok(ruleText.includes("display: none"), "Should contain the hidden display rule");
		});

		it("injects hover: variant for a percentage utility via lookup", () => {
			if (!isSupported()) return;

			injectCss(["utils"]);

			injectCustomClass("w-50%", "hover");

			const ruleText = customRulesText();
			assert.ok(ruleText.includes(":hover"), "Should include :hover pseudo selector");
			assert.ok(
				ruleText.includes("width: 50%"),
				`Should contain the percentage width rule, got: ${ruleText}`,
			);
		});
	});

	describe("state variants", () => {
		it("injects empty: with an :empty selector", () => {
			if (!isSupported()) return;
			injectCustomClass("w-[201px]", "empty");
			assert.ok(customRulesText().includes(":empty"), `Got: ${customRulesText()}`);
		});

		it("injects aria-{state}: as a true-valued attribute selector", () => {
			if (!isSupported()) return;
			processClassString("aria-pressed:w-[202px]");
			assert.ok(_getInjectedRules().has("aria-pressed:w-[202px]"));
			assert.ok(customRulesText().includes('[aria-pressed="true"]'), `Got: ${customRulesText()}`);
		});

		it("injects aria-[name=value]: as an attribute selector", () => {
			if (!isSupported()) return;
			processClassString("aria-[current=page]:w-[203px]");
			assert.ok(_getInjectedRules().has("aria-[current=page]:w-[203px]"));
			assert.ok(customRulesText().includes('[aria-current="page"]'), `Got: ${customRulesText()}`);
		});

		it("injects has-{state}: as a :has() selector", () => {
			if (!isSupported()) return;
			processClassString("has-checked:w-[204px]");
			assert.ok(_getInjectedRules().has("has-checked:w-[204px]"));
			assert.ok(customRulesText().includes(":has(:checked)"), `Got: ${customRulesText()}`);
		});

		it("injects has-[selector]: despite the colon inside the brackets", () => {
			if (!isSupported()) return;
			processClassString("has-[:checked]:w-[205px]");
			assert.ok(_getInjectedRules().has("has-[:checked]:w-[205px]"));
			assert.ok(customRulesText().includes(":has(:checked)"), `Got: ${customRulesText()}`);
		});

		it("applies variants to static utilities via lookup", () => {
			if (!isSupported()) return;
			injectCss(["utils"]);
			injectCustomClass("float-left", "hover");
			assert.ok(customRulesText().includes("float: left"), `Got: ${customRulesText()}`);
		});

		for (const cls of [
			"has-[a),.x,b(]:w-[206px]",
			"has-[(]:w-[206px]",
			"has-[:checked;color:red]:w-[206px]",
			"has-[a{}]:w-[206px]",
			"has-[a\\]:w-[206px]",
			"aria-[current=page;x]:w-[206px]",
			'aria-[current="page"]:w-[206px]',
			"aria-[current]:w-[206px]",
			"active:w-[206px]",
		]) {
			it(`rejects ${cls}`, () => {
				if (!isSupported()) return;
				const warnings: string[] = [];
				const originalWarn = console.warn;
				console.warn = (msg: string) => warnings.push(msg);
				try {
					processClassString(cls);
				} finally {
					console.warn = originalWarn;
				}
				assert.equal(customRules().length, 0, `Got: ${customRulesText()}`);
				assert.deepEqual(warnings, [`No CSS rule for class: ${cls}`]);
			});
		}

		for (const variant of [
			"has-[a:b]",
			"has-[>]",
			"has-[,]",
			"has-[()]",
			"has-[-]",
			"has-[#1]",
			"has-[::before]",
			"has-[:has(a)]",
		]) {
			it(`rejects ${variant}:w-[207px] once, without poisoning its base class`, () => {
				if (!isSupported()) return;
				const cls = `${variant}:w-[207px]`;
				const warnings: string[] = [];
				const originalWarn = console.warn;
				const originalInsert = CSSStyleSheet.prototype.insertRule;
				let inserts = 0;
				console.warn = (msg: string) => warnings.push(msg);
				CSSStyleSheet.prototype.insertRule = function (...args) {
					inserts++;
					return originalInsert.apply(this, args);
				};
				try {
					for (let i = 0; i < 5; i++) processClassString(cls);
				} finally {
					console.warn = originalWarn;
					CSSStyleSheet.prototype.insertRule = originalInsert;
				}
				assert.equal(inserts, 1);
				assert.deepEqual(warnings, [`No CSS rule for class: ${cls}`]);
				assert.ok(!_getFailedLookups().has("w-[207px]"));
				processClassString("w-[207px] hover:w-[207px]");
				assert.ok(_getInjectedRules().has("w-[207px]"));
				assert.ok(_getInjectedRules().has("hover:w-[207px]"));
			});
		}

		for (const [variant, cond] of [
			["hover", ":hover"],
			["aria-pressed", '[aria-pressed="true"]'],
		]) {
			it(`puts ${variant}: on the divide-* container, not its children`, () => {
				if (!isSupported()) return;
				injectCustomClass("divide-red-500/50", variant);
				const rule = customRules()[0] as CSSStyleRule;
				assert.ok(
					rule.selectorText.endsWith(`${cond} > :not(:last-child)`),
					`Got: ${rule.selectorText}`,
				);
			});
		}
	});

	describe("stacked variants", () => {
		for (const [cls, media, selector] of [
			[
				"dark:md:hover:w-[301px]",
				"(prefers-color-scheme: dark) and (min-width: 768px)",
				".dark\\:md\\:hover\\:w-\\[301px\\]:hover",
			],
			[
				"dark:md:w-[302px]",
				"(prefers-color-scheme: dark) and (min-width: 768px)",
				".dark\\:md\\:w-\\[302px\\]",
			],
			[
				"hover:aria-pressed:w-[303px]",
				"",
				'.hover\\:aria-pressed\\:w-\\[303px\\]:hover[aria-pressed="true"]',
			],
			[
				"md:aria-[current=page]:w-[304px]",
				"(min-width: 768px)",
				'.md\\:aria-\\[current\\=page\\]\\:w-\\[304px\\][aria-current="page"]',
			],
			[
				"dark:has-[:checked]:w-[305px]",
				"(prefers-color-scheme: dark)",
				".dark\\:has-\\[\\:checked\\]\\:w-\\[305px\\]:has(:checked)",
			],
			["print:w-[308px]", "print", ".print\\:w-\\[308px\\]"],
			[
				"md:print:hover:w-[309px]",
				"print and (min-width: 768px)",
				".md\\:print\\:hover\\:w-\\[309px\\]:hover",
			],
		]) {
			it(`injects ${cls}`, () => {
				if (!isSupported()) return;
				processClassString(cls);
				assert.ok(_getInjectedRules().has(cls));
				const rules = customRules();
				assert.equal(rules.length, 1, `Got: ${customRulesText()}`);
				const outer = rules[0] as CSSMediaRule;
				const inner = (media ? outer.cssRules[0] : outer) as CSSStyleRule;
				assert.equal(media ? outer.conditionText : "", media);
				assert.equal(inner.selectorText, selector);
			});
		}

		it("puts a stack on the divide-* container, suffix last", () => {
			if (!isSupported()) return;
			processClassString("hover:aria-pressed:divide-red-500/50");
			const rule = customRules()[0] as CSSStyleRule;
			assert.ok(
				rule.selectorText.endsWith(':hover[aria-pressed="true"] > :not(:last-child)'),
				`Got: ${rule.selectorText}`,
			);
		});

		for (const cls of ["active:md:w-[306px]", "md:active:w-[306px]", "md:hover:active:w-[306px]"]) {
			it(`rejects ${cls} once`, () => {
				if (!isSupported()) return;
				const warnings: string[] = [];
				const originalWarn = console.warn;
				console.warn = (msg: string) => warnings.push(msg);
				try {
					processClassString(cls);
					processClassString(cls);
				} finally {
					console.warn = originalWarn;
				}
				assert.equal(customRules().length, 0, `Got: ${customRulesText()}`);
				assert.deepEqual(warnings, [`No CSS rule for class: ${cls}`]);
			});
		}

		for (const cls of [
			"md:has-[:chcked]:bg-[red]",
			"dark:has-[a,,b]:w-[1px]",
			"sm:has-[:has(a)]:w-[1px]",
		]) {
			it(`rejects ${cls} once when the media rule comes back empty`, () => {
				if (!isSupported()) return;
				const warnings: string[] = [];
				const originalWarn = console.warn;
				const originalInsert = CSSStyleSheet.prototype.insertRule;
				let inserts = 0;
				console.warn = (msg: string) => warnings.push(msg);
				CSSStyleSheet.prototype.insertRule = function (...args) {
					inserts++;
					return originalInsert.apply(this, args);
				};
				try {
					for (let i = 0; i < 5; i++) processClassString(cls);
				} finally {
					console.warn = originalWarn;
					CSSStyleSheet.prototype.insertRule = originalInsert;
				}
				assert.equal(inserts, 1);
				assert.deepEqual(warnings, [`No CSS rule for class: ${cls}`]);
			});
		}

		for (const [cls, base, expected] of [
			["md:foo:hidden", "foo\\:hidden", "(min-width: 768px)"],
			["hover:foo:bar", "foo\\:bar", ""],
		]) {
			it(`reads ${cls} as variants on a user-defined base class`, () => {
				if (!isSupported()) return;
				const user = document.createElement("style");
				user.textContent = `.${base} { display: none }`;
				document.head.appendChild(user);
				try {
					processClassString(cls);
				} finally {
					user.remove();
				}
				assert.ok(_getInjectedRules().has(cls), `Got: ${customRulesText()}`);
				const outer = customRules()[0] as CSSMediaRule;
				const inner = (expected ? outer.cssRules[0] : outer) as CSSStyleRule;
				assert.equal(expected ? outer.conditionText : "", expected);
				assert.equal(inner.style.display, "none");
			});
		}

		it("falls back to a user-defined rule for a bracket value the browser rejects", () => {
			if (!isSupported()) return;
			const user = document.createElement("style");
			user.textContent = ".text-\\[brand\\] { color: rgb(1, 2, 3) }";
			document.head.appendChild(user);
			const warnings: string[] = [];
			const originalWarn = console.warn;
			console.warn = (msg: string) => warnings.push(msg);
			try {
				processClassString("hover:text-[brand]");
			} finally {
				console.warn = originalWarn;
				user.remove();
			}
			assert.deepEqual(warnings, []);
			assert.equal((customRules()[0] as CSSStyleRule).style.color, "rgb(1, 2, 3)");
		});

		it("does not re-insert a stack on repeat scans", () => {
			if (!isSupported()) return;
			for (let i = 0; i < 3; i++) processClassString("dark:md:hover:w-[307px] sm:focus:w-[307px]");
			assert.equal(customRules().length, 2, `Got: ${customRulesText()}`);
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

			injectCustomClass("text-1.5rem", "sm");

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
				!injectCustomClass("w-[url('a.png')]", "sm"),
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
				injectCustomClass("w-[50%]", "sm"),
				"Should accept a valid declaration inside a media wrapper",
			);
			assert.equal(customRules().length, 2, "Should keep both rules");
		});
	});

	describe("bracket value validation", () => {
		const injections = [
			"w-[1px;:not(&){color:rgb(1,2,3)}]",
			"md:w-[1px;}body{background:red}]",
			"md:w-[1px;}body{background:red]",
		];
		const rejected = [
			"w-[1px;color:red]",
			"w-[1px{]",
			"w-[1px}]",
			"w-[1px\\]",
			"w-[1px/*]",
			"w-['1px']",
			'w-["1px"]',
			"w-[calc(1px]",
			"w-[1px)]",
			"w-[)(]",
			"w-[a[b]]",
			"w-[a:b]",
			"w-[a@b]",
			"w-[<a>]",
			"text-[#12345]",
			"border-[#1234567]",
			"-text-[#666]",
			"-border-[red]",
			"-text-[2px]",
			"-border-[2px]",
		];
		const legit: [string, string, string][] = [
			["w-[10px]", "width", "10px"],
			["w-[calc(100%_-_2rem)]", "width", "calc(100% - 2rem)"],
			["bg-[#fff]", "background-color", "#fff"],
			["bg-[rgb(1,2,3)]", "background-color", "rgb(1,2,3)"],
			["bg-[rgba(0,0,0,0.5)]", "background-color", "rgba(0,0,0,0.5)"],
			["bg-[rgb(0_0_0/0.5)]", "background-color", "rgb(0 0 0/0.5)"],
			["top-[-5px]", "top", "-5px"],
			["-mt-[3px]", "margin-top", "-3px"],
			["font-[500]", "", ""],
			["text-[1.5rem]", "font-size", "1.5rem"],
			["text-[#666]", "color", "#666"],
			["text-[rgb(1,2,3)]", "color", "rgb(1,2,3)"],
			["text-[oklch(0.5_0.1_200)]", "color", "oklch(0.5 0.1 200)"],
			["text-[currentColor]", "color", "currentColor"],
			["text-[calc(1rem_+_2px)]", "font-size", "calc(1rem + 2px)"],
			["text-[var(--x)]", "color", "var(--x)"],
			["text-[2PX]", "font-size", "2PX"],
			["text-[CALC(1px)]", "font-size", "CALC(1px)"],
			["text-[larger]", "font-size", "larger"],
			["text-[xx-small]", "font-size", "xx-small"],
			["text-[medium]", "font-size", "medium"],
			["text-[red]", "color", "red"],
			["text-[inherit]", "color", "inherit"],
			["border-[thin]", "border-width", "thin"],
			["border-[medium]", "border-width", "medium"],
			["border-[var(--brand)]", "border-color", "var(--brand)"],
			["border-[currentcolor]", "border-color", "currentcolor"],
			["border-[2px]", "border-width", "2px"],
			["border-[#ccc]", "border-color", "#ccc"],
			["border-[hsl(0,0%,50%)]", "border-color", "hsl(0,0%,50%)"],
			["w-[var(--x)]", "width", "var(--x)"],
			["w-[min(10px,5vw)]", "width", "min(10px,5vw)"],
			["w-[calc(2*3px_+_1px)]", "width", "calc(2*3px + 1px)"],
			["m-[1px!important]", "margin", "1px!important"],
			["max-w-[none]", "max-width", "none"],
		];

		for (const cls of [...injections.map((c) => c.replace(/^md:/, "")), ...rejected]) {
			it(`parses ${JSON.stringify(cls)} as no value`, () => {
				assert.equal(parseCustomValueClass(cls), null);
			});
		}

		for (const [cls, property, value] of legit) {
			it(`parses ${cls}`, () => {
				const expected = property ? { property, value } : null;
				assert.deepEqual(parseCustomValueClass(cls), expected);
			});
		}

		for (const cls of [...injections, ...rejected]) {
			it(`injects nothing for ${JSON.stringify(cls)} and warns once`, () => {
				if (!isSupported()) return;
				const warnings: string[] = [];
				const originalWarn = console.warn;
				console.warn = (msg: string) => warnings.push(msg);
				try {
					processClassString(cls);
					processClassString(cls);
					injectCustomClass(cls);
				} finally {
					console.warn = originalWarn;
				}
				assert.equal(customRules().length, 0, `Got: ${customRulesText()}`);
				assert.equal(warnings.length, 1, `Got: ${warnings.join("\n")}`);
				assert.ok(warnings[0].startsWith("No CSS rule for class: "), warnings[0]);
			});
		}

		it("does not restyle other elements", () => {
			if (!isSupported()) return;
			const el = document.createElement("div");
			el.className = injections.join(" ");
			const other = document.createElement("p");
			document.body.append(el, other);
			const originalWarn = console.warn;
			console.warn = () => {};
			try {
				scanAndInject(el);
				assert.notEqual(getComputedStyle(document.body).color, "rgb(1, 2, 3)");
				assert.notEqual(getComputedStyle(other).color, "rgb(1, 2, 3)");
				assert.notEqual(getComputedStyle(document.body).backgroundColor, "rgb(255, 0, 0)");
			} finally {
				console.warn = originalWarn;
				el.remove();
				other.remove();
			}
		});

		it("passes an unknown text-[…] identifier through as a color, then warns once", () => {
			assert.deepEqual(parseCustomValueClass("text-[foo]"), { property: "color", value: "foo" });
			if (!isSupported()) return;
			const warnings: string[] = [];
			const originalWarn = console.warn;
			console.warn = (msg: string) => warnings.push(msg);
			try {
				processClassString("text-[foo]");
				processClassString("text-[foo]");
				assert.ok(!injectCustomClass("text-[foo]"));
			} finally {
				console.warn = originalWarn;
			}
			assert.equal(customRules().length, 0, `Got: ${customRulesText()}`);
			assert.equal(warnings.length, 1, `Got: ${warnings.join("\n")}`);
			assert.ok(warnings[0].startsWith("No CSS rule for class: "), warnings[0]);
		});

		it("injects legitimate values", () => {
			if (!isSupported()) return;
			for (const [cls, property] of legit) {
				if (!property) continue;
				assert.ok(injectCustomClass(cls), `Should inject ${cls}`);
				assert.ok(injectCustomClass(cls, "md"), `Should inject md:${cls}`);
			}
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

			injectCustomClass("bg-red-500/50", "dark");

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

		it("retries after a new stylesheet appears", () => {
			if (!isSupported()) return;
			processClassString("hover:bg-latecolor");
			assert.ok(_getFailedLookups().has("bg-latecolor"), "Precondition: cached as failed");

			// A stylesheet that loads after the first scan can define the class.
			const late = document.createElement("style");
			late.textContent = ".bg-latecolor { background-color: #abc }";
			document.head.appendChild(late);

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
				const walks = countRuleWalks(() => processClassString("hover:bg-nosuchcolor-500"));
				if (walks >= 0) assert.ok(walks > 0, "Precondition: the cache was dropped and re-walked");
			} finally {
				console.warn = originalWarn;
				late.remove();
			}
			const matching = warnings.filter((w) => w.includes("nosuchcolor"));
			assert.equal(matching.length, 1, `Should report once, got: ${matching.join(" | ")}`);
		});

		it("reports a class under each variant it is written with", () => {
			if (!isSupported()) return;
			const originalWarn = console.warn;
			const warnings: string[] = [];
			console.warn = (msg: string) => warnings.push(msg);
			try {
				processClassString("hover:bg-nosuchcolor-500");
				processClassString("focus:bg-nosuchcolor-500");
			} finally {
				console.warn = originalWarn;
			}
			assert.ok(
				warnings.some((w) => w.includes("focus:bg-nosuchcolor-500")),
				`The second variant should be reported too, got: ${warnings.join(" | ")}`,
			);
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
				// Rule counts are re-read once per task, so the retry has to come from a later one.
				await new Promise((resolve) => setTimeout(resolve, 0));
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
			const walks = countRuleWalks(() => processClassString("hover:bg-nosuchcolor-500"));
			assert.ok(_getFailedLookups().has("bg-nosuchcolor-500"), "Should still be cached");
			if (walks < 0) return; // cssRules is not an interceptable accessor here.
			assert.equal(walks, 0, "A recreated sheet should not cost a re-walk of every other sheet");
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
			assert.ok(
				_getWarnedLookups().size < 300,
				`The reported set should be bounded, holds ${_getWarnedLookups().size}`,
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

	describe("plain names in a minimal DOM shim", () => {
		// Node-only: a consumer's shim may define document and CSSStyleSheet but not
		// CSSStyleRule or getComputedStyle.
		it("does not throw", () => {
			if (!isNode) return;
			const sheet = {
				cssRules: [] as unknown[],
				insertRule(rule: string, index: number) {
					this.cssRules.splice(index, 0, { style: { length: 1 }, cssText: rule });
					return index;
				},
				deleteRule(index: number) {
					this.cssRules.splice(index, 1);
				},
			};
			const utils = { cssRules: [{ selectorText: ".bg-red-500", style: { length: 1 } }] };
			const shim = {
				createElement: () => ({ setAttribute() {}, sheet, isConnected: true }),
				head: { appendChild() {} },
				styleSheets: [utils],
				querySelector: () => ({ sheet: utils }),
				documentElement: {},
			};
			const g = globalThis as Record<string, unknown>;
			const saved = { document: g.document, CSSStyleSheet: g.CSSStyleSheet };
			g.document = shim;
			g.CSSStyleSheet = function CSSStyleSheet() {};
			try {
				_resetForTesting();
				processClassString("bg-brand hover:bg-brand bg-red-500");
			} finally {
				g.document = saved.document;
				g.CSSStyleSheet = saved.CSSStyleSheet;
				_resetForTesting();
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

	describe("theme names", () => {
		let tokens: HTMLStyleElement;
		let warnings: string[];
		const originalWarn = console.warn;

		beforeEach(() => {
			if (!isSupported()) return;
			injectCss(["utils"]);
			tokens = document.createElement("style");
			tokens.textContent =
				":root { --color-brand: rgb(1, 2, 3); --color-sm: rgb(4, 5, 6); --radius-card: 7px }";
			document.head.appendChild(tokens);
			warnings = [];
			console.warn = (msg: string) => warnings.push(msg);
		});

		afterEach(() => {
			console.warn = originalWarn;
			tokens?.remove();
		});

		/** Computed value of a property on an element carrying the given classes. */
		function computed(classes: string, property: string): string {
			const el = document.createElement("div");
			el.className = classes;
			document.body.appendChild(el);
			scanAndInject(el);
			const value = getComputedStyle(el).getPropertyValue(property);
			el.remove();
			return value;
		}

		it("resolves a plain theme color", () => {
			if (!isSupported()) return;
			assert.equal(computed("bg-brand", "background-color"), "rgb(1, 2, 3)");
			assert.equal(computed("text-brand", "color"), "rgb(1, 2, 3)");
		});

		it("resolves a theme radius", () => {
			if (!isSupported()) return;
			assert.equal(computed("rounded-card", "border-top-left-radius"), "7px");
		});

		it("mixes a theme color with transparency", () => {
			if (!isSupported()) return;
			processClassString("bg-brand/50");
			assert.ok(
				customRulesText().includes("color-mix(in oklab, var(--color-brand) 50%, transparent)"),
				`Should inject a color-mix rule, got: ${customRulesText()}`,
			);
		});

		it("stacks variants on theme names and variable shorthand", () => {
			if (!isSupported()) return;
			processClassString("dark:bg-brand hover:ring-brand md:text-(length:--fs) md:bg-(--x)/20");
			const text = customRulesText();
			assert.ok(text.includes("prefers-color-scheme: dark"), `dark: missing, got: ${text}`);
			assert.ok(text.includes("--ring-color: var(--color-brand)"), `ring missing, got: ${text}`);
			assert.ok(text.includes("font-size: var(--fs)"), `md: size missing, got: ${text}`);
			assert.ok(text.includes("var(--x) 20%"), `md: opacity missing, got: ${text}`);
			assert.equal(warnings.length, 0, `Should not warn: ${warnings.join(" | ")}`);
		});

		it("reports a plain name no variable defines", () => {
			if (!isSupported()) return;
			processClassString("bg-brnad");
			assert.ok(
				warnings.some((w) => w.includes("No CSS rule for class: bg-brnad")),
				`Should report the typo, got: ${warnings.join(" | ")}`,
			);
		});

		it("lets static utilities win over a theme variable of the same name", () => {
			if (!isSupported()) return;
			// `--color-sm` is defined, but `text-sm` is a font size.
			assert.notEqual(computed("hover:text-sm text-sm", "color"), "rgb(4, 5, 6)");
			assert.ok(
				!customRulesText().includes("--color-sm"),
				`Should not resolve text-sm to a color, got: ${customRulesText()}`,
			);
		});

		it("leaves every static color utility alone", () => {
			if (!isSupported()) return;
			const style = document.querySelector('style[data-mancha="utils"]') as HTMLStyleElement;
			const names = Array.from(style.sheet?.cssRules ?? [])
				.map((r) => (r as CSSStyleRule).selectorText?.match(/^\.([\w-]+)(?![\w-]|\\)/)?.[1])
				.filter((n): n is string => !!n && /^(text|bg|border|fill|divide|ring|rounded)-/.test(n));
			assert.ok(names.length > 100, `Precondition: found ${names.length} static names`);
			processClassString(names.join(" "));
			assert.equal(warnings.length, 0, `Static names must not warn: ${warnings.slice(0, 5)}`);
			assert.equal(customRules().length, 0, `Static names must not inject: ${customRulesText()}`);
		});

		it("defers to a page rule for a plain name without copying it", () => {
			if (!isSupported()) return;
			const own = document.createElement("style");
			own.textContent = ".bg-hero { background-color: rgb(9, 9, 9) }";
			document.head.appendChild(own);
			try {
				processClassString("bg-hero");
				assert.equal(warnings.length, 0, `Should not warn: ${warnings.join(" | ")}`);
				assert.equal(customRules().length, 0, `Should not copy: ${customRulesText()}`);
			} finally {
				own.remove();
			}
		});

		it("orders plain rules before variant rules, keeping each group's order", () => {
			if (!isSupported()) return;
			assert.ok(window.innerWidth >= 640, "Precondition: the sm: breakpoint matches");
			// The variant rule is seen first, so appending plain rules would put them after it.
			assert.notEqual(computed("sm:bg-red-500", "background-color"), "");
			assert.equal(computed("bg-brand sm:bg-red-500", "background-color"), "rgb(244, 67, 54)");
			assert.equal(computed("bg-[#0f0] sm:bg-[#00f]", "background-color"), "rgb(0, 0, 255)");
			assert.equal(computed("p-[10px] pt-[2px]", "padding-top"), "2px");
		});

		it("stays silent for plain names the page styles anywhere", () => {
			if (!isSupported()) return;
			const own = document.createElement("style");
			own.textContent = [
				"@media (min-width: 1px) { .rounded-pill { border-radius: 99px } }",
				"@layer components { .bg-hero { background-color: red } }",
				"@supports (display: grid) { .text-fancy { color: red } }",
				".card .text-muted { color: gray }",
				".text-title:hover { color: red }",
				".a, .border-soft { border-color: red }",
				"button.bg-cta { background-color: red }",
			].join("\n");
			document.head.appendChild(own);
			try {
				processClassString(
					"rounded-pill bg-hero text-fancy text-muted text-title border-soft bg-cta",
				);
				assert.equal(warnings.length, 0, `Should not warn: ${warnings.join(" | ")}`);
				assert.equal(customRules().length, 0, `Should not inject: ${customRulesText()}`);
			} finally {
				own.remove();
			}
		});

		it("lets the page's own rule win over a theme variable", () => {
			if (!isSupported()) return;
			const own = document.createElement("style");
			own.textContent = ".bg-brand { background-color: rgb(9, 9, 9) }";
			document.head.appendChild(own);
			try {
				assert.equal(computed("bg-brand", "background-color"), "rgb(9, 9, 9)");
			} finally {
				own.remove();
			}
		});

		it("keeps a theme name when page selectors only mention the class", () => {
			if (!isSupported()) return;
			tokens.textContent += ":root { --color-ctx1: rgb(1, 2, 3); --color-ctx2: rgb(1, 2, 3); }";
			const own = document.createElement("style");
			own.textContent = ".card .bg-ctx1 { padding: 1px } .bg-ctx2:hover { opacity: 0.9 }";
			document.head.appendChild(own);
			try {
				assert.equal(computed("bg-ctx1", "background-color"), "rgb(1, 2, 3)");
				assert.equal(computed("bg-ctx2", "background-color"), "rgb(1, 2, 3)");
				assert.equal(warnings.length, 0, `Should not warn: ${warnings.join(" | ")}`);
			} finally {
				own.remove();
			}
		});

		it("sees rules in @import-ed sheets", async () => {
			if (!isSupported()) return;
			tokens.textContent += ":root { --color-imp: rgb(1, 2, 3); }";
			const url = URL.createObjectURL(
				new Blob([".bg-imp { background-color: rgb(9, 9, 9) } .x .bg-imp2 { color: red }"], {
					type: "text/css",
				}),
			);
			const own = document.createElement("style");
			own.textContent = `@import url(${url});`;
			const loaded = new Promise((resolve) => own.addEventListener("load", resolve));
			document.head.appendChild(own);
			try {
				await loaded;
				assert.equal(computed("bg-imp", "background-color"), "rgb(9, 9, 9)");
				processClassString("bg-imp2");
				assert.equal(warnings.length, 0, `Should not warn: ${warnings.join(" | ")}`);
			} finally {
				own.remove();
				URL.revokeObjectURL(url);
			}
		});

		it("retries a failure once an @import-ed sheet loads", async () => {
			if (!isSupported()) return;
			const url = URL.createObjectURL(
				new Blob([".bg-lateimp { background-color: rgb(9, 9, 9) }"], { type: "text/css" }),
			);
			const own = document.createElement("style");
			own.textContent = `@import url(${url});`;
			const loaded = new Promise((resolve) => own.addEventListener("load", resolve));
			document.head.appendChild(own);
			try {
				processClassString("hover:bg-lateimp");
				assert.ok(_getFailedLookups().has("bg-lateimp"), "Precondition: failed before load");
				await loaded;
				processClassString("hover:bg-lateimp");
				assert.ok(_getInjectedRules().has("hover:bg-lateimp"), "Should resolve after load");
			} finally {
				own.remove();
				URL.revokeObjectURL(url);
			}
		});

		it("sees a token set since the root style was last read", () => {
			if (!isSupported()) return;
			const root = document.documentElement;
			try {
				processClassString("bg-brand");
				root.style.setProperty("--color-stuck", "rgb(1, 2, 3)");
				processClassString("bg-stuck");
				assert.ok(_getInjectedRules().has("bg-stuck"), `Should resolve: ${warnings.join(" | ")}`);
			} finally {
				root.style.removeProperty("--color-stuck");
			}
		});

		it("reads the root's computed style once per scan, not once per class", () => {
			if (!isSupported()) return;
			const names = Array.from({ length: 20 }, (_, i) => `tok${i}`);
			tokens.textContent += `:root { ${names.map((n) => `--color-${n}: red;`).join(" ")} }`;
			const el = document.createElement("div");
			for (const n of names) {
				const p = document.createElement("p");
				p.className = `bg-${n}`;
				el.appendChild(p);
			}
			document.body.appendChild(el);
			const original = window.getComputedStyle;
			let calls = 0;
			window.getComputedStyle = (...args: Parameters<typeof original>) => {
				calls++;
				return original.apply(window, args);
			};
			try {
				scanAndInject(el);
			} finally {
				window.getComputedStyle = original;
				el.remove();
			}
			assert.equal(customRules().length, 20, `Should resolve all: ${customRulesText()}`);
			assert.ok(calls <= 2, `Should snapshot the root style, read it ${calls} times`);
		});

		it("ignores plain names when utils CSS is not in use", () => {
			if (!isSupported()) return;
			for (const el of document.querySelectorAll('style[data-mancha="utils"]')) el.remove();
			processClassString("bg-brnad bg-brand");
			assert.equal(warnings.length, 0, `Should not warn: ${warnings.join(" | ")}`);
			assert.equal(customRules().length, 0, `Should not inject: ${customRulesText()}`);
		});
	});

	describe("isSupported", () => {
		it("returns boolean", () => {
			assert.equal(typeof isSupported(), "boolean");
		});
	});
});
