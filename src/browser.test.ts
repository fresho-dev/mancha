import { initMancha, injectBasicCss, injectCss, injectUtilsCss, Renderer } from "./browser.js";
import { testSuite as pluginsTestSuite } from "./plugins.test.js";
import { testSuite as rendererTestSuite } from "./renderer.test.js";
import { assert } from "./test_utils.js";

describe("Browser", () => {
	// Plugins test suite.
	pluginsTestSuite(Renderer);

	// Apply the test suites to the `Renderer` class.
	rendererTestSuite(Renderer);

	describe("CSS Injection", () => {
		// Track styles added during tests for cleanup.
		let addedStyles: Element[] = [];

		afterEach(() => {
			// Remove styles added during the test.
			addedStyles.forEach((style) => {
				style.remove();
			});
			addedStyles = [];
		});

		it("injectCss adds a style element to head", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["basic"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injectCss adds multiple style elements", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["basic", "utils"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 2);
			addedStyles.push(styles[styles.length - 1]);
			addedStyles.push(styles[styles.length - 2]);
		});

		it("injectBasicCss adds a style element", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectBasicCss();
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injectUtilsCss adds a style element", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectUtilsCss();
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injected style elements contain CSS content", () => {
			injectBasicCss();
			const styles = document.head.querySelectorAll("style");
			const lastStyle = styles[styles.length - 1];
			addedStyles.push(lastStyle);

			// Verify the style has non-empty content.
			assert.ok(lastStyle.textContent && lastStyle.textContent.length > 0);
		});
	});

	describe("initMancha", () => {
		it("returns a Renderer instance", async () => {
			const renderer = await initMancha();
			assert.ok(renderer instanceof Renderer);
		});

		it("enables debug mode when debug option is true", async () => {
			const renderer = await initMancha({ debug: true });
			assert.ok(renderer instanceof Renderer);
		});

		it("mounts to target element when target option is provided", async () => {
			// Create a target element using parseHTML to avoid innerHTML security restrictions.
			const renderer = new Renderer();
			const fragment = renderer.parseHTML(
				'<div id="test-target"><span :text="message"></span></div>',
			);
			const target = fragment.querySelector("#test-target") as Element;
			document.body.appendChild(target);

			// Verify the element is in the DOM with the :text attribute preserved.
			const domTarget = document.querySelector("#test-target");
			assert.ok(domTarget);
			const span = domTarget?.querySelector("span");
			assert.ok(span?.hasAttribute(":text") || span?.getAttribute("data-text"));

			// Mount to the target with initial state.
			const initRenderer = await initMancha({
				target: "#test-target",
				state: { message: "Hello" },
			});

			// Verify the initial state was rendered.
			assert.equal(target.querySelector("span")?.textContent, "Hello");

			// Update the value and verify it updates reactively.
			await initRenderer.set("message", "World");
			assert.equal(target.querySelector("span")?.textContent, "World");

			// Clean up.
			target.remove();
		});
	});
});
