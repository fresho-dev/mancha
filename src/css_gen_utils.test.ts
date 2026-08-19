import rules, { PERCENTS, PROPS_COLORS } from "./css_gen_utils.js";
import { assert, setInnerHTML } from "./test_utils.js";

/** Count every block in the source, at any nesting depth. */
function countBlocks(css: string): number {
	let count = 0;
	for (const char of css) {
		if (char === "{") count++;
	}
	return count;
}

/**
 * Count parsed rules, descending into grouping rules (@media, @keyframes).
 * A dropped selector inside an @media block leaves the wrapper intact, so
 * only a recursive count notices it.
 */
function countParsedRules(rules: CSSRuleList | undefined): number {
	let count = 0;
	for (const rule of Array.from(rules ?? [])) {
		count += 1 + countParsedRules((rule as CSSGroupingRule).cssRules);
	}
	return count;
}

describe("CSS Generation Utils", () => {
	describe("rules", () => {
		it("generates CSS rules", () => {
			const css = rules();
			assert.ok(css.length > 0, "CSS should not be empty");
			assert.ok(css.includes(".flex {"), "Should include flex utility");
			assert.ok(css.includes(".hidden {"), "Should include hidden utility");
			assert.ok(css.includes(".text-center {"), "Should include text-center utility");
			assert.ok(css.includes(".appearance-none {"), "Should include appearance-none utility");
		});

		it("includes color utilities", () => {
			const css = rules();
			assert.ok(css.includes(".text-red-500 {"), "Should include text-red-500");
			assert.ok(css.includes(".bg-blue-500 {"), "Should include bg-blue-500");
			assert.ok(css.includes(".border-green-500 {"), "Should include border-green-500");
		});

		it("does not include responsive variants (now on-demand)", () => {
			const css = rules();
			assert.ok(!css.includes("@media (min-width:"), "Should not include media queries");
		});

		it("orders spacing rules shorthand -> axis -> sides so sides win the cascade", () => {
			const css = rules();
			// Rules share specificity, so source order decides: a later rule wins.
			// e.g. "p-4 pt-14" must apply pt-14 (padding shorthand sets all sides).
			const order = [".p-4 {", ".px-4 {", ".pt-14 {"];
			const positions = order.map((sel) => css.indexOf(sel));
			for (const [i, pos] of positions.entries()) {
				assert.ok(pos >= 0, `Missing rule: ${order[i]}`);
			}
			assert.ok(positions[0] < positions[1], "Shorthand p-* must come before axis px-*");
			assert.ok(positions[1] < positions[2], "Axis px-* must come before side pt-*");

			// Same ordering for margin.
			const mShort = css.indexOf(".m-4 {");
			const mAxis = css.indexOf(".my-4 {");
			const mSide = css.indexOf(".mt-2 {");
			assert.ok(mShort < mAxis, "Shorthand m-* must come before axis my-*");
			assert.ok(mAxis < mSide, "Axis my-* must come before side mt-*");
		});

		it("support percentage utilities in multiples of 5", () => {
			assert.equal(PERCENTS.length, 20);
			assert.equal(PERCENTS[0], 5);
			assert.equal(PERCENTS[19], 100);

			const css = rules();
			assert.ok(css.includes(".w-35\\%"), "Should include w-35%");
			assert.ok(css.includes(".opacity-5"), "Should include opacity-5");
			assert.ok(css.includes(".opacity-100"), "Should include opacity-100");
		});

		it("escapes the decimal point in rem text size utilities", () => {
			const css = rules();
			assert.ok(
				css.includes(".text-0\\.25rem { font-size: 0.25rem }"),
				"Should include text-0.25rem with an escaped decimal point",
			);
			assert.ok(
				css.includes(".text-24\\.75rem { font-size: 24.75rem }"),
				"Should include text-24.75rem with an escaped decimal point",
			);
		});

		it("emits a stylesheet the browser parses without dropping rules", () => {
			// Only meaningful where there is a real CSS parser; skipped under Node.
			if (typeof document === "undefined") return;

			// A selector the parser cannot read is dropped silently rather than
			// raising, so the only way to catch one is to count what survives.
			const css = rules();
			const style = document.createElement("style");
			style.textContent = css;
			document.head.appendChild(style);

			try {
				const parsed = countParsedRules(style.sheet?.cssRules);
				const expected = countBlocks(css);
				assert.equal(parsed, expected, `Browser dropped ${expected - parsed} generated rule(s)`);
			} finally {
				style.remove();
			}
		});

		it("includes size utilities matching media breakpoints", () => {
			const css = rules();
			assert.ok(css.includes(".w-sm { width: 640px }"), "Should include w-sm utility");
			assert.ok(css.includes(".max-w-lg { max-width: 1024px }"), "Should include max-w-lg utility");
			assert.ok(
				css.includes(".min-h-lg { min-height: 1024px }"),
				"Should include min-h-lg utility",
			);
		});

		it("includes grid utilities", () => {
			const css = rules();
			assert.ok(css.includes(".grid { display: grid }"), "Should include grid utility");
			assert.ok(
				css.includes(".grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) }"),
				"Should include grid-cols-3",
			);
			assert.ok(
				css.includes(".col-span-2 { grid-column: span 2 / span 2 }"),
				"Should include col-span-2",
			);
			assert.ok(
				css.includes(".grid-rows-3 { grid-template-rows: repeat(3, minmax(0, 1fr)) }"),
				"Should include grid-rows-3",
			);
			assert.ok(
				css.includes(".row-span-2 { grid-row: span 2 / span 2 }"),
				"Should include row-span-2",
			);
		});

		it("does not include pseudo-state variants (now on-demand)", () => {
			const css = rules();
			assert.ok(!css.includes(".hover\\:"), "Should not include hover variants");
			assert.ok(!css.includes(".focus\\:"), "Should not include focus variants");
			assert.ok(!css.includes(".disabled\\:"), "Should not include disabled variants");
		});

		it("supports ring-inset", () => {
			const css = rules();
			assert.ok(css.includes(".ring {"), "Should include ring utility");
			assert.ok(css.includes("var(--ring-inset, )"), "Ring should use --ring-inset variable");
			assert.ok(
				css.includes(".ring-inset { --ring-inset: inset }"),
				"ring-inset should define variable",
			);
		});

		it("supports ring colors", () => {
			const css = rules();
			// Every width utility, not just one: a substring match is satisfied by a single
			// converted declaration while the rest keep a baked-in color.
			const widths: Array<[klass: string, px: string]> = [
				["ring", "3px"],
				["ring-0", "0px"],
				["ring-1", "1px"],
				["ring-2", "2px"],
				["ring-4", "4px"],
				["ring-8", "8px"],
			];
			for (const [klass, px] of widths) {
				const declaration =
					`.${klass} { box-shadow: var(--ring-inset, ) 0 0 0 ${px} ` +
					"var(--ring-color, rgb(59 130 246 / 0.5)) }";
				assert.ok(css.includes(declaration), `${klass} should read --ring-color: ${declaration}`);
			}
			assert.ok(
				css.includes(".ring-red-500 { --ring-color: #f44336 }"),
				"Should include ring-red-500",
			);
			assert.ok(css.includes(".ring-white { --ring-color: #fff }"), "Should include ring-white");
		});

		it("declares the default ring color on every element", () => {
			// Custom properties inherit, so without this a ring color set on an ancestor reaches
			// every descendant's ring, and a page's own --ring-color reaches all of them.
			assert.ok(
				rules().includes("*,::before,::after{--ring-color:rgb(59 130 246 / 0.5)}"),
				"The utils sheet should declare the default --ring-color universally",
			);
		});

		it("keeps a ring color out of a descendant's ring", () => {
			// Only meaningful where there is a real cascade; skipped under Node.
			if (typeof document === "undefined" || typeof getComputedStyle !== "function") return;

			const style = document.createElement("style");
			style.textContent = rules();
			document.head.appendChild(style);
			const host = document.createElement("div");
			setInnerHTML(host, `<div class="ring ring-red-500"><span class="ring-2"></span></div>`);
			document.body.appendChild(host);

			try {
				const parent = host.firstElementChild as HTMLElement;
				const child = parent.firstElementChild as HTMLElement;
				assert.ok(
					getComputedStyle(parent).boxShadow.includes("244, 67, 54"),
					`The element carrying ring-red-500 should be red, got ${getComputedStyle(parent).boxShadow}`,
				);
				assert.ok(
					getComputedStyle(child).boxShadow.includes("59, 130, 246"),
					`A descendant should keep the default ring color, got ${getComputedStyle(child).boxShadow}`,
				);
			} finally {
				host.remove();
				style.remove();
			}
		});

		it("does not include color opacity variants (now on-demand)", () => {
			const css = rules();
			assert.ok(!css.includes("\\/50"), "Should not include /50 opacity variants");
			assert.ok(!css.includes("\\/20"), "Should not include /20 opacity variants");
		});

		it("includes spacing base classes", () => {
			const css = rules();
			assert.ok(css.includes(".m-0 { margin: 0 }"), "Should include m-0");
			assert.ok(css.includes(".p-4 { padding: 1rem }"), "Should include p-4");
			assert.ok(css.includes(".mt-8 { margin-top: 2rem }"), "Should include mt-8");
			assert.ok(css.includes(".px-4 {"), "Should include px-4");
		});

		it("includes sizing base classes", () => {
			const css = rules();
			assert.ok(css.includes(".w-4 { width: 1rem }"), "Should include w-4");
			assert.ok(css.includes(".h-full { height: 100% }"), "Should include h-full");
			assert.ok(css.includes(".max-w-lg { max-width: 1024px }"), "Should include max-w-lg");
			assert.ok(css.includes(".min-h-screen {"), "Should include min-h-screen");
		});

		it("includes named flex/grid utilities", () => {
			const css = rules();
			assert.ok(css.includes(".flex { display: flex }"), "Should include flex");
			assert.ok(css.includes(".flex-col { flex-direction: column }"), "Should include flex-col");
			assert.ok(
				css.includes(".justify-center { justify-content: center }"),
				"Should include justify-center",
			);
			assert.ok(
				css.includes(".items-center { align-items: center }"),
				"Should include items-center",
			);
		});

		it("includes transition and animation utilities", () => {
			const css = rules();
			assert.ok(css.includes("@keyframes spin"), "Should include spin keyframes");
			assert.ok(css.includes(".transition {"), "Should include transition utility");
			assert.ok(css.includes(".duration-150 {"), "Should include duration-150");
		});

		it("includes per-property transition helpers that animate standalone", () => {
			const css = rules();
			// Each helper must set transition-property so it animates without `transition`.
			assert.ok(
				css.includes(".transition-all { transition-property: all;"),
				"Should include transition-all",
			);
			assert.ok(
				css.includes(".transition-opacity { transition-property: opacity;"),
				"Should include transition-opacity",
			);
			assert.ok(
				css.includes(".transition-transform { transition-property: transform;"),
				"Should include transition-transform",
			);
			assert.ok(
				css.includes(".transition-shadow { transition-property: box-shadow;"),
				"Should include transition-shadow",
			);
			assert.ok(
				css.includes(".transition-colors { transition-property: color, background-color"),
				"Should include transition-colors",
			);
			// Standalone usage requires an inherited timing-function and duration.
			assert.ok(
				css.includes(
					".transition-opacity { transition-property: opacity; transition-timing-function: ease-in-out; transition-duration: var(--transition-duration, 150ms) }",
				),
				"transition-opacity should carry timing-function and duration",
			);
		});

		it("includes background-position helpers alongside background-size", () => {
			const css = rules();
			// bg-cover is most useful paired with a position; without these the image
			// silently anchors to the default 0% 0% instead.
			assert.ok(
				css.includes(".bg-center { background-position: center }"),
				"Should include bg-center",
			);
			assert.ok(css.includes(".bg-top { background-position: top }"), "Should include bg-top");
			assert.ok(
				css.includes(".bg-bottom { background-position: bottom }"),
				"Should include bg-bottom",
			);
			assert.ok(css.includes(".bg-left { background-position: left }"), "Should include bg-left");
			assert.ok(
				css.includes(".bg-right { background-position: right }"),
				"Should include bg-right",
			);
			assert.ok(
				css.includes(".bg-left-top { background-position: left top }"),
				"Should include bg-left-top",
			);
			assert.ok(
				css.includes(".bg-left-bottom { background-position: left bottom }"),
				"Should include bg-left-bottom",
			);
			assert.ok(
				css.includes(".bg-right-top { background-position: right top }"),
				"Should include bg-right-top",
			);
			assert.ok(
				css.includes(".bg-right-bottom { background-position: right bottom }"),
				"Should include bg-right-bottom",
			);
		});

		it("includes color base classes without opacity", () => {
			const css = rules();
			assert.ok(css.includes(".text-white { color: #fff }"), "Should include text-white");
			assert.ok(css.includes(".bg-black { background-color: #000 }"), "Should include bg-black");
			assert.ok(css.includes(".text-red-500 {"), "Should include text-red-500");
			assert.ok(css.includes(".bg-blue-500 {"), "Should include bg-blue-500");
			assert.ok(css.includes(".border-green-500 {"), "Should include border-green-500");
			assert.ok(css.includes(".fill-gray-500 {"), "Should include fill-gray-500");
		});

		it("includes opacity utilities", () => {
			const css = rules();
			assert.ok(css.includes(".opacity-0 { opacity: 0 }"), "Should include opacity-0");
			assert.ok(css.includes(".opacity-50 { opacity: 0.5 }"), "Should include opacity-50");
		});

		it("includes gap utilities", () => {
			const css = rules();
			assert.ok(css.includes(".gap-0 { gap: 0 }"), "Should include gap-0");
			assert.ok(css.includes(".gap-4 { gap: 1rem }"), "Should include gap-4");
			assert.ok(css.includes(".gap-x-4 { column-gap: 1rem }"), "Should include gap-x-4");
		});

		it("includes border utilities", () => {
			const css = rules();
			assert.ok(css.includes(".border { border-width: 1px }"), "Should include border");
			assert.ok(css.includes(".border-2 { border-width: 2px }"), "Should include border-2");
			assert.ok(css.includes(".rounded { border-radius: .25rem }"), "Should include rounded");
		});

		it("includes position utilities", () => {
			const css = rules();
			assert.ok(css.includes(".top-0 { top: 0 }"), "Should include top-0");
			assert.ok(css.includes(".left-4 { left: 1rem }"), "Should include left-4");
		});

		it("includes space and divide utilities", () => {
			const css = rules();
			assert.ok(
				css.includes(".space-x-4 > :not(:first-child) { margin-left: 1rem }"),
				"Should include space-x-4",
			);
			assert.ok(
				css.includes(".space-y-2 > :not(:first-child) { margin-top: 0.5rem }"),
				"Should include space-y-2",
			);
		});

		it("memoizes results for performance", () => {
			// First call (may be cached from previous tests, but that's fine)
			const start1 = performance.now();
			const css1 = rules();
			const _time1 = performance.now() - start1;

			// Second call (should be instant due to memoization)
			const start2 = performance.now();
			const css2 = rules();
			const time2 = performance.now() - start2;

			// Results should be identical (same reference due to memoization)
			assert.equal(css1, css2, "Memoized result should be identical");

			// Second call should be significantly faster (at least 10x)
			// We use a generous threshold since first call might also be cached
			assert.ok(time2 < 10, `Second call should be fast (was ${time2.toFixed(2)}ms)`);
		});
	});

	// The palette ships packed, so a mis-typed character no longer shows up as an
	// obviously malformed entry in review. These pin its shape and enough anchor
	// values that an off-by-one in the packing cannot pass.
	describe("Color palette", () => {
		const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

		it("decodes to one ten-shade ramp per hue", () => {
			const names = Object.keys(PROPS_COLORS);
			assert.equal(names.length, 19, "expected 19 palettes");
			for (const name of names) {
				assert.deepEqual(
					Object.keys(PROPS_COLORS[name]).map(Number),
					SHADES,
					`${name} should carry every shade in order`,
				);
			}
		});

		it("decodes every entry to a six-digit hex color", () => {
			const malformed = Object.entries(PROPS_COLORS).flatMap(([name, ramp]) =>
				Object.entries(ramp)
					.filter(([, hex]) => !/^#[0-9a-f]{6}$/.test(hex))
					.map(([shade, hex]) => `${name}-${shade}: ${hex}`),
			);
			assert.deepEqual(malformed, [], "every shade should be a #rrggbb literal");
		});

		it("keeps the first, middle and last ramps aligned", () => {
			// First palette, last palette, and one either side of a boundary: an
			// off-by-one in the packing shifts at least one of these.
			assert.equal(PROPS_COLORS.red[50], "#ffebee");
			assert.equal(PROPS_COLORS.red[900], "#b71c1c");
			assert.equal(PROPS_COLORS.blue[500], "#2196f3");
			assert.equal(PROPS_COLORS.gray[500], "#9e9e9e");
			assert.equal(PROPS_COLORS["deep-orange"][500], "#ff5722");
			assert.equal(PROPS_COLORS["blue-gray"][50], "#eceff1");
			assert.equal(PROPS_COLORS["blue-gray"][900], "#263238");
		});
	});
});
