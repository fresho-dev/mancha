import { getAttributeOrDataset } from "./dome.js";
import { IRenderer } from "./renderer.js";
import { assert } from "./test_utils.js";

export function testSuite(ctor: new (...args: any[]) => IRenderer): void {
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
}
