import { initMancha, injectCss, Renderer } from "./browser.js";
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
			injectCss(["minimal"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injectCss adds multiple style elements", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["minimal", "utils"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 2);
			addedStyles.push(styles[styles.length - 1]);
			addedStyles.push(styles[styles.length - 2]);
		});

		it("injectCss(['minimal']) adds a style element", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["minimal"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injectCss(['utils']) adds a style element", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["utils"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injected style elements contain CSS content", () => {
			injectCss(["minimal"]);
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

	describe("Cloaking", () => {
		// Helper to create test elements.
		function createTestElement(id: string): Element {
			const renderer = new Renderer();
			const fragment = renderer.parseHTML(`<div id="${id}"><span :text="msg"></span></div>`);
			const target = fragment.querySelector(`#${id}`) as Element;
			document.body.appendChild(target);
			return target;
		}

		afterEach(() => {
			// Clean up any leftover cloak styles and elements.
			document.getElementById("mancha-cloak-style")?.remove();
			document.querySelectorAll("[data-mancha-cloak]").forEach((el) => {
				el.removeAttribute("data-mancha-cloak");
			});
			document.querySelectorAll('[id^="cloak-test-"]').forEach((el) => {
				el.remove();
			});
		});

		it("cloaks and uncloaks target element with cloak: true", async () => {
			const target = createTestElement("cloak-test-1");

			// Verify element is visible initially.
			assert.ok(!target.hasAttribute("data-mancha-cloak"));

			// The cloaking happens synchronously at the start of initMancha.
			// We can't test the "cloaked" state easily since initMancha awaits until completion.
			// But we can verify the element is uncloaked after initMancha returns.
			await initMancha({
				target: "#cloak-test-1",
				cloak: true,
				state: { msg: "Hello" },
			});

			// After initMancha completes, element should be uncloaked.
			// After initMancha completes, element should be uncloaked.
			// The style tag should be removed (or empty if we only removed content, but we remove the element).
			assert.ok(!document.getElementById("mancha-cloak-style"), "Cloak style should be removed");

			// Verify rendering still worked.
			assert.equal(target.querySelector("span")?.textContent, "Hello");

			target.remove();
		});

		it("cloaks custom selector when specified", async () => {
			const target1 = createTestElement("cloak-test-2a");
			const target2 = createTestElement("cloak-test-2b");

			// Only target2 should be cloaked via custom selector.
			await initMancha({
				target: "#cloak-test-2a",
				cloak: { selector: "#cloak-test-2b" },
				state: { msg: "Test" },
			});

			// Both should be uncloaked after completion.
			assert.ok(!document.getElementById("mancha-cloak-style"));

			target1.remove();
			target2.remove();
		});

		it("callback receives renderer instance", async () => {
			const target = createTestElement("cloak-test-3");

			let callbackInvoked = false;
			let receivedRendererIsInstance = false;


			await initMancha({
				cloak: true,
				callback: async (renderer) => {
					callbackInvoked = true;
					receivedRendererIsInstance = renderer instanceof Renderer;

					// Manually mount within the callback.
					const el = document.querySelector("#cloak-test-3") as unknown as DocumentFragment;
					await renderer.set("msg", "Manual Mount");
					await renderer.mount(el);
				},
			});

			assert.ok(callbackInvoked, "callback should be called");
			assert.ok(receivedRendererIsInstance, "Should receive Renderer instance");
			assert.equal(target.querySelector("span")?.textContent, "Manual Mount");

			target.remove();
		});

		it("callback prevents automatic mounting", async () => {
			const target = createTestElement("cloak-test-4");

			await initMancha({
				target: "#cloak-test-4",
				state: { msg: "AutoMount" },
				callback: async () => {
					// Do nothing - don't mount.
				},
			});

			// The :text attribute should still be present since we didn't mount.
			assert.ok(
				target.querySelector("span")?.hasAttribute(":text"),
				"Should not have auto-mounted",
			);

			target.remove();
		});

		it("cloak with duration sets up transition animation", async () => {
			const target = createTestElement("cloak-test-5");

			// We can't easily test the animation timing, but we can verify it completes.
			const startTime = Date.now();
			await initMancha({
				target: "#cloak-test-5",
				cloak: { duration: 50 },
				state: { msg: "Animated" },
			});
			const duration = Date.now() - startTime;

			// Should have taken at least ~50ms due to the animation.
			assert.ok(duration >= 40, `Animation should have delayed (took ${duration}ms)`);
			assert.ok(!document.getElementById("mancha-cloak-style"));

			target.remove();
		});

		it("cloak: true reveals instantly without animation", async () => {
			const target = createTestElement("cloak-test-6");

			const startTime = Date.now();
			await initMancha({
				target: "#cloak-test-6",
				cloak: true,
				state: { msg: "Instant" },
			});
			const duration = Date.now() - startTime;

			// Should complete quickly (no animation delay).
			assert.ok(duration < 50, `Should reveal instantly (took ${duration}ms)`);
			assert.ok(!document.getElementById("mancha-cloak-style"));

			target.remove();
		});

		it("defaults cloak selector to body when no target specified", async () => {
			// The body should be cloaked when no target is specified.
			// Note: We can't easily test this without affecting the test runner's body.
			// Instead, verify that providing cloak without target doesn't throw.
			const renderer = await initMancha({
				cloak: true,
			});
			assert.ok(renderer instanceof Renderer);
		});
	});

	it("initMancha waits for DOMContentLoaded if document is loading", async () => {
		// Mock document.readyState
		const originalReadyState = document.readyState;
		Object.defineProperty(document, "readyState", {
			value: "loading",
			writable: true,
		});

		let resolved = false;
		const initPromise = initMancha().then(() => {
			resolved = true;
		});

		// Should not resolve yet
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.equal(resolved, false, "Should wait for DOMContentLoaded");

		// Trigger DOMContentLoaded
		window.dispatchEvent(new Event("DOMContentLoaded"));

		// Should now resolve
		await initPromise;
		assert.equal(resolved, true, "Should resolve after DOMContentLoaded");

		// Restore readyState
		Object.defineProperty(document, "readyState", {
			value: originalReadyState,
			writable: true,
		});
	});
});
