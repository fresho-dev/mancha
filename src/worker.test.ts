import { Renderer } from "./worker.js";
import { traverse } from "./dome.js";
import { assert, setupGlobalTestEnvironment, createFragment } from "./test_utils.js";
import { testSuite as pluginsTestSuite } from "./plugins.test.js";
import { testSuite as ssrTestSuite } from "./ssr.test.js";

describe("Worker Renderer Implementation", () => {
	before(async () => {
		await setupGlobalTestEnvironment();
	});

	// Plugins test suite.
	pluginsTestSuite(Renderer);

	// Server-side rendering test suite.
	ssrTestSuite(Renderer);

	describe("parse and serialize", () => {
		it("simple string", () => {
			const renderer = new Renderer();
			const content = "Hello World";
			const fragment = renderer.parseHTML(content);
			const serialized = renderer.serializeHTML(fragment);
			assert.equal(content, serialized);
		});

		it("single div element", () => {
			const renderer = new Renderer();
			const content = "<div>Hello World</div>";
			const fragment = renderer.parseHTML(content);
			const serialized = renderer.serializeHTML(fragment);
			assert.equal(content, serialized);
		});

		it("multiple div elements", () => {
			const renderer = new Renderer();
			const content = "<div>Hello World</div><div>Hello World</div>";
			const fragment = renderer.parseHTML(content);
			const serialized = renderer.serializeHTML(fragment);
			assert.equal(content, serialized);
		});

		it("root document with only body", () => {
			const renderer = new Renderer();
			const content = "<body><div>Hello World</div></body>";
			const fragment = renderer.parseHTML(content, { rootDocument: true });
			const serialized = renderer.serializeHTML(fragment);
			assert.equal(content, serialized);
		});

		it("root document with only head", () => {
			const renderer = new Renderer();
			const content = "<head><title>Hello World</title></head>";
			const fragment = renderer.parseHTML(content, { rootDocument: true });
			const serialized = renderer.serializeHTML(fragment);
			assert.equal(content, serialized);
		});
	});

	describe("{{ expressions }}", () => {
		it("set, update and get context string value", async () => {
			const renderer = new Renderer({ name: null });
			const fragment = createFragment("<span>Hello {{ name }}</span>");
			const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

			// Set the initial value and render node.
			await renderer.set("name", "World");
			await renderer.mount(fragment);
			assert.equal(textNode.nodeValue, "Hello World");

			// Update the value and observe the change.
			await renderer.set("name", "Stranger");
			assert.equal(textNode.nodeValue, "Hello Stranger");
		});

		it("sets object, gets object property", async () => {
			const renderer = new Renderer();
			const fragment = createFragment("<span>Hello {{ user.name }}</span>");
			const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

			// Set the initial value and render node.
			await renderer.set("user", { name: "World" });
			await renderer.mount(fragment);
			assert.equal(textNode.nodeValue, "Hello World");

			// Update the value and observe the change.
			await renderer.set("user", { name: "Stranger" });
			assert.equal(textNode.nodeValue, "Hello Stranger");
		});
	});

	describe("mount", () => {
		it("set, update and get context string value", async () => {
			const renderer = new Renderer();
			const fragment = createFragment("<span>Hello {{ name }}</span>");
			const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

			// Set the initial value and render node.
			await renderer.set("name", "World");
			await renderer.mount(fragment);
			assert.equal(textNode.nodeValue, "Hello World");

			// Update the value and observe the change.
			await renderer.set("name", "Stranger");
			assert.equal(textNode.nodeValue, "Hello Stranger");
		});
	});
});
