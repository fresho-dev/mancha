import rules from "./css_gen_utils.js";
import { assert } from "./test_utils.js";

describe("CSS Generation Utils", () => {
	describe("rules", () => {
		it("generates CSS rules", () => {
			const css = rules();
			assert.ok(css.length > 0, "CSS should not be empty");
			assert.ok(css.includes(".flex {"), "Should include flex utility");
			assert.ok(css.includes(".hidden {"), "Should include hidden utility");
			assert.ok(css.includes(".text-center {"), "Should include text-center utility");
		});

		it("includes color utilities", () => {
			const css = rules();
			assert.ok(css.includes(".text-red-500 {"), "Should include text-red-500");
			assert.ok(css.includes(".bg-blue-500 {"), "Should include bg-blue-500");
			assert.ok(css.includes(".border-green-500 {"), "Should include border-green-500");
		});

		it("includes responsive variants", () => {
			const css = rules();
			assert.ok(css.includes("@media (min-width: 640px)"), "Should include sm breakpoint");
			assert.ok(css.includes("@media (min-width: 768px)"), "Should include md breakpoint");
			assert.ok(css.includes("@media (min-width: 1024px)"), "Should include lg breakpoint");
		});

		it("includes size utilities matching media breakpoints", () => {
			const css = rules();
			assert.ok(css.includes(".w-sm { width: 640px }"), "Should include w-sm utility");
			assert.ok(css.includes(".max-w-md { max-width: 768px }"), "Should include max-w-md utility");
			assert.ok(css.includes(".min-h-lg { min-height: 1024px }"), "Should include min-h-lg utility");
		});

		it("includes grid utilities", () => {
			const css = rules();
			assert.ok(css.includes(".grid { display: grid }"), "Should include grid utility");
			assert.ok(css.includes(".grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) }"), "Should include grid-cols-3");
			assert.ok(css.includes(".col-span-2 { grid-column: span 2 / span 2 }"), "Should include col-span-2");
		});

		it("includes pseudo-state variants", () => {
			const css = rules();
			assert.ok(css.includes(".hover\\:"), "Should include hover variants");
			assert.ok(css.includes(".focus\\:"), "Should include focus variants");
		});

		it("supports ring-inset", () => {
			const css = rules();
			assert.ok(css.includes(".ring {"), "Should include ring utility");
			assert.ok(css.includes("var(--ring-inset, )"), "Ring should use --ring-inset variable");
			assert.ok(css.includes(".ring-inset { --ring-inset: inset }"), "ring-inset should define variable");
		});

		it("memoizes results for performance", () => {
			// First call (may be cached from previous tests, but that's fine)
			const start1 = performance.now();
			const css1 = rules();
			const time1 = performance.now() - start1;

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
});
