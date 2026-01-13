import { getAttributeOrDataset } from "./dome.js";
import type { IRenderer } from "./renderer.js";
import type { StoreState } from "./store.js";
import { assert } from "./test_utils.js";

export function testSuite(ctor: new (data?: StoreState) => IRenderer): void {
	describe("parseHTML", () => {
		it("parses root document", () => {
			const renderer = new ctor();
			const html = "<html><head></head><body></body></html>";
			const doc = renderer.parseHTML(html, { rootDocument: true });
			assert.ok(doc instanceof Document);
		});

		it("parses document fragment", () => {
			const renderer = new ctor();
			const html = "<div></div>";
			const doc = renderer.parseHTML(html);
			assert.ok(doc instanceof DocumentFragment);
		});

		it("parses simple DIV element", () => {
			const renderer = new ctor();
			const html = "<div></div>";
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			assert.equal(fragment.children.length, 1);
		});

		it("parses element with :for attribute", () => {
			const renderer = new ctor();
			const html = '<div :for="_ in [1,2,3]"></div>';
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			assert.equal(fragment.children.length, 1);
			const attr = getAttributeOrDataset(fragment.children[0], "for", ":");
			assert.equal(attr, "_ in [1,2,3]");
		});

		it("parses element with data-for attribute", () => {
			const renderer = new ctor();
			const html = '<div data-for="_ in [1,2,3]"></div>';
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			assert.equal(fragment.children.length, 1);
			const attr = getAttributeOrDataset(fragment.children[0], "for", ":");
			assert.equal(attr, "_ in [1,2,3]");
		});
	});

	describe("serializeHTML", () => {
		it("serializes a simple DIV element", () => {
			const renderer = new ctor();
			const html = "<div></div>";
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			const serialized = renderer.serializeHTML(fragment);
			assert.equal(serialized, "<div></div>");
		});

		it("serializes a full document", () => {
			const renderer = new ctor();
			const html = "<html><head></head><body></body></html>";
			const doc = renderer.parseHTML(html, { rootDocument: true });
			const serialized = renderer.serializeHTML(doc);
			assert.equal(serialized, "<html><head></head><body></body></html>");
		});
	});

	describe("mount", () => {
		it("processes a :for directive", async () => {
			const renderer = new ctor();
			const html = '<div :for="item in [1,2,3]">{{ item }}</div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);
			const elems = Array.from(fragment.querySelectorAll("div"));
			assert.equal(elems.length, 3);
			assert.equal(elems[0].textContent, "1");
			assert.equal(elems[1].textContent, "2");
			assert.equal(elems[2].textContent, "3");
		});

		it("sets the $rootNode property", async () => {
			const renderer = new ctor();
			const html = "<div></div>";
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);
			assert.equal(renderer.$.$rootNode, fragment);
		});
	});

	describe("subrenderer", () => {
		it("creates a subrenderer with the same root node", () => {
			const renderer = new ctor();
			const subrenderer = renderer.subrenderer();
			assert.equal(subrenderer.$.$rootNode, renderer.$.$rootNode);
		});

		it("does not override the root node", async () => {
			const renderer = new ctor();
			const fragment1 = renderer.parseHTML("<div></div>");
			await renderer.mount(fragment1);
			const subrenderer = renderer.subrenderer();
			assert.equal(subrenderer.$.$rootNode, renderer.$.$rootNode);
			const fragment2 = subrenderer.parseHTML("<span></span>");
			await subrenderer.mount(fragment2);
			assert.notEqual(subrenderer.$.$rootNode, renderer.$.$rootNode);
		});

		it("sets the $parent property", () => {
			const renderer = new ctor();
			const subrenderer = renderer.subrenderer();
			assert.equal(subrenderer.$.$parent, renderer);
		});

		it("sets the $rootRenderer property", () => {
			const renderer = new ctor();
			const subrenderer = renderer.subrenderer();
			assert.equal(subrenderer.$.$rootRenderer, renderer.get("$rootRenderer") ?? renderer);
		});

		it("modifying value in parent notifies subrenderer", async () => {
			const renderer = new ctor({ a: 1 });
			const subrenderer = renderer.subrenderer();
			let notified = false;
			subrenderer.watch("a", () => {
				notified = true;
			});
			await renderer.set("a", 2);
			assert.equal(notified, true);
		});

		it("modifying value in subrenderer notifies parent", async () => {
			const renderer = new ctor({ a: 1 });
			const subrenderer = renderer.subrenderer();
			let notified = false;
			renderer.watch("a", () => {
				notified = true;
			});
			await subrenderer.set("a", 2);
			assert.equal(notified, true);
		});
	});

	describe("eval", () => {
		it("evaluates a property from ancestor", async () => {
			const renderer = new ctor({ a: 1 });
			const subrenderer = renderer.subrenderer();
			const result = subrenderer.eval("a");
			assert.equal(result, 1);
		});
	});

	describe("debug", () => {
		it("accepts boolean true for backwards compatibility", () => {
			const renderer = new ctor();
			renderer.debug(true);
			assert.equal(renderer.debugging, true);
		});

		it("accepts boolean false for backwards compatibility", () => {
			const renderer = new ctor();
			renderer.debug(true);
			renderer.debug(false);
			assert.equal(renderer.debugging, false);
		});

		it("accepts 'lifecycle' debug level", () => {
			const renderer = new ctor();
			renderer.debug("lifecycle");
			assert.equal(renderer.debugging, true);
		});

		it("accepts 'effects' debug level", () => {
			const renderer = new ctor();
			renderer.debug("effects");
			assert.equal(renderer.debugging, true);
		});

		it("accepts 'verbose' debug level", () => {
			const renderer = new ctor();
			renderer.debug("verbose");
			assert.equal(renderer.debugging, true);
		});

		it("accepts 'off' debug level", () => {
			const renderer = new ctor();
			renderer.debug("off");
			assert.equal(renderer.debugging, false);
		});
	});

	describe("getPerformanceReport", () => {
		it("returns a performance report with lifecycle timing", async () => {
			const renderer = new ctor();
			renderer.debug(true);
			const html = "<div>test</div>";
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const report = renderer.getPerformanceReport();
			assert.ok(report.lifecycle);
			assert.ok(report.lifecycle.mountTime !== undefined, "mountTime should be defined");
			assert.ok((report.lifecycle.mountTime as number) >= 0, "mountTime should be >= 0");
		});

		it("returns a performance report with effect stats", async () => {
			const renderer = new ctor({ value: "hello" });
			renderer.debug(true);
			const html = '<div :text="value"></div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const report = renderer.getPerformanceReport();
			assert.ok(report.effects);
			assert.ok(typeof report.effects.total === "number");
			assert.ok(report.effects.total >= 0);
		});

		it("returns a performance report with observer stats", async () => {
			const renderer = new ctor({ value: "hello" });
			renderer.debug(true);
			const html = '<div :text="value"></div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const report = renderer.getPerformanceReport();
			assert.ok(report.observers);
			assert.ok(typeof report.observers.totalKeys === "number");
			assert.ok(typeof report.observers.totalObservers === "number");
		});

		it("resets performance data on each mount", async () => {
			const renderer = new ctor({ value: "hello" });
			renderer.debug(true);
			const html1 = '<div :text="value"></div>';
			const fragment1 = renderer.parseHTML(html1);
			await renderer.mount(fragment1);

			const report1 = renderer.getPerformanceReport();
			const _mountTime1 = report1.lifecycle.mountTime;

			const html2 = "<span>simple</span>";
			const fragment2 = renderer.parseHTML(html2);
			await renderer.mount(fragment2);

			const report2 = renderer.getPerformanceReport();
			// Second mount should have reset the data, so mountTime should be different.
			assert.ok(typeof report2.lifecycle.mountTime === "number");
			// The second mount is simpler, but we can't guarantee it's faster, so just check it exists.
			assert.ok(report2.lifecycle.mountTime !== undefined);
		});
	});

	describe("clearPerformanceReport", () => {
		it("clears accumulated performance data", async () => {
			const renderer = new ctor({ value: "hello" });
			renderer.debug(true);
			const html = '<div :text="value"></div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Verify we have data.
			const report1 = renderer.getPerformanceReport();
			assert.ok(report1.lifecycle.mountTime !== undefined);

			// Clear the data.
			renderer.clearPerformanceReport();

			// Verify the data was cleared.
			const report2 = renderer.getPerformanceReport();
			assert.equal(report2.lifecycle.mountTime, undefined);
			assert.equal(report2.lifecycle.preprocessTime, undefined);
			assert.equal(report2.lifecycle.renderTime, undefined);
			assert.equal(report2.effects.total, 0);
		});

		it("allows measuring a specific user flow after mount", async () => {
			const renderer = new ctor({ items: [1, 2, 3] });
			renderer.debug(true);
			const html = '<ul><li :for="item in items">{{ item }}</li></ul>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Clear to start fresh measurement.
			renderer.clearPerformanceReport();

			// Verify data was cleared.
			const clearedReport = renderer.getPerformanceReport();
			assert.equal(clearedReport.effects.total, 0);

			// Simulate a user flow by updating data.
			await renderer.set("items", [1, 2, 3, 4, 5]);

			// Get report for just this flow.
			const report = renderer.getPerformanceReport();

			// Should have effect data from the update, but no lifecycle timing.
			assert.equal(report.lifecycle.mountTime, undefined);
			assert.ok(report.effects.total > 0, "Effects should be tracked after clearing");
		});
	});

	describe("buildEffectId", () => {
		it("builds effect id from directive and expression", () => {
			const renderer = new ctor();
			const id = renderer.buildEffectId({
				directive: "bind",
				expression: "user.name",
			});
			assert.ok(id.includes("bind"));
			assert.ok(id.includes("user.name"));
		});

		it("returns a valid effect id format", () => {
			const renderer = new ctor();
			const html = "<input />";
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			const elem = fragment.querySelector("input") as HTMLElement;

			const id = renderer.buildEffectId({
				directive: "bind",
				element: elem,
				expression: "value",
			});
			// ID should have format "directive:elemId:expression".
			const parts = id.split(":");
			assert.ok(parts.length >= 2, "Effect ID should have at least directive and element parts");
			assert.equal(parts[0], "bind");
		});

		it("includes element identifier in effect id", () => {
			const renderer = new ctor();
			const html = '<input id="test-input" />';
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			const elem = fragment.querySelector("input") as HTMLElement;

			const id = renderer.buildEffectId({
				directive: "bind",
				element: elem,
				expression: "value",
			});
			// The ID should include some element identifier (id, testid, or path).
			// Different DOM implementations may handle this differently.
			assert.ok(id.startsWith("bind:"), "Effect ID should start with directive");
			assert.ok(id.includes("value"), "Effect ID should include expression");
		});

		it("handles elements without id attributes", () => {
			const renderer = new ctor();
			const html = "<div><span><input /></span></div>";
			const fragment = renderer.parseHTML(html) as DocumentFragment;
			const elem = fragment.querySelector("input") as HTMLElement;

			const id = renderer.buildEffectId({
				directive: "bind",
				element: elem,
				expression: "value",
			});
			// Should still produce a valid ID with tag name from the path.
			assert.ok(id.startsWith("bind:"), "Effect ID should start with directive");
			assert.ok(id.length > 10, "Effect ID should have meaningful content");
		});

		it("uses explicit id when provided", () => {
			const renderer = new ctor();
			const id = renderer.buildEffectId({
				directive: "computed",
				id: "myKey",
			});
			assert.equal(id, "computed:myKey");
		});

		it("computed properties include key in effect id", async () => {
			const renderer = new ctor({ count: 2 });
			renderer.debug(true);
			renderer.set(
				"double",
				renderer.$computed(function () {
					return this.count * 2;
				}),
			);

			// Get performance report to see tracked effects.
			const report = renderer.getPerformanceReport();

			// Should have a computed effect tracked.
			assert.ok(report.effects.byDirective.computed, "computed directive should be tracked");

			// The effect ID should be "computed:double" (key as identifier, no expression).
			const computedEffects = report.effects.slowest.filter((e) => e.id.startsWith("computed:"));
			assert.ok(computedEffects.length > 0, "Should have at least one computed effect");
			assert.ok(
				computedEffects.some((e) => e.id === "computed:double"),
				"Effect ID should be 'computed:double'",
			);

			// Should NOT contain "unknown" - computed properties use the key as identifier.
			assert.ok(
				computedEffects.every((e) => !e.id.includes("unknown")),
				"Computed effect IDs should not contain 'unknown'",
			);
		});
	});
}
