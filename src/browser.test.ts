import { initMancha, injectCss, Renderer, type RenderParams } from "./browser.js";
import { testSuite as pluginsTestSuite } from "./plugins.test.js";
import { testSuite as rendererTestSuite } from "./renderer.test.js";
import { assert, setInnerHTML, sleepForReactivity } from "./test_utils.js";

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
			// minimal (1) + utils (basic + utils = 2) + possibly custom sheet
			assert.ok(styles.length >= initialCount + 3, "Should add at least 3 style elements");
			for (let i = initialCount; i < styles.length; i++) {
				addedStyles.push(styles[i]);
			}
		});

		it("injectCss(['minimal']) adds a style element", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["minimal"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount + 1);
			addedStyles.push(styles[styles.length - 1]);
		});

		it("injectCss(['utils']) adds style elements (basic + utils)", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["utils"]);
			const styles = document.head.querySelectorAll("style");
			// utils now injects basic reset + utility classes = 2 style elements
			assert.ok(styles.length >= initialCount + 2, "Should add at least 2 style elements");
			for (let i = initialCount; i < styles.length; i++) {
				addedStyles.push(styles[i]);
			}
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

	describe("On-demand CSS for rendered content", () => {
		// Track styles added during tests for cleanup.
		let addedStyles: Element[] = [];

		// Find an injected on-demand rule containing the given substring.
		// NOTE: tests use unique CSS values so leftover rules from other tests
		// can never satisfy an assertion by accident.
		function findCustomRule(substr: string): string | null {
			for (const style of document.querySelectorAll('style[data-mancha="custom"]')) {
				const sheet = (style as HTMLStyleElement).sheet;
				for (const rule of Array.from(sheet?.cssRules ?? [])) {
					if (rule.cssText.includes(substr)) return rule.cssText;
				}
			}
			return null;
		}

		beforeEach(() => {
			// On-demand scanning is gated on the utils style element; remove any
			// leftovers so each test controls whether utils CSS is active.
			for (const el of document.querySelectorAll('style[data-mancha="utils"]')) el.remove();
		});

		afterEach(() => {
			for (const style of addedStyles) style.remove();
			addedStyles = [];
		});

		it("injects variant rules for content mounted after injectCss", async () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["utils"]);

			// Simulate content rendered by mount() after injectCss (e.g. an <include>).
			const renderer = new Renderer();
			const fragment = renderer.parseHTML(
				`<div id="postmount" class="lg:block"><span class="xl:w-[100px]"></span></div>`,
			);
			const target = fragment.querySelector("#postmount") as Element;
			document.body.appendChild(target);
			await renderer.mount(target);

			const lgRule = findCustomRule("min-width: 1024px");
			assert.ok(lgRule?.includes("display: block"), `Should inject lg:block rule, got: ${lgRule}`);
			const xlRule = findCustomRule("min-width: 1280px");
			assert.ok(
				xlRule?.includes("width: 100px"),
				`Should inject xl:w-[100px] rule, got: ${xlRule}`,
			);

			target.remove();
			const styles = document.head.querySelectorAll("style");
			for (let i = initialCount; i < styles.length; i++) addedStyles.push(styles[i]);
		});

		it("injects variant rules when a :class binding produces them on state change", async () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["utils"]);

			// The variant class only appears in the expression result, never in markup.
			const renderer = new Renderer({ expanded: false });
			const fragment = renderer.parseHTML(
				`<div id="dynclass" :class="expanded ? 'md:w-[123px]' : 'hidden'"></div>`,
			);
			const target = fragment.querySelector("#dynclass") as Element;
			document.body.appendChild(target);
			await renderer.mount(target);

			assert.equal(findCustomRule("width: 123px"), null, "Should not inject before toggle");

			await renderer.set("expanded", true);

			const rule = findCustomRule("width: 123px");
			assert.ok(rule?.includes("min-width: 768px"), `Should inject md:w-[123px], got: ${rule}`);

			target.remove();
			const styles = document.head.querySelectorAll("style");
			for (let i = initialCount; i < styles.length; i++) addedStyles.push(styles[i]);
		});

		it("does not inject on-demand rules from mount unless utils CSS was injected", async () => {
			// No injectCss() call: apps using their own CSS should be left alone.
			const renderer = new Renderer();
			const fragment = renderer.parseHTML(
				`<div id="noutils"><span class="lg:w-[321px]"></span></div>`,
			);
			const target = fragment.querySelector("#noutils") as Element;
			document.body.appendChild(target);
			await renderer.mount(target);

			assert.equal(findCustomRule("width: 321px"), null, "Should not inject without utils CSS");
			target.remove();
		});
	});

	describe("Deprecated CSS names", () => {
		it("injectCss(['basic']) is a no-op with deprecation warning", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["basic"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount, "Should not add any style elements");
		});

		it("injectCss(['custom']) is a no-op with deprecation warning", () => {
			const initialCount = document.head.querySelectorAll("style").length;
			injectCss(["custom"]);
			const styles = document.head.querySelectorAll("style");
			assert.equal(styles.length, initialCount, "Should not add any style elements");
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

		it("uncloak should wait for requestAnimationFrame to prevent FOUC", async () => {
			if (typeof globalThis.requestAnimationFrame !== "function") {
				return;
			}
			let rAFCalled = 0;
			const originalRAF = globalThis.requestAnimationFrame;

			// Mock requestAnimationFrame to count calls.
			globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
				rAFCalled++;
				return originalRAF(callback);
			};

			try {
				// Manually add the cloak style as a user would.
				const style = document.createElement("style");
				style.id = "mancha-cloak";
				style.textContent = "body { opacity: 0 !important; }";
				document.head.appendChild(style);

				// Initialize Mancha. This should trigger uncloaking.
				await initMancha({ cloak: true });

				// Verify that requestAnimationFrame was called twice.
				assert.ok(
					rAFCalled === 2,
					`requestAnimationFrame should be called exactly twice to ensure styles are applied (called ${rAFCalled} times)`,
				);
			} finally {
				// Restore original rAF and cleanup.
				globalThis.requestAnimationFrame = originalRAF;
				document.getElementById("mancha-cloak")?.remove();
			}
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
			document.getElementById("mancha-cloak")?.remove();
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
			assert.ok(!document.getElementById("mancha-cloak"), "Cloak style should be removed");

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
			assert.ok(!document.getElementById("mancha-cloak"));

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
			assert.ok(!document.getElementById("mancha-cloak"));

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
			assert.ok(!document.getElementById("mancha-cloak"));

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

		it("reuse existing cloak style data if present (manual pre-cloaking)", async () => {
			// Manually create the style tag (simulate user avoiding FOUC).
			const style = document.createElement("style");
			style.id = "mancha-cloak";
			style.textContent = "body { opacity: 0 !important; }";
			document.head.appendChild(style);

			const target = createTestElement("cloak-test-7");

			await initMancha({
				target: "#cloak-test-7",
				cloak: true,
				state: { msg: "Pre-Cloaked" },
			});

			// Should have removed the style tag.
			assert.ok(!document.getElementById("mancha-cloak"));
			assert.equal(target.querySelector("span")?.textContent, "Pre-Cloaked");

			target.remove();
		});

		it("removes pre-cloaked style when using callback with duration (repro bug)", async () => {
			// Manually create the style tag (simulate ESM user pre-cloaking for FOUC).
			const style = document.createElement("style");
			style.id = "mancha-cloak";
			style.textContent = "body { opacity: 0 !important; }";
			document.head.appendChild(style);

			const target = createTestElement("cloak-test-8");

			// User's exact scenario: callback + cloak with duration.
			await initMancha({
				css: ["utils"],
				cloak: { duration: 100 },
				callback: async (renderer) => {
					await renderer.mount(
						document.querySelector("#cloak-test-8") as unknown as DocumentFragment,
					);
					await renderer.set("msg", "Hello World!");
				},
			});

			// Should have removed the style tag.
			assert.ok(
				!document.getElementById("mancha-cloak"),
				"Cloak style should be removed after callback with duration",
			);
			assert.equal(target.querySelector("span")?.textContent, "Hello World!");

			target.remove();
		});

		it("removes cloak even when callback throws an exception", async () => {
			// Manually create the style tag.
			const style = document.createElement("style");
			style.id = "mancha-cloak";
			style.textContent = "body { opacity: 0 !important; }";
			document.head.appendChild(style);

			const target = createTestElement("cloak-test-9");

			// User scenario: callback throws an error.
			try {
				await initMancha({
					cloak: { duration: 50 },
					callback: async () => {
						throw new Error("Simulated error in callback");
					},
				});
			} catch (_e) {
				// Expected to throw.
			}

			// Even though callback threw, cloak should still be removed.
			assert.ok(
				!document.getElementById("mancha-cloak"),
				"Cloak style should be removed even when callback throws",
			);

			target.remove();
		});

		it("removes manual cloak style even if cloak option is not provided", async () => {
			const style = document.createElement("style");
			style.id = "mancha-cloak";
			style.textContent = "body { opacity: 0 !important; }";
			document.head.appendChild(style);

			assert.ok(document.getElementById("mancha-cloak"), "Style should exist before init");

			createTestElement("cloak-test-manual-no-opt");

			await initMancha({
				target: "#cloak-test-manual-no-opt",
				// No cloak option provided
			});

			assert.ok(
				!document.getElementById("mancha-cloak"),
				"Cloak style should be removed even without cloak option",
			);
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

	it("adds and removes mancha-loading class during initialization", async () => {
		// Verify class is not present initially
		assert.ok(!document.documentElement.classList.contains("mancha-loading"));

		let verifiedInsideCallback = false;

		await initMancha({
			callback: async () => {
				// Verify class is present during callback
				assert.ok(
					document.documentElement.classList.contains("mancha-loading"),
					"Class should be present during initialization",
				);
				verifiedInsideCallback = true;
				// Simulate some work
				await new Promise((resolve) => setTimeout(resolve, 10));
			},
		});

		assert.ok(verifiedInsideCallback, "Callback should have been called");
		// Verify class is removed after initialization
		assert.ok(
			!document.documentElement.classList.contains("mancha-loading"),
			"Class should be removed after initialization",
		);
	});
});

describe("Issue #31 Browser Reproduction", () => {
	afterEach(() => {
		// Clean up test elements
		document.querySelectorAll('[id^="issue31-"]').forEach((el) => {
			el.remove();
		});
	});

	it("Bug 2: :for inside :if re-renders after async state update (no await)", async () => {
		// Create test container
		const container = document.createElement("div");
		container.id = "issue31-bug2";
		setInnerHTML(
			container,
			`<div :if="screen === 'loading'">Loading...</div>
			<div :if="screen === 'loaded'" id="issue31-list">
				<div class="item" :for="item in getItems()" :data="{ label: item.name }">
					<span :text="label"></span>
				</div>
			</div>`,
		);
		document.body.appendChild(container);

		const renderer = new Renderer({
			screen: "loading",
			items: [] as Array<{ id: number; name: string }>,
			getItems() {
				return this.items || [];
			},
			async loadData() {
				await new Promise((r) => setTimeout(r, 50));
				this.items = [
					{ id: 1, name: "Item 1" },
					{ id: 2, name: "Item 2" },
					{ id: 3, name: "Item 3" },
				];
				this.screen = "loaded";
			},
		});

		await renderer.mount(container);

		// Key pattern: async call WITHOUT await (as reported in issue)
		renderer.$.loadData();

		// Wait for async operation to complete + reactivity
		await new Promise((r) => setTimeout(r, 200));

		// Check results
		const list = document.getElementById("issue31-list");
		assert.ok(list, "List container should be visible");

		const items = list ? list.querySelectorAll(".item") : [];
		assert.equal(items.length, 3, `Expected 3 items, got ${items.length}`);
	});

	it("Bug 1: :for + :data does not produce duplicates on initial render", async () => {
		// Create test container
		const container = document.createElement("div");
		container.id = "issue31-bug1";
		setInnerHTML(
			container,
			`<table id="issue31-table">
				<tbody>
					<tr :for="move in getMoves()"
						:data="{
							annotation: getAnnotation(move)
						}">
						<td :text="move.num + '.'"></td>
						<td :text="move.name + annotation"></td>
					</tr>
				</tbody>
			</table>`,
		);
		document.body.appendChild(container);

		const renderer = new Renderer({
			moves: [
				{ num: 1, name: "e4" },
				{ num: 2, name: "Nf3" },
				{ num: 3, name: "Bb5" },
			],
			getMoves() {
				return this.moves;
			},
			getAnnotation() {
				return "!";
			},
		});

		await renderer.mount(container);

		// Check for duplicates
		const tbody = document.querySelector("#issue31-table tbody");
		const rows = tbody ? tbody.querySelectorAll("tr") : [];

		// Should have exactly 3 rows, not 6
		assert.equal(rows.length, 3, `Expected 3 rows, got ${rows.length} (duplicates?)`);
	});

	it("Bug 1: rapid state updates do not cause duplicates", async () => {
		const container = document.createElement("div");
		container.id = "issue31-rapid";
		setInnerHTML(
			container,
			`<div :for="item in items" :data="{ label: item.name }" class="rapid-item">
				<span :text="label"></span>
			</div>`,
		);
		document.body.appendChild(container);

		const renderer = new Renderer({ items: [] as Array<{ name: string }> });
		await renderer.mount(container);

		// Rapid updates without waiting
		renderer.$.items = [{ name: "A" }];
		renderer.$.items = [{ name: "B" }, { name: "C" }];
		renderer.$.items = [{ name: "X" }, { name: "Y" }, { name: "Z" }];

		// Wait for all updates to settle
		await new Promise((r) => setTimeout(r, 100));

		const items = container.querySelectorAll(".rapid-item");
		assert.equal(items.length, 3, `Expected 3 items from final state, got ${items.length}`);
	});
});

describe("Issue #65 Browser Reproduction", () => {
	afterEach(() => {
		document.querySelectorAll('[id^="issue65-"]').forEach((el) => {
			el.remove();
		});
		document.getElementById("mancha-runtime-cloak")?.remove();
	});

	for (const [mode, keyAttribute] of [
		["non-keyed", ""],
		["keyed", ' :key="item.id"'],
	]) {
		it(`${mode} :for preserves style-producing directives`, async () => {
			const container = document.createElement("div");
			container.id = `issue65-${mode}`;
			setInnerHTML(
				container,
				`<span class="attr-style" :for="item in items"${keyAttribute}
					:attr:style="'width: ' + item.width + '; color: ' + item.color"></span>
				<span class="prop-style" :for="item in items"${keyAttribute}
					:prop:style="'width: ' + item.width + '; color: ' + item.color"></span>
				<span class="show-style" style="display: inline-block; color: teal"
					:for="item in items"${keyAttribute} :show="item.visible"></span>
				<span class="static-style" style="height: 7px; color: teal"
					:for="item in items"${keyAttribute}></span>`,
			);
			document.body.appendChild(container);

			const renderer = new Renderer({
				items: [
					{ id: 1, width: "75%", color: "red", visible: false },
					{ id: 2, width: "25%", color: "blue", visible: true },
				],
			});
			await renderer.mount(container);

			const elements = (selector: string) =>
				Array.from(container.querySelectorAll(selector)) as HTMLElement[];

			let attrStyles = elements(".attr-style");
			let propStyles = elements(".prop-style");
			let showStyles = elements(".show-style");
			let staticStyles = elements(".static-style");

			assert.equal(attrStyles[0].style.width, "75%");
			assert.equal(attrStyles[0].style.color, "red");
			assert.equal(attrStyles[1].style.width, "25%");
			assert.equal(propStyles[0].style.width, "75%");
			assert.equal(propStyles[0].style.color, "red");
			assert.equal(propStyles[1].style.width, "25%");
			assert.equal(showStyles[0].style.display, "none");
			assert.equal(showStyles[1].style.display, "inline-block");
			assert.equal(showStyles[1].style.color, "teal");
			assert.equal(staticStyles[0].style.height, "7px");
			assert.equal(staticStyles[0].style.color, "teal");

			await renderer.set("items", [
				{ id: 1, width: "60%", color: "green", visible: true },
				{ id: 2, width: "40%", color: "purple", visible: false },
				{ id: 3, width: "10%", color: "orange", visible: false },
			]);
			await sleepForReactivity();

			attrStyles = elements(".attr-style");
			propStyles = elements(".prop-style");
			showStyles = elements(".show-style");
			staticStyles = elements(".static-style");

			assert.deepEqual(
				attrStyles.map((el) => [el.style.width, el.style.color]),
				[
					["60%", "green"],
					["40%", "purple"],
					["10%", "orange"],
				],
			);
			assert.deepEqual(
				propStyles.map((el) => [el.style.width, el.style.color]),
				[
					["60%", "green"],
					["40%", "purple"],
					["10%", "orange"],
				],
			);
			assert.deepEqual(
				showStyles.map((el) => el.style.display),
				["inline-block", "none", "none"],
			);
			assert.equal(staticStyles[2].style.height, "7px");
			assert.equal(
				container.querySelectorAll(
					".attr-style[data-m-cloak], .prop-style[data-m-cloak], .show-style[data-m-cloak], .static-style[data-m-cloak]",
				).length,
				0,
			);
		});
	}

	it("cloaks clones until their mounted styles are ready", async () => {
		let releaseMount = () => {};
		const mountedGate = new Promise<void>((resolve) => {
			releaseMount = resolve;
		});

		class DelayedRenderer extends Renderer {
			override async mount(
				root: Document | DocumentFragment | Node,
				params?: RenderParams,
			): Promise<void> {
				await super.mount(root, params);
				if (this.has("$parent")) await mountedGate;
			}
		}

		const container = document.createElement("div");
		container.id = "issue65-delayed";
		setInnerHTML(
			container,
			`<span class="delayed-item" :for="item in items"
				:attr:style="'display: block'">{{ item }}</span>`,
		);
		document.body.appendChild(container);

		const mounting = new DelayedRenderer({ items: ["ready"] }).mount(container);
		let clone: HTMLElement | null = null;
		for (let attempt = 0; attempt < 20 && !clone; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
			clone = container.querySelector(".delayed-item");
		}

		const hadMarkerWhileMounting = clone?.hasAttribute("data-m-cloak");
		const inlineDisplayWhileMounting = clone?.style.display;
		const computedDisplayWhileMounting = clone ? getComputedStyle(clone).display : null;
		releaseMount();
		await mounting;

		assert.ok(clone, "Expected the loop clone to be inserted synchronously");
		assert.equal(hadMarkerWhileMounting, true);
		assert.equal(inlineDisplayWhileMounting, "block");
		assert.equal(computedDisplayWhileMounting, "none");
		assert.equal(clone?.hasAttribute("data-m-cloak"), false);
		assert.equal(clone ? getComputedStyle(clone).display : null, "block");
		assert.equal(document.querySelectorAll("#mancha-runtime-cloak").length, 1);
	});
});
