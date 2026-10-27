import { parseCustomValueClass, parseThemeClass } from "./css_parse.js";
import { assert } from "./test_utils.js";

describe("css_parse", () => {
	describe("variable shorthand", () => {
		const cases: Array<[string, string, string]> = [
			["bg-(--brand)", "background-color", "var(--brand)"],
			["w-(--side)", "width", "var(--side)"],
			["-mt-(--gap)", "margin-top", "calc(var(--gap) * -1)"],
			["text-(--ink)", "color", "var(--ink)"],
			["text-(color:--ink)", "color", "var(--ink)"],
			["text-(length:--fs-lg)", "font-size", "var(--fs-lg)"],
			["border-(--line)", "border-color", "var(--line)"],
			["border-(length:--hair)", "border-width", "var(--hair)"],
		];
		for (const [cls, property, value] of cases) {
			it(`parses ${cls}`, () => {
				assert.deepEqual(parseCustomValueClass(cls), { property, value });
			});
		}

		for (const [cls, property, value] of [
			["-z-(--x)", "z-index", "calc(var(--x) * -1)"],
			["-top-(--x)", "top", "calc(var(--x) * -1)"],
		]) {
			it(`parses ${cls}`, () => {
				assert.deepEqual(parseCustomValueClass(cls), { property, value });
			});
		}

		for (const cls of [
			"w-(length:--x)",
			"bg-(--x;y)",
			"bg-(x)",
			"foo-(--x)",
			"-text-(--x)",
			"-bg-(--x)",
			"-w-(--x)",
			"-p-(--x)",
			"-bg-[#fff]",
		]) {
			it(`rejects ${cls}`, () => {
				assert.equal(parseCustomValueClass(cls), null);
			});
		}
	});

	describe("custom value opacity", () => {
		const cases: Array<[string, string, string]> = [
			["bg-(--brand)/20", "background-color", "color-mix(in oklab, var(--brand) 20%, transparent)"],
			[
				"bg-[var(--brand)]/20",
				"background-color",
				"color-mix(in oklab, var(--brand) 20%, transparent)",
			],
			["text-[#f00]/50", "color", "color-mix(in oklab, #f00 50%, transparent)"],
			["border-(--line)/0", "border-color", "color-mix(in oklab, var(--line) 0%, transparent)"],
		];
		for (const [cls, property, value] of cases) {
			it(`parses ${cls}`, () => {
				assert.deepEqual(parseCustomValueClass(cls), { property, value });
			});
		}

		for (const cls of ["w-[10px]/50", "text-(length:--x)/50", "text-[2rem]/50", "bg-(--x)/101"]) {
			it(`rejects ${cls}`, () => {
				assert.equal(parseCustomValueClass(cls), null);
			});
		}
	});

	describe("parseThemeClass", () => {
		const defined = (variable: string) => ["--color-brand", "--radius-card"].includes(variable);

		const cases: Array<[string, string, string]> = [
			["bg-brand", "background-color", "var(--color-brand)"],
			["text-brand", "color", "var(--color-brand)"],
			["border-brand", "border-color", "var(--color-brand)"],
			["fill-brand", "fill", "var(--color-brand)"],
			["divide-brand", "border-color", "var(--color-brand)"],
			["ring-brand", "--ring-color", "var(--color-brand)"],
			["rounded-card", "border-radius", "var(--radius-card)"],
			[
				"bg-brand/50",
				"background-color",
				"color-mix(in oklab, var(--color-brand) 50%, transparent)",
			],
		];
		for (const [cls, property, value] of cases) {
			it(`parses ${cls}`, () => {
				assert.deepEqual(parseThemeClass(cls, defined), { property, value });
			});
		}

		for (const cls of ["bg-brnad", "rounded-brand", "rounded-card/50", "bg-brand/101", "w-brand"]) {
			it(`rejects ${cls}`, () => {
				assert.equal(parseThemeClass(cls, defined), null);
			});
		}

		it("looks up the variable named by the class", () => {
			const asked: string[] = [];
			parseThemeClass("ring-on-brand/20", (v) => {
				asked.push(v);
				return false;
			});
			assert.deepEqual(asked, ["--color-on-brand"]);
		});
	});
});
