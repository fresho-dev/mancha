import rules, { PERCENTS } from "./css_gen_utils.js";
import { assert } from "./test_utils.js";

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

		it("support percentage utilities in multiples of 5", () => {
			assert.equal(PERCENTS.length, 20);
			assert.equal(PERCENTS[0], 5);
			assert.equal(PERCENTS[19], 100);

			const css = rules();
			assert.ok(css.includes(".w-35\\%"), "Should include w-35%");
			assert.ok(css.includes(".opacity-5"), "Should include opacity-5");
			assert.ok(css.includes(".opacity-100"), "Should include opacity-100");
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
			assert.ok(css.includes(".border { border: 1px }"), "Should include border");
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
});
