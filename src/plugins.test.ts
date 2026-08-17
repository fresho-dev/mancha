import type { ElementWithAttribs } from "./dome.js";
import { dirname, firstElementChild, getAttribute, traverse } from "./dome.js";
import type { IRenderer } from "./renderer.js";
import type { ReactiveContext, StoreState } from "./store.js";
import {
	assert,
	getTextContent,
	innerHTML,
	setInnerHTML,
	setupGlobalTestEnvironment,
	sleepForReactivity,
} from "./test_utils.js";

interface RenderedState {
	className?: string;
	textContent?: string | null;
	displayStyle?: string;
	[key: string]: unknown;
}

interface RenderedElement extends ElementWithAttribs {
	_initState?: StoreState;
	_renderedState?: RenderedState;
	renderer?: IRenderer;
	_renderExecuted?: boolean;
	_modifiedCount?: number;
}

export function testSuite(ctor: new (data?: StoreState) => IRenderer): void {
	describe("Plugins Test Suite", () => {
		before(() => setupGlobalTestEnvironment());
		describe("<include>", () => {
			[
				"http://foo.com/bar.html",
				"https://foo.com/bar.html",
				"//foo.com/bar.html",
				"//foo.com/baz/../bar.html",
			].forEach((source) => {
				it(`includes a remote source using absolute path (${source})`, async () => {
					const renderer = new ctor();
					const html = `<include src="${source}"></include>`;
					const fragment = renderer.parseHTML(html);

					renderer.preprocessRemote = async (fpath, _) =>
						renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
					await renderer.mount(fragment);

					const node = fragment.firstChild as Element;
					assert.equal(getAttribute(node, "src"), null);
					assert.equal(getTextContent(node), source);
				});
			});

			["/bar.html", "/baz/../bar.html"].forEach((source) => {
				it(`includes a local source using absolute path (${source})`, async () => {
					const renderer = new ctor();
					const html = `<include src="${source}"></include>`;
					const fragment = renderer.parseHTML(html);

					renderer.preprocessLocal = async (fpath, _params) =>
						renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
					await renderer.mount(fragment, { dirpath: "/foo" });

					const node = fragment.firstChild as Element;
					assert.equal(getAttribute(node, "src"), null);
					assert.equal(getTextContent(node), source);
				});
			});

			["bar.html", "./bar.html", "baz/../bar.html"].forEach((source) => {
				it(`includes a local source using relative path (${source})`, async () => {
					const renderer = new ctor();
					const html = `<include src="${source}"></include>`;
					const fragment = renderer.parseHTML(html);

					renderer.preprocessLocal = async (fpath, _params) =>
						renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
					await renderer.mount(fragment, { dirpath: "/foo" });

					const node = fragment.firstChild as Element;
					assert.equal(getAttribute(node, "src"), null);
					assert.equal(getTextContent(node), `/foo/${source}`);
				});
			});

			it(`propagates attributes to first child`, async () => {
				const renderer = new ctor({ a: "foo", b: "bar" });
				const html = `<include src="foo.html" :on:click="fn()" :class="a" :text="b"></include>`;
				const fragment = renderer.parseHTML(html);

				renderer.preprocessLocal = async (_fpath, _params) =>
					renderer.parseHTML(
						`<span>Hello</span> <span>World</span>`,
					) as unknown as DocumentFragment;
				await renderer.mount(fragment, { dirpath: "." });

				const node = fragment.firstChild as Element;
				assert.equal(getAttribute(node, "src"), null);
				assert.equal(getAttribute(node, ":on:click"), null);
				assert.equal(getAttribute(node, "class"), "foo");
				assert.equal(getTextContent(node), "bar");
			});
		});

		describe("rebase", () => {
			it("rebase relative paths", async () => {
				const renderer = new ctor();
				const html = `<img src="bar/baz.jpg"></img>`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment, { dirpath: "/foo" });

				const node = fragment.firstChild as HTMLImageElement;
				assert.equal(getAttribute(node, "src"), "/foo/bar/baz.jpg");
			});

			it("rebase (not) absolute paths", async () => {
				const renderer = new ctor();
				const html = `<img src="/foo/bar.jpg"></img>`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment, { dirpath: "/baz" });

				const node = fragment.firstChild as HTMLImageElement;
				assert.equal(getAttribute(node, "src"), "/foo/bar.jpg");
			});

			it("rebase relative paths with indirection", async () => {
				const renderer = new ctor();
				const html = `<include src="foo/fragment.tpl.html"></include>`;
				const fragment = renderer.parseHTML(html);

				renderer.preprocessLocal = async (fpath, params) => {
					assert.equal(fpath, "foo/fragment.tpl.html");
					const node = renderer.parseHTML(`<img src="bar/baz.jpg"></img>`);
					await renderer.preprocessNode(node, {
						...params,
						dirpath: dirname(fpath),
					});
					return node;
				};
				await renderer.mount(fragment, { dirpath: "." });

				const node = fragment.firstChild as HTMLImageElement;
				assert.equal(getAttribute(node, "src"), "foo/bar/baz.jpg");
			});

			it("rebase relative paths with indirection and base path", async () => {
				const renderer = new ctor();
				const html = `<include src="bar/fragment.tpl.html"></include>`;
				const fragment = renderer.parseHTML(html);

				renderer.preprocessLocal = async (fpath, params) => {
					assert.equal(fpath, "foo/bar/fragment.tpl.html");
					const node = renderer.parseHTML(`<img src="baz/qux.jpg"></img>`);
					await renderer.preprocessNode(node, {
						...params,
						dirpath: dirname(fpath),
					});
					return node;
				};
				await renderer.mount(fragment, { dirpath: "foo" });

				const node = fragment.firstChild as HTMLImageElement;
				assert.equal(getAttribute(node, "src"), "foo/bar/baz/qux.jpg");
			});
		});

		describe("<custom-element>", () => {
			it("custom element registration", async () => {
				const renderer = new ctor();
				const customElement = "<span>Hello World</span>";
				const template = `<template is="custom-element">${customElement}</template>`;
				const fragment = renderer.parseHTML(template);
				await renderer.mount(fragment);
				assert.equal(renderer._customElements.has("custom-element"), true);
				const tpl = renderer._customElements.get("custom-element") as HTMLTemplateElement;
				assert.equal(innerHTML(tpl), customElement);
			});

			it("custom element with no attributes", async () => {
				const renderer = new ctor();
				const customElement = "<span>Hello World</span>";
				const template = `<template is="custom-element">${customElement}</template>`;
				const html = `<custom-element></custom-element>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);
				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "span");
				assert.equal(getTextContent(node), "Hello World");
			});

			it("custom element with :text and :class attributes", async () => {
				const renderer = new ctor({ a: "foo", b: "bar" });
				const customElement = "<span>Hello World</span>";
				const template = `<template is="custom-element">${customElement}</template>`;
				const html = `<custom-element :text="a" :class="b"></custom-element>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);
				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "span");
				assert.equal(getTextContent(node), "foo");
				assert.equal(getAttribute(node, "class"), "bar");
			});

			it("custom element with :data attribute", async () => {
				const renderer = new ctor();
				const customElement = "<span>{{ foo.bar }}</span>";
				const template = `<template is="custom-element">${customElement}</template>`;
				const html = `<custom-element :data="{ foo: { bar: 'baz' } }"></custom-element>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);
				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "span");
				assert.equal(getTextContent(node), "baz");
				assert.equal(getAttribute(node, ":data"), null);
			});

			it("custom element with <slot/>", async () => {
				const renderer = new ctor({ foo: "bar" });
				const customElement = "<span><slot/></span>";
				const template = `<template is="custom-element">${customElement}</template>`;
				const html = `<custom-element>{{ foo }}</custom-element>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);
				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "span");
				assert.equal(getTextContent(node), "bar");
			});

			it("custom element from include", async () => {
				const renderer = new ctor();
				const html = `<custom-element></custom-element>`;
				const include = `<include src="foo.html"></include>`;
				const fragment = renderer.parseHTML(include + html);
				renderer.preprocessLocal = async function (_fpath, _params) {
					const customElement = "<span>Hello World</span>";
					const template = `<template is="custom-element">${customElement}</template>`;
					return this.preprocessString(template) as unknown as DocumentFragment;
				};
				await renderer.mount(fragment, { dirpath: "." });

				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "span");
				assert.equal(getTextContent(node), "Hello World");
			});
		});

		describe("icon sprite pattern", () => {
			it("icon component with :data for dynamic href", async () => {
				const renderer = new ctor();
				const template = `<template is="icon"><svg class="w-4 h-4"><use :attr:href="'./sprite.svg#' + name"></use></svg></template>`;
				const html = `<icon :data="{ name: 'home' }"></icon>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);

				const svg = fragment.firstChild as Element;
				assert.equal(svg.tagName.toLowerCase(), "svg");
				const use = svg.firstChild || (svg as unknown as { children: Element[] }).children?.[0];
				assert.ok(use, "Should have a use element");
				const href = getAttribute(use as Element, "href");
				assert.equal(href, "./sprite.svg#home");
			});

			it("icon component forwards class attribute", async () => {
				const renderer = new ctor();
				const template = `<template is="icon"><svg class="w-4 h-4" :class="class"><use :attr:href="'./sprite.svg#' + name"></use></svg></template>`;
				const html = `<icon :data="{ name: 'settings' }" :class="'text-blue-500'"></icon>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);

				const svg = fragment.firstChild as Element;
				const classes = getAttribute(svg, "class") || "";
				assert.ok(classes.includes("w-4"), "Should have base class");
				assert.ok(classes.includes("text-blue-500"), "Should have forwarded class");
			});

			it("multiple icon instances with different names", async () => {
				const renderer = new ctor();
				const template = `<template is="icon"><svg><use :attr:href="'./sprite.svg#' + name"></use></svg></template>`;
				const html = `<div><icon :data="{ name: 'home' }"></icon><icon :data="{ name: 'settings' }"></icon></div>`;
				const fragment = renderer.parseHTML(template + html);
				await renderer.mount(fragment);

				const container = fragment.firstChild as Element;
				const children =
					container.childNodes || (container as unknown as { children: Element[] }).children || [];
				const icons = Array.from(children).filter(
					(n) => (n as Element).tagName?.toLowerCase() === "svg",
				);
				assert.equal(icons.length, 2, "Should have two SVG icons");

				const use1 =
					(icons[0] as Element).firstChild ||
					(icons[0] as unknown as { children: Element[] }).children?.[0];
				const use2 =
					(icons[1] as Element).firstChild ||
					(icons[1] as unknown as { children: Element[] }).children?.[0];
				assert.equal(getAttribute(use1 as Element, "href"), "./sprite.svg#home");
				assert.equal(getAttribute(use2 as Element, "href"), "./sprite.svg#settings");
			});
		});

		describe("{{ expressions }}", () => {
			it("resolves single variable", async () => {
				const content = "Hello {{ name }}";
				const renderer = new ctor({ name: "World" });
				const fragment = renderer.parseHTML(content);
				const textNode = fragment.childNodes[0] as Text;
				assert.equal(textNode.data, "Hello {{ name }}");

				await renderer.mount(fragment);
				assert.equal(textNode.data, "Hello World");

				renderer.set("name", "Stranger");
				await sleepForReactivity();
				assert.equal(textNode.data, "Hello Stranger");

				renderer.set("name", "John");
				await sleepForReactivity();
				assert.equal(textNode.data, "Hello John");
			});
		});

		describe("function call reactivity in templates", () => {
			it("updates {{ getDouble() }} when internal dependency changes", async () => {
				const renderer = new ctor({ counter: 1 });
				renderer.$.getDouble = function () {
					return this.counter * 2;
				};

				const html = `<span>{{ getDouble() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "2");

				await renderer.set("counter", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "10");
			});

			it("updates :text with function call when dependency changes", async () => {
				const renderer = new ctor({ count: 3 });
				renderer.$.formatCount = function () {
					return `Count: ${this.count}`;
				};

				const html = `<div :text="formatCount()"></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "Count: 3");

				await renderer.set("count", 10);
				assert.equal(getTextContent(fragment.firstChild as Element), "Count: 10");
			});

			it("updates :class with function call when dependency changes", async () => {
				const renderer = new ctor({ isActive: false });
				renderer.$.getClass = function () {
					return this.isActive ? "active" : "inactive";
				};

				const html = `<div :class="getClass()"></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const node = fragment.firstChild as Element;
				assert.equal(getAttribute(node, "class"), "inactive");

				await renderer.set("isActive", true);
				assert.equal(getAttribute(node, "class"), "active");
			});

			it("updates :show with function call when dependency changes", async () => {
				const renderer = new ctor({ visible: false });
				renderer.$.shouldShow = function () {
					return this.visible;
				};

				const html = `<div :show="shouldShow()">Content</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const node = fragment.firstChild as HTMLElement;
				assert.equal(getAttribute(node, "style"), "display: none;");

				await renderer.set("visible", true);
				assert.notEqual(getAttribute(node, "style"), "display: none;");
			});

			it("updates :if with function call when dependency changes", async () => {
				const renderer = new ctor({ show: false });
				renderer.$.shouldRender = function () {
					return this.show;
				};

				const html = `<div :if="shouldRender()">Visible</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment as unknown as Element), "");

				await renderer.set("show", true);
				assert.equal(getTextContent(fragment as unknown as Element), "Visible");
			});

			it("updates function that accesses nested object property", async () => {
				const renderer = new ctor({ user: { name: "Alice" } });
				renderer.$.getGreeting = function () {
					return `Hello, ${this.user.name}!`;
				};

				const html = `<span>{{ getGreeting() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "Hello, Alice!");

				renderer.$.user.name = "Bob";
				await sleepForReactivity();
				assert.equal(getTextContent(fragment.firstChild as Element), "Hello, Bob!");
			});

			it("updates function that uses this to access state", async () => {
				const renderer = new ctor({ x: 2, y: 3 });
				renderer.$.multiply = function () {
					return this.x * this.y;
				};

				const html = `<span>{{ multiply() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "6");

				await renderer.set("x", 4);
				assert.equal(getTextContent(fragment.firstChild as Element), "12");

				await renderer.set("y", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "20");
			});

			it("updates nested function calls when dependency changes", async () => {
				const renderer = new ctor({ base: 2 });
				renderer.$.double = function () {
					return this.base * 2;
				};
				renderer.$.quadruple = function () {
					return this.double() * 2;
				};

				const html = `<span>{{ quadruple() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "8");

				await renderer.set("base", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "20");
			});

			it("updates function in :for loop item context", async () => {
				const renderer = new ctor({ multiplier: 2 });
				renderer.$.scale = function (value: number) {
					return value * this.multiplier;
				};

				const html = `<span :for="n in [1, 2, 3]">{{ $parent.scale(n) }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const spans = Array.from(fragment.childNodes).filter(
					(n) => (n as Element).tagName?.toLowerCase() === "span",
				);
				assert.equal(spans.length, 3);
				assert.equal(getTextContent(spans[0] as Element), "2");
				assert.equal(getTextContent(spans[1] as Element), "4");
				assert.equal(getTextContent(spans[2] as Element), "6");

				await renderer.set("multiplier", 10);
				await sleepForReactivity();
				// Re-query spans as :for might re-render nodes
				const updatedSpans = Array.from(fragment.childNodes).filter(
					(n) => (n as Element).tagName?.toLowerCase() === "span",
				);
				assert.equal(getTextContent(updatedSpans[0] as Element), "10");
				assert.equal(getTextContent(updatedSpans[1] as Element), "20");
				assert.equal(getTextContent(updatedSpans[2] as Element), "30");
			});

			it("combines direct variable and function call in same expression", async () => {
				const renderer = new ctor({ prefix: "Result", value: 5 });
				renderer.$.compute = function () {
					return this.value * 2;
				};

				const html = `<span>{{ prefix }}: {{ compute() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "Result: 10");

				await renderer.set("value", 7);
				assert.equal(getTextContent(fragment.firstChild as Element), "Result: 14");

				await renderer.set("prefix", "Output");
				assert.equal(getTextContent(fragment.firstChild as Element), "Output: 14");
			});

			it("updates function with array dependency", async () => {
				const renderer = new ctor({ items: [1, 2, 3] });
				renderer.$.getSum = function () {
					return this.items.reduce((a: number, b: number) => a + b, 0);
				};

				const html = `<span>{{ getSum() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "6");

				renderer.$.items.push(4);
				await sleepForReactivity();
				assert.equal(getTextContent(fragment.firstChild as Element), "10");
			});

			it("does not update when unrelated property changes", async () => {
				const renderer = new ctor({ tracked: 1, untracked: 100 });
				let callCount = 0;
				renderer.$.getTracked = function () {
					callCount++;
					return this.tracked;
				};

				const html = `<span>{{ getTracked() }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "1");
				const initialCalls = callCount;

				await renderer.set("untracked", 200);
				assert.equal(callCount, initialCalls, "Should not re-call function for unrelated change");

				await renderer.set("tracked", 2);
				assert.equal(callCount, initialCalls + 1, "Should re-call for tracked change");
				assert.equal(getTextContent(fragment.firstChild as Element), "2");
			});
		});

		describe(":data", () => {
			it("initializes unseen value", async () => {
				const renderer = new ctor();
				const html = `<div :data="{foo: 'bar'}"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;
				await renderer.mount(fragment);
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(getAttribute(node, ":data"), null);
				assert.equal(subrenderer.$.foo, "bar");
			});

			it("initializes an array of values", async () => {
				const renderer = new ctor();
				const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;
				await renderer.mount(fragment);
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(getAttribute(node, ":data"), null);
				assert.deepEqual(subrenderer.$.arr, [1, 2, 3]);
			});

			it("initializes an array of objects", async () => {
				const renderer = new ctor();
				const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;
				await renderer.mount(fragment);
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(getAttribute(node, ":data"), null);
				assert.deepEqual(subrenderer.$.arr, [{ n: 1 }, { n: 2 }, { n: 3 }]);
			});

			it("initializes avoiding subrenderer", async () => {
				const renderer = new ctor({ foo: 1, bar: 2 });
				const html = `<div :data="{ baz: 3 }"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;
				// Mount the node directly, otherwise it's not the root node.
				await renderer.mount(node);
				assert.equal(renderer, (node as unknown as { renderer: IRenderer }).renderer);
				assert.equal(getAttribute(node, ":data"), null);

				// The renderer has all the initial properties + the new one.
				assert.equal(renderer.get("foo"), 1);
				assert.equal(renderer.get("bar"), 2);
				assert.equal(renderer.get("baz"), 3);
			});

			it("initializes using subrenderer", async () => {
				const renderer = new ctor({ foo: 1, bar: 2 });
				const html = `<div><div :data="{ baz: 3 }"></div><div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;
				// Mount the node directly, otherwise it's not the root node.
				await renderer.mount(node);
				const subnode = node.firstChild as Element;
				const subrenderer = (subnode as unknown as { renderer: IRenderer }).renderer;
				assert.notEqual(renderer, subrenderer);
				assert.equal(getAttribute(node, ":data"), null);

				// The parent renderer only has the initial properties.
				assert.equal(renderer.$.foo, 1);
				assert.equal(renderer.$.bar, 2);
				assert.equal(renderer.$.baz, undefined);

				// The subrenderer inherited parent properties, and has the new one.
				assert.equal(subrenderer.$.foo, 1);
				assert.equal(subrenderer.$.bar, 2);
				assert.equal(subrenderer.$.baz, 3);
			});

			it("reuses existing renderer instance", async () => {
				const renderer = new ctor();
				const html = `<div :data="{ foo: 'bar' }"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;

				await renderer.mount(fragment);
				const initialRenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.ok(initialRenderer, "Renderer should be attached after first mount");
				assert.equal(initialRenderer.$.foo, "bar", "Initial data should be set");

				// Modify a value in the subrenderer to confirm it's the same instance later
				initialRenderer.set("foo", "new_bar");

				// Simulate re-processing the :data attribute by re-mounting
				// In a real scenario, this could be triggered by a parent :for loop re-rendering
				// or a manual call to renderNode on an already mounted element.
				await renderer.mount(fragment);
				const currentRenderer = (node as unknown as { renderer: IRenderer }).renderer;

				assert.ok(currentRenderer, "Renderer should still be attached after re-mount");
				assert.equal(initialRenderer, currentRenderer, "Should reuse the same renderer instance");
				assert.equal(
					currentRenderer.$.foo,
					"new_bar",
					"Modified data should persist in reused renderer",
				);
			});

			it("does not process children twice when :for and :render are combined", async function () {
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				const renderer = new ctor();
				// Use a counter in the parent scope to track executions.
				renderer.set("execCount", 0);

				// Structure:
				// :for loop creates 1 item.
				// Item has :render (triggers recursive mount/processing).
				// Item has a child with :data that increments the counter.
				const html = `
          <div :for="i in [1]" :render="./fixtures/render-init-capture.js">
            <span :data="{ _ignore: execCount = execCount + 1 }"></span>
          </div>
        `;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment, { dirpath: "." });

				// If children are processed correctly (once), count should be 1.
				// If processed twice (once by inner mount, once by outer loop), count will be 2.
				assert.equal(renderer.get("execCount"), 1, "Children should be processed exactly once");
			});

			it("updates URL parameters when :data sets $$ variables", async () => {
				const renderer = new ctor();
				await import("./query.js").then((m) => m.setupQueryParamBindings(renderer));

				// Ensure URL is clean
				window.history.replaceState(null, "", "/");

				const html = `<div :data="{ '$$foo': 'bar' }"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;

				await renderer.mount(fragment);

				// Should update URL
				assert.ok(
					window.location.search.includes("foo=bar"),
					`URL should contain foo=bar, got ${window.location.search}`,
				);

				// Should be in renderer
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(subrenderer.get("$$foo"), "bar");
			});

			it("preserves URL parameter values when using nullish coalescing in :data", async () => {
				const renderer = new ctor();

				// Set up URL with existing parameter BEFORE mount
				window.history.replaceState(null, "", "/?mode=analysis");

				const html = `<div :data="{ '$$mode': $$mode ?? 'play' }"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;

				await renderer.mount(fragment);

				// The URL parameter should take precedence over the default
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(
					subrenderer.get("$$mode"),
					"analysis",
					"URL parameter should be preserved, not overwritten by default",
				);

				// Reset URL
				window.history.replaceState(null, "", "/");
			});

			it("preserves URL parameter values when :data is on body element", async () => {
				// Set up URL with existing parameter BEFORE creating renderer
				window.history.replaceState(null, "", "/?mode=analysis");

				const renderer = new ctor();

				// Use body directly as mount point with :data
				const body = document.body;
				body.setAttribute(":data", "{ '$$mode': $$mode ?? 'play' }");

				await renderer.mount(body);

				// The URL parameter should take precedence over the default
				assert.equal(
					renderer.get("$$mode"),
					"analysis",
					"URL parameter should be preserved on root mount node",
				);

				// Clean up
				body.removeAttribute(":data");
				window.history.replaceState(null, "", "/");
			});

			it("preserves URL parameter values with nested :data elements", async () => {
				// Set up URL with existing parameter
				window.history.replaceState(null, "", "/?page=5");

				const renderer = new ctor();

				// Nested structure with :data on inner element
				const html = `<div><span :data="{ '$$page': $$page ?? '1' }"></span></div>`;
				const fragment = renderer.parseHTML(html);
				const span = (fragment.firstChild as Element).firstChild as Element;

				await renderer.mount(fragment);

				// The URL parameter should take precedence
				const subrenderer = (span as unknown as { renderer: IRenderer }).renderer;
				assert.equal(
					subrenderer.get("$$page"),
					"5",
					"Nested :data should see URL parameter from parent",
				);

				// Reset URL
				window.history.replaceState(null, "", "/");
			});

			it("URL parameter accessible via $ proxy after :data evaluation", async () => {
				// Set up URL with existing parameter
				window.history.replaceState(null, "", "/?tab=settings");

				const renderer = new ctor();

				const html = `<div :data="{ '$$tab': $$tab ?? 'home' }"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;

				await renderer.mount(fragment);

				// Check both .get() and .$ proxy access
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(subrenderer.get("$$tab"), "settings", ".get() should return URL value");
				assert.equal(subrenderer.$.$$tab, "settings", ".$ proxy should return URL value");

				// Reset URL
				window.history.replaceState(null, "", "/");
			});

			it("URL parameter takes precedence over default in :data (non-string key)", async () => {
				// Test with unquoted key syntax (like the issue example)
				window.history.replaceState(null, "", "/?mode=analysis");

				const renderer = new ctor();

				// Use syntax closer to the issue: without quoting the key
				// Note: In JS, { $$mode: value } is the same as { "$$mode": value }
				const html = `<div :data="{ $$mode: $$mode ?? 'play' }"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as Element;

				await renderer.mount(fragment);

				// URL parameter should be preserved
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;
				assert.equal(
					subrenderer.get("$$mode"),
					"analysis",
					"URL parameter 'analysis' should be preserved, not replaced with default 'play'",
				);
				assert.equal(
					subrenderer.$.$$mode,
					"analysis",
					"$ proxy should also return URL value 'analysis'",
				);

				// Also verify the root renderer has the URL param
				assert.equal(renderer.get("$$mode"), "analysis", "Root renderer should have URL parameter");

				// Reset URL
				window.history.replaceState(null, "", "/");
			});
		});

		describe("$computed in :data", () => {
			it("creates a reactive computed value", async () => {
				const renderer = new ctor({ count: 2 });
				const html = `<div :data="{ double: $computed(($) => $.count * 2) }">{{ double }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "4");

				await renderer.set("count", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "10");
			});

			it("computed value updates when parent scope changes", async () => {
				const renderer = new ctor({ multiplier: 3 });
				const html = `<div :data="{ base: 4, result: $computed(($) => $.base * $.multiplier) }">{{ result }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "12");

				await renderer.set("multiplier", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "20");
			});

			it("computed value works with nested :data scopes", async () => {
				const renderer = new ctor({ factor: 2 });
				const html = `<div :data="{ x: 3 }"><span :data="{ doubled: $computed(($) => $.x * $.factor) }">{{ doubled }}</span></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const span = (fragment.firstChild as Element).firstChild as Element;
				assert.equal(getTextContent(span), "6");

				await renderer.set("factor", 4);
				assert.equal(getTextContent(span), "12");
			});

			it("multiple computed values in same :data", async () => {
				const renderer = new ctor({ n: 5 });
				const html = `<div :data="{
					doubled: $computed(($) => $.n * 2),
					squared: $computed(($) => $.n * $.n)
				}">{{ doubled }} / {{ squared }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "10 / 25");

				await renderer.set("n", 3);
				assert.equal(getTextContent(fragment.firstChild as Element), "6 / 9");
			});

			it("computed value can depend on another computed value", async () => {
				const renderer = new ctor({ base: 2 });
				const html = `<div :data="{
					double: $computed(($) => $.base * 2),
					quadruple: $computed(($) => $.double * 2)
				}">{{ quadruple }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "8");

				await renderer.set("base", 3);
				assert.equal(getTextContent(fragment.firstChild as Element), "12");
			});
		});

		describe("$computed with simpler syntax", () => {
			it("creates a reactive computed value without $ parameter", async () => {
				const renderer = new ctor({ count: 2 });
				const html = `<div :data="{ double: $computed(() => count * 2) }">{{ double }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "4");

				await renderer.set("count", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "10");
			});

			it("simpler syntax works with multiple dependencies", async () => {
				const renderer = new ctor({ a: 2, b: 3 });
				const html = `<div :data="{ sum: $computed(() => a + b) }">{{ sum }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "5");

				await renderer.set("a", 10);
				assert.equal(getTextContent(fragment.firstChild as Element), "13");

				await renderer.set("b", 7);
				assert.equal(getTextContent(fragment.firstChild as Element), "17");
			});

			it("simpler syntax works with parent scope variables", async () => {
				const renderer = new ctor({ multiplier: 3 });
				const html = `<div :data="{ base: 4, result: $computed(() => base * multiplier) }">{{ result }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "12");

				await renderer.set("multiplier", 5);
				assert.equal(getTextContent(fragment.firstChild as Element), "20");
			});

			it("simpler syntax works with cascading computed values", async () => {
				const renderer = new ctor({ base: 2 });
				const html = `<div :data="{
					double: $computed(() => base * 2),
					quadruple: $computed(() => double * 2)
				}">{{ quadruple }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "8");

				await renderer.set("base", 3);
				assert.equal(getTextContent(fragment.firstChild as Element), "12");
			});

			it("simpler syntax works with string concatenation", async () => {
				const renderer = new ctor({ name: "Alice" });
				const html = `<div :data="{ greeting: $computed(() => 'Hello, ' + name + '!') }">{{ greeting }}</div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				assert.equal(getTextContent(fragment.firstChild as Element), "Hello, Alice!");

				await renderer.set("name", "Bob");
				assert.equal(getTextContent(fragment.firstChild as Element), "Hello, Bob!");
			});
		});

		describe("$computed with :for", () => {
			it("computed inside :for depends on loop item", async () => {
				const renderer = new ctor({
					items: [
						{ name: "A", score: 10 },
						{ name: "B", score: 20 },
						{ name: "C", score: 30 },
					],
				});

				const html = `<span :for="item in items" :data="{ doubled: $computed(() => item.score * 2) }">{{ doubled }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getResults = () =>
					Array.from(fragment.childNodes)
						.filter((n) => (n as Element).tagName?.toLowerCase() === "span")
						.map((el) => getTextContent(el as Element));

				assert.deepEqual(getResults(), ["20", "40", "60"]);

				// Mutate an item's score - the computed should update
				renderer.$.items[1].score = 50;
				await sleepForReactivity();

				assert.deepEqual(getResults(), ["20", "100", "60"]);
			});

			it("computed in :for accesses parent scope", async () => {
				const renderer = new ctor({
					multiplier: 2,
					items: [{ value: 5 }, { value: 10 }, { value: 15 }],
				});

				const html = `<span :for="item in items" :data="{ result: $computed(() => item.value * multiplier) }">{{ result }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getResults = () =>
					Array.from(fragment.childNodes)
						.filter((n) => (n as Element).tagName?.toLowerCase() === "span")
						.map((el) => getTextContent(el as Element));

				assert.deepEqual(getResults(), ["10", "20", "30"]);

				// Change parent scope multiplier - all computeds should update
				renderer.$.multiplier = 3;
				await sleepForReactivity();

				assert.deepEqual(getResults(), ["15", "30", "45"]);

				// Change individual item - only that computed should update
				renderer.$.items[0].value = 100;
				await sleepForReactivity();

				assert.deepEqual(getResults(), ["300", "30", "45"]);
			});

			it("computed observers cleaned up when :for items removed", async () => {
				const renderer = new ctor({
					items: [{ id: 1 }, { id: 2 }, { id: 3 }],
					multiplier: 2,
				});

				const html = `<span :for="item in items" :data="{ result: $computed(() => item.id * multiplier) }">{{ result }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getResults = () =>
					Array.from(fragment.childNodes)
						.filter((n) => (n as Element).tagName?.toLowerCase() === "span")
						.map((el) => getTextContent(el as Element));

				assert.deepEqual(getResults(), ["2", "4", "6"]);

				// Remove items - observers should be cleaned up
				renderer.$.items = [{ id: 10 }];
				await sleepForReactivity();

				assert.deepEqual(getResults(), ["20"]);

				// Verify multiplier change only affects remaining item
				renderer.$.multiplier = 5;
				await sleepForReactivity();

				assert.deepEqual(getResults(), ["50"]);
			});

			it("computed with array aggregation in :for", async () => {
				const renderer = new ctor({
					groups: [
						{ name: "A", items: [1, 2, 3] },
						{ name: "B", items: [4, 5] },
					],
				});

				const html = `<span :for="group in groups" :data="{ sum: $computed(() => group.items.reduce((a, b) => a + b, 0)) }">{{ group.name }}: {{ sum }}</span>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getGroups = () =>
					Array.from(fragment.childNodes)
						.filter((n) => (n as Element).tagName?.toLowerCase() === "span")
						.map((el) => getTextContent(el as Element));

				assert.deepEqual(getGroups(), ["A: 6", "B: 9"]);

				// Modify an item in one group
				renderer.$.groups[0].items.push(4);
				await sleepForReactivity();

				assert.deepEqual(getGroups(), ["A: 10", "B: 9"]);
			});
		});

		describe("$computed with :if", () => {
			it("computed condition controls visibility", async () => {
				const renderer = new ctor({ threshold: 50, value: 30 });

				const html = `<div :data="{ isAbove: $computed(() => value >= threshold) }"><span :if="isAbove">Above</span><span :if="!isAbove">Below</span></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getVisibleText = () => {
					const div = fragment.firstChild as Element;
					const spans = Array.from(div.childNodes).filter(
						(n) => (n as Element).tagName?.toLowerCase() === "span",
					);
					return spans.map((s) => getTextContent(s as Element)).join(",");
				};

				// Initially below threshold
				assert.equal(getVisibleText(), "Below");

				// Change value to above threshold
				renderer.$.value = 60;
				await sleepForReactivity();

				assert.equal(getVisibleText(), "Above");

				// Change threshold to make it below again
				renderer.$.threshold = 70;
				await sleepForReactivity();

				assert.equal(getVisibleText(), "Below");
			});
		});

		describe(":class", () => {
			it("single class", async () => {
				const renderer = new ctor({ foo: "bar" });
				const html = `<div :class="foo"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				await renderer.mount(fragment);
				assert.equal(getAttribute(node, ":class"), null);
				assert.equal(renderer.$.foo, "bar");
				assert.equal(getAttribute(node, "class"), "bar");
			});
			it("multiple classes", async () => {
				const renderer = new ctor({ foo: "bar", bar: "baz" });
				const html = `<div class="foo" :class="foo"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				await renderer.mount(fragment);
				assert.equal(getAttribute(node, ":class"), null);
				assert.equal(renderer.$.foo, "bar");
				assert.equal(renderer.$.bar, "baz");
				assert.equal(getAttribute(node, "class"), "foo bar");
			});
		});

		describe("on:event", () => {
			it("click", async function () {
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();
				const renderer = new ctor({ counter: 0 });
				const html = `<div :on:click="counter = counter + 1"></div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				await renderer.mount(fragment);
				assert.equal(renderer.$.counter, 0);

				node.click?.();
				await sleepForReactivity();
				assert.equal(renderer.$.counter, 1);
			});

			it("click.prevent", async function () {
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();
				const renderer = new ctor({ counter: 0 });
				const html = `<a href="#" :on:click.prevent="counter = counter + 1"></a>`;
				const fragment = renderer.parseHTML(html);
				document.body.replaceChildren(fragment);
				const node = document.body.firstChild as HTMLAnchorElement;
				await renderer.mount(document.body);
				assert.equal(renderer.$.counter, 0);

				const event = new window.Event("click", { cancelable: true });
				node.dispatchEvent(event);
				await sleepForReactivity();
				assert.equal(renderer.$.counter, 1);
				assert.equal(event.defaultPrevented, true);
			});
		});

		describe(":for", () => {
			[0, 1, 10].forEach((n) => {
				it(`container with ${n} items`, async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items">{{ item }}</div>`;
					const fragment = renderer.parseHTML(html);
					const node = fragment.firstChild as HTMLElement;
					const parent = node.parentNode;
					assert.notEqual(parent, null);

					// Create array with 0..n elements.
					const container = Array.from({ length: n }, (_, x) => String(x));
					renderer.set("items", container);
					await renderer.mount(fragment);

					assert.equal(getAttribute(node, ":for"), null);
					assert.notEqual(node.parentNode, parent);
					assert.notEqual(renderer.$.item, "foo");

					const children = Array.from(parent?.childNodes || []).slice(1);
					assert.equal(children.length, container.length);
					for (let i = 0; i < container.length; i++) {
						assert.equal(getTextContent(children[i] as Element), container[i]);
					}
				});
			});

			it("container that updates items", async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items">{{ item }}</div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				const parent = node.parentNode;
				assert.notEqual(parent, null);

				// Create array with no elements.
				renderer.set("items", []);
				await renderer.mount(fragment);

				// Confirm that there are no children except for the template element.
				const children0 = Array.from(parent?.childNodes || []);
				assert.equal(children0.length, 1);
				const template0 = children0[0] as HTMLTemplateElement;
				assert.equal(template0.tagName.toLowerCase(), "template");
				// template.content exists in the browser but not worker
				const templateFirstChild = template0.content?.firstChild || template0.firstChild;
				assert.equal(templateFirstChild, node);

				// Add a single item.
				renderer.$.items = ["foo"];
				await sleepForReactivity();
				const children1 = Array.from(parent?.childNodes || []);
				assert.equal(children1.length, renderer.$.items.length + 1);
				assert.equal(getTextContent(children1[1] as Element), "foo");

				// Add multiple items.
				renderer.$.items.push("bar", "baz");
				await sleepForReactivity();
				const children2 = Array.from(parent?.childNodes || []);
				assert.equal(children2.length, renderer.$.items.length + 1);
				assert.equal(getTextContent(children2[1] as Element), "foo");
				assert.equal(getTextContent(children2[2] as Element), "bar");
				assert.equal(getTextContent(children2[3] as Element), "baz");

				// Remove one item.
				renderer.$.items.pop();
				await sleepForReactivity();
				const children3 = Array.from(parent?.childNodes || []);
				assert.equal(children3.length, renderer.$.items.length + 1);
				assert.equal(getTextContent(children3[1] as Element), "foo");
				assert.equal(getTextContent(children3[2] as Element), "bar");
			});

			it("renders items fully before inserting into DOM (no flash of untemplated content)", async () => {
				// Issue #21: Ensure elements are fully rendered before insertion to prevent
				// flash of raw {{ variable }} syntax during reactive updates.
				const renderer = new ctor();
				const html = `<div :for="item in items"><span>{{ item.name }}</span></div>`;
				const fragment = renderer.parseHTML(html);

				// Helper to check rendered divs (excluding template element which holds raw template)
				const getRenderedDivs = () =>
					Array.from(fragment.childNodes).filter(
						(n) => (n as Element).tagName?.toLowerCase() === "div",
					);

				// Initial render
				renderer.set("items", [{ name: "first" }, { name: "second" }]);
				await renderer.mount(fragment);

				// Verify initial render has no raw template syntax in rendered divs
				const initialDivs = getRenderedDivs();
				for (const div of initialDivs) {
					const content = innerHTML(div as unknown as Element);
					assert.ok(
						!content.includes("{{"),
						`Initial render should not contain raw template syntax. Got: ${content}`,
					);
				}

				// Trigger reactive update with new array
				renderer.$.items = [{ name: "updated1" }, { name: "updated2" }, { name: "updated3" }];
				await sleepForReactivity();

				// After reactive update, rendered divs should be fully rendered (no raw {{ }})
				const updatedDivs = getRenderedDivs();
				for (const div of updatedDivs) {
					const content = innerHTML(div as unknown as Element);
					assert.ok(
						!content.includes("{{"),
						`Reactive update should not leave raw template syntax. Got: ${content}`,
					);
				}

				// Verify content is correct
				assert.equal(updatedDivs.length, 3);
				assert.equal(getTextContent(updatedDivs[0] as Element), "updated1");
				assert.equal(getTextContent(updatedDivs[1] as Element), "updated2");
				assert.equal(getTextContent(updatedDivs[2] as Element), "updated3");
			});

			it("container does not resolve initially", async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items">{{ item }}</div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				const parent = node.parentNode;
				assert.ok(parent);

				// Create renderer with no array => auto-initialized variables are undefined.
				await renderer.mount(fragment);
				assert.equal(renderer.get("item"), undefined);
				assert.equal(renderer.get("items"), undefined);

				// Add a placeholder for the array, but it's not array type.
				await renderer.set("items", null);
				await renderer.mount(fragment);

				assert.equal(renderer.get("item"), undefined);
				assert.equal(getAttribute(node, ":for"), null);
				assert.notEqual(node.parentNode, parent);

				const children = Array.from(parent?.childNodes || []);
				assert.equal(children.length, 1);
				const template = children[0] as HTMLTemplateElement;
				assert.equal(template.tagName.toLowerCase(), "template");
				// template.content exists in the browser but not worker
				const templateFirstChild = template.content?.firstChild || template.firstChild;
				assert.equal(templateFirstChild, node);
			});

			it("template node with :text property", async () => {
				const renderer = new ctor();
				const html = `<div :text="item" :for="item in items"></div>`;
				const fragment = renderer.parseHTML(html);

				renderer.set("items", ["1", "2"]);
				await renderer.mount(fragment);

				// Filter out template node; keep only rendered divs.
				const divs = Array.from(fragment.childNodes).filter(
					(n) => (n as Element).tagName?.toLowerCase() !== "template",
				);
				assert.equal(divs.length, 2);
				assert.equal(getTextContent(divs[0] as Element)?.trim(), "1");
				assert.equal(getTextContent(divs[1] as Element)?.trim(), "2");

				await renderer.set("items", ["a", "b"]);
				const divsAB = Array.from(fragment.childNodes).filter(
					(n) => (n as Element).tagName?.toLowerCase() !== "template",
				);
				assert.equal(divsAB.length, 2);
				assert.equal(getTextContent(divsAB[0] as Element)?.trim(), "a");
				assert.equal(getTextContent(divsAB[1] as Element)?.trim(), "b");
			});

			it(`container with object items`, async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items">{{ item.text }}</div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				const parent = node.parentNode;
				assert.notEqual(parent, null);

				// Create array with 0..n elements.
				const container = Array.from({ length: 10 }, (_, x) => ({ text: String(x) }));
				renderer.set("items", container);
				await renderer.mount(fragment);

				assert.equal(getAttribute(node, ":for"), null);
				assert.notEqual(node.parentNode, parent);

				const children = Array.from(parent?.childNodes || []).slice(1);
				assert.equal(children.length, container.length);
				for (let i = 0; i < container.length; i++) {
					assert.equal(getTextContent(children[i] as Element), container[i].text);
				}
			});

			it("container with nested arrays", async () => {
				// Create array with 0..n elements.
				let curr = 0;
				const container = [];
				for (let i = 0; i < 10; i++) {
					const subarr = Array.from({ length: 10 }, (_, _x) => ({ text: String(curr++) }));
					container.push({ text: String(i), items: subarr });
				}
				const renderer = new ctor({ items: container });
				const htmlSubitem = `<div :for="subitem in (item.items)">{{ subitem.text }}</div>`;
				const html = `<div :for="item in items"><span>{{ item.text }}</span>${htmlSubitem}</div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment);
				const node = fragment.firstChild as HTMLElement;
				const parent = node.parentNode;
				assert.notEqual(parent, null);
				assert.equal(getAttribute(node, ":for"), null);

				const children = Array.from(parent?.childNodes || []).slice(1);
				assert.equal(children.length, container.length);
				for (let i = 0; i < container.length; i++) {
					const subchildren = Array.from(children[i].childNodes);
					// The first item is the <span> element.
					const spanitem = subchildren.shift() as Element;
					assert.equal(getTextContent(spanitem), container[i].text);
					// The next item is the <template> element.
					const tplelem = subchildren.shift() as Element;
					assert.equal(tplelem?.tagName?.toLowerCase(), "template");
					// The remaining items are the subitems.
					assert.equal(subchildren.length, container[i].items.length);
					for (let j = 0; j < container[i].items.length; j++) {
						assert.equal(getTextContent(subchildren[j] as Element), container[i].items[j].text);
					}
				}
			});

			it("template element is not displayed", async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items">{{ item }}</div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				const parent = node.parentNode;
				assert.notEqual(parent, null);

				// Create array with a single element.
				renderer.set("items", ["foo"]);
				await renderer.mount(fragment);

				assert.equal(getAttribute(node, ":for"), null);
				const [tplelem, childelem] = Array.from(fragment.childNodes) as Element[];
				assert.equal(tplelem?.tagName?.toLowerCase(), "template");
				assert.equal(childelem?.tagName?.toLowerCase(), "div");

				// The template source is cloaked without modifying its application-owned style.
				// For browser renderers, content is in template.content; for worker it's in template.childNodes
				const templateChild =
					(tplelem as HTMLTemplateElement).content?.firstChild || tplelem.childNodes[0];
				assert.equal(getAttribute(templateChild as Element, "data-m-cloak"), "");
				assert.equal(getAttribute(templateChild as Element, "style"), null);
				assert.equal(getTextContent(childelem), "foo");
			});

			it("container using map with arrow function", async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items.map((x) => x * 2)">{{ item }}</div>`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;
				const parent = node.parentNode;
				assert.notEqual(parent, null);

				renderer.set("items", [1, 2, 3]);
				await renderer.mount(fragment);

				const children = Array.from(parent?.childNodes || []).slice(1);
				assert.equal(children.length, 3);
				assert.equal(getTextContent(children[0] as Element), "2");
				assert.equal(getTextContent(children[1] as Element), "4");
				assert.equal(getTextContent(children[2] as Element), "6");
			});

			it("performance: 64 items with multiple directives completes quickly", async () => {
				// Issue #26: Test that :for with many items and multiple directives per item
				// does not cause excessive slowdown.
				const board = Array.from({ length: 64 }, (_, i) => ({
					square: `sq${i}`,
					piece: i < 16 ? `./pieces/piece${i}.svg` : null,
					classes: `cell ${i % 2 === 0 ? "light" : "dark"}`,
					legalMove: false,
				}));

				const renderer = new ctor({
					board,
					getBoard() {
						return this.board;
					},
				});

				// Pattern from issue #26
				const html = `
					<div :for="sq in getBoard()" :class="sq.classes" :attr:data-square="sq.square">
						<div :if="sq.legalMove" class="legal">legal</div>
						<img :if="sq.piece" :prop:src="sq.piece" class="piece">
					</div>
				`;

				const fragment = renderer.parseHTML(html);
				const startTime = Date.now();

				await renderer.mount(fragment);

				const duration = Date.now() - startTime;

				// Should complete in reasonable time - definitely less than 5 seconds
				assert.ok(duration < 5000, `Mount with 64 items took ${duration}ms, expected < 5000ms`);
			});

			it("does not produce duplicate rows when effect re-triggers during mount (issue #31)", async () => {
				// Issue #31 Bug 1: When :for + :data is used and state updates rapidly,
				// the effect may trigger twice before the first Promise resolves,
				// causing duplicate rows.
				const renderer = new ctor({ items: [] });

				// First test without :data to verify basic reactivity
				const html = `<div :for="item in items">{{ item.name }}</div>`;
				const fragment = renderer.parseHTML(html);

				// Mount first with empty array
				await renderer.mount(fragment);

				// Helper to count rendered items (excluding template)
				const getRenderedItems = () =>
					Array.from(fragment.childNodes).filter(
						(n) => (n as Element).tagName?.toLowerCase() === "div",
					);

				// Initially should have no items
				assert.equal(getRenderedItems().length, 0);

				// Trigger state update
				renderer.$.items = [{ name: "A" }, { name: "B" }, { name: "C" }];

				// Wait for reactivity to settle
				await sleepForReactivity();

				// Should have exactly 3 items
				const items = getRenderedItems();
				assert.equal(items.length, 3, `Expected 3 items, got ${items.length}`);

				// Verify content
				const texts = items.map((item) => getTextContent(item as Element));
				assert.deepEqual(texts, ["A", "B", "C"]);
			});

			it("does not produce duplicate rows with :for + :data (issue #31)", async () => {
				// Issue #31 Bug 1: The specific case with :for + :data combination
				// Note: :for + :data requires extra wait time because :data involves nested
				// async operations (mount -> :data set -> effects). Two sleepForReactivity
				// calls are needed: one for the :for effect debounce, one for :data effects.
				const renderer = new ctor({ items: [] });

				const html = `<div :for="item in items" :data="{ label: item.name }"><span :text="label"></span></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getRenderedItems = () =>
					Array.from(fragment.childNodes).filter(
						(n) => (n as Element).tagName?.toLowerCase() === "div",
					);

				assert.equal(getRenderedItems().length, 0);

				renderer.$.items = [{ name: "A" }, { name: "B" }, { name: "C" }];
				// Wait for :for effect + nested :data effects
				await sleepForReactivity();
				await sleepForReactivity();

				const items = getRenderedItems();
				assert.equal(
					items.length,
					3,
					`Expected 3 items, got ${items.length} (possible duplicates)`,
				);

				const texts = items.map((item) => getTextContent(item as Element));
				assert.deepEqual(texts, ["A", "B", "C"]);
			});

			it("handles concurrent rapid state updates without duplicates (issue #31)", async () => {
				// Issue #31 Bug 1: More aggressive test with multiple rapid updates
				// Tests that debouncing correctly coalesces rapid updates to prevent duplicates.
				const renderer = new ctor({ items: [{ name: "initial" }] });

				const html = `<div :for="item in items" :data="{ label: item.name }"><span :text="label"></span></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				const getRenderedItems = () =>
					Array.from(fragment.childNodes).filter(
						(n) => (n as Element).tagName?.toLowerCase() === "div",
					);

				// Fire multiple rapid updates without waiting - debouncing should coalesce
				renderer.$.items = [{ name: "A" }];
				renderer.$.items = [{ name: "B" }, { name: "C" }];
				renderer.$.items = [{ name: "X" }, { name: "Y" }, { name: "Z" }];

				// Wait for :for effect + nested :data effects
				await sleepForReactivity();
				await sleepForReactivity();

				// Should have exactly 3 items from the final state
				const items = getRenderedItems();
				assert.equal(items.length, 3, `Expected 3 items, got ${items.length}`);

				const texts = items.map((item) => getTextContent(item as Element));
				assert.deepEqual(texts, ["X", "Y", "Z"]);
			});

			it("cleans up subrenderer observers when items are replaced", async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items"><span :text="count"></span></div>`;
				const fragment = renderer.parseHTML(html);

				// Set initial data: 3 items watching 'count'.
				renderer.set("count", 0);
				renderer.set("items", ["a", "b", "c"]);
				await renderer.mount(fragment);

				// Each :for item creates a subrenderer that watches 'count'.
				// With 3 items, we should have 3 observers for 'count'.
				const statsBefore = renderer.getObserverStats();
				const countObserversBefore = statsBefore.byKey.count || 0;
				assert.equal(countObserversBefore, 3, "Should have 3 observers for 'count' (one per item)");

				// Replace items with new array - old subrenderers should be disposed.
				renderer.$.items = ["x", "y"];
				await sleepForReactivity();

				// Now we should have exactly 2 observers (one per new item).
				// Old observers should have been cleaned up.
				const statsAfter = renderer.getObserverStats();
				const countObserversAfter = statsAfter.byKey.count || 0;
				assert.equal(
					countObserversAfter,
					2,
					"Should have 2 observers for 'count' after replacing items (old ones cleaned up)",
				);
			});

			it("cleans up all subrenderer observers when items are cleared", async () => {
				const renderer = new ctor();
				const html = `<div :for="item in items"><span :text="count"></span></div>`;
				const fragment = renderer.parseHTML(html);

				renderer.set("count", 0);
				renderer.set("items", ["a", "b", "c"]);
				await renderer.mount(fragment);

				const statsBefore = renderer.getObserverStats();
				assert.equal(statsBefore.byKey.count, 3, "Should have 3 observers initially");

				// Clear all items.
				renderer.$.items = [];
				await sleepForReactivity();

				// All observers should be cleaned up.
				const statsAfter = renderer.getObserverStats();
				const countObserversAfter = statsAfter.byKey.count || 0;
				assert.equal(countObserversAfter, 0, "Should have 0 observers after clearing items");
			});

			describe(":key reconciliation", () => {
				it("reuses DOM nodes when items have stable :key", async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.id">{{ item.name }}</div>`;
					const fragment = renderer.parseHTML(html);

					renderer.set("items", [
						{ id: 1, name: "a" },
						{ id: 2, name: "b" },
					]);
					await renderer.mount(fragment);

					// Get references to the actual DOM nodes.
					const getDivs = () =>
						Array.from(fragment.childNodes).filter(
							(n) => (n as Element).tagName?.toLowerCase() === "div",
						);
					const divs1 = getDivs();
					assert.equal(divs1.length, 2);

					// Update names but keep same ids.
					// Use await set() to wait for cascading effects (parent notify + subrenderer notify).
					await renderer.set("items", [
						{ id: 1, name: "updated-a" },
						{ id: 2, name: "updated-b" },
					]);
					await sleepForReactivity();

					// Same DOM nodes should be reused (same object references).
					const divs2 = getDivs();
					assert.equal(divs2.length, 2);
					assert.equal(divs1[0], divs2[0], "First node should be reused");
					assert.equal(divs1[1], divs2[1], "Second node should be reused");

					// Content should be updated.
					assert.equal(getTextContent(divs2[0] as Element), "updated-a");
					assert.equal(getTextContent(divs2[1] as Element), "updated-b");
				});

				it("reorders DOM nodes when items are reordered with :key", async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.id">{{ item.name }}</div>`;
					const fragment = renderer.parseHTML(html);

					renderer.set("items", [
						{ id: 1, name: "a" },
						{ id: 2, name: "b" },
						{ id: 3, name: "c" },
					]);
					await renderer.mount(fragment);

					const getDivs = () =>
						Array.from(fragment.childNodes).filter(
							(n) => (n as Element).tagName?.toLowerCase() === "div",
						);
					const divs1 = getDivs();
					assert.equal(divs1.length, 3);

					// Reverse the order.
					renderer.$.items = [
						{ id: 3, name: "c" },
						{ id: 2, name: "b" },
						{ id: 1, name: "a" },
					];
					await sleepForReactivity();

					// Nodes should be the same objects but in different order.
					const divs2 = getDivs();
					assert.equal(divs2.length, 3);
					assert.equal(divs1[0], divs2[2], "First node should now be last");
					assert.equal(divs1[1], divs2[1], "Second node should stay in middle");
					assert.equal(divs1[2], divs2[0], "Third node should now be first");

					// Content order should match new order.
					assert.equal(getTextContent(divs2[0] as Element), "c");
					assert.equal(getTextContent(divs2[1] as Element), "b");
					assert.equal(getTextContent(divs2[2] as Element), "a");
				});

				it("adds new nodes for new keys", async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.id">{{ item.name }}</div>`;
					const fragment = renderer.parseHTML(html);

					renderer.set("items", [{ id: 1, name: "a" }]);
					await renderer.mount(fragment);

					const getDivs = () =>
						Array.from(fragment.childNodes).filter(
							(n) => (n as Element).tagName?.toLowerCase() === "div",
						);
					const divs1 = getDivs();
					assert.equal(divs1.length, 1);
					const originalNode = divs1[0];

					// Add two more items.
					renderer.$.items = [
						{ id: 1, name: "a" },
						{ id: 2, name: "b" },
						{ id: 3, name: "c" },
					];
					await sleepForReactivity();

					const divs2 = getDivs();
					assert.equal(divs2.length, 3);
					assert.equal(divs2[0], originalNode, "Original node should be preserved");
					assert.equal(getTextContent(divs2[1] as Element), "b");
					assert.equal(getTextContent(divs2[2] as Element), "c");
				});

				it("removes nodes for removed keys", async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.id">{{ item.name }}</div>`;
					const fragment = renderer.parseHTML(html);

					renderer.set("items", [
						{ id: 1, name: "a" },
						{ id: 2, name: "b" },
						{ id: 3, name: "c" },
					]);
					await renderer.mount(fragment);

					const getDivs = () =>
						Array.from(fragment.childNodes).filter(
							(n) => (n as Element).tagName?.toLowerCase() === "div",
						);
					const divs1 = getDivs();
					assert.equal(divs1.length, 3);
					const keepNode = divs1[0]; // id: 1
					const removeNode = divs1[1]; // id: 2

					// Remove middle item.
					renderer.$.items = [
						{ id: 1, name: "a" },
						{ id: 3, name: "c" },
					];
					await sleepForReactivity();

					const divs2 = getDivs();
					assert.equal(divs2.length, 2);
					assert.equal(divs2[0], keepNode, "First node should be preserved");
					assert.notEqual(divs2[1], removeNode, "Removed node should not be in DOM");
					assert.equal(getTextContent(divs2[0] as Element), "a");
					assert.equal(getTextContent(divs2[1] as Element), "c");
				});

				it("warns about duplicate keys", async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.group">{{ item.name }}</div>`;
					const fragment = renderer.parseHTML(html);

					// Capture console.warn calls.
					const originalWarn = console.warn;
					const warnings: string[] = [];
					console.warn = (msg: string) => warnings.push(msg);

					try {
						renderer.set("items", [
							{ group: "A", name: "first" },
							{ group: "A", name: "second" }, // Duplicate key
						]);
						await renderer.mount(fragment);

						assert.ok(
							warnings.some((w) => w.includes("duplicate key")),
							"Should warn about duplicate keys",
						);
					} finally {
						console.warn = originalWarn;
					}
				});

				it("cleans up observers when keyed items are removed", async () => {
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.id"><span :text="count"></span></div>`;
					const fragment = renderer.parseHTML(html);

					renderer.set("count", 0);
					renderer.set("items", [{ id: 1 }, { id: 2 }, { id: 3 }]);
					await renderer.mount(fragment);

					const statsBefore = renderer.getObserverStats();
					assert.equal(statsBefore.byKey.count, 3, "Should have 3 observers initially");

					// Remove two items.
					renderer.$.items = [{ id: 2 }];
					await sleepForReactivity();

					const statsAfter = renderer.getObserverStats();
					assert.equal(statsAfter.byKey.count, 1, "Should have 1 observer after removing 2 items");
				});

				it("updates :data bindings when keyed items are updated", async () => {
					// When :for + :key + :data is used and a keyed item is reused,
					// :data must be re-evaluated with the updated loop variable.
					const renderer = new ctor();
					const html = `<div :for="item in items" :key="item.id" :data="{ label: item.name }"><span :text="label"></span></div>`;
					const fragment = renderer.parseHTML(html);

					renderer.set("items", [
						{ id: 1, name: "a" },
						{ id: 2, name: "b" },
					]);
					await renderer.mount(fragment);

					// Wait for :for effect + nested :data effects.
					await sleepForReactivity();
					await sleepForReactivity();

					const getRenderedItems = () =>
						Array.from(fragment.childNodes).filter(
							(n) => n.nodeType === 1 && (n as Element).tagName?.toLowerCase() !== "template",
						);

					const divs1 = getRenderedItems();
					assert.equal(divs1.length, 2);
					assert.equal(getTextContent(divs1[0] as Element), "a");
					assert.equal(getTextContent(divs1[1] as Element), "b");

					// Update items with same keys but different names.
					renderer.$.items = [
						{ id: 1, name: "updated-a" },
						{ id: 2, name: "updated-b" },
					];
					// 3 levels of cascading effects: :for -> :data -> :text
					await sleepForReactivity();
					await sleepForReactivity();
					await sleepForReactivity();

					const divs2 = getRenderedItems();
					assert.equal(divs2.length, 2);
					assert.equal(getTextContent(divs2[0] as Element), "updated-a");
					assert.equal(getTextContent(divs2[1] as Element), "updated-b");
				});

				// The rendered rows are the fragment's element children, minus the :for template.
				const getRows = (fragment: Node): Element[] =>
					Array.from(fragment.childNodes).filter(
						(n) => n.nodeType === 1 && (n as Element).tagName?.toLowerCase() !== "template",
					) as unknown as Element[];

				// A reused row is only correct if every directive inside it re-renders, so the
				// in-place mutation cases below are exercised against each binding flavor.
				const bindings = [
					{
						name: "{{ }}",
						markup: `<span>{{ item.n }}</span>`,
						read: (row: Element) => getTextContent(firstElementChild(row) as Element),
						expected: (n: number) => String(n),
					},
					{
						name: ":text",
						markup: `<span :text="item.n"></span>`,
						read: (row: Element) => getTextContent(firstElementChild(row) as Element),
						expected: (n: number) => String(n),
					},
					{
						name: ":attr:*",
						markup: `<span :attr:title="item.n"></span>`,
						// The htmlparser2 backend keeps the raw value, the DOM one stringifies it.
						read: (row: Element) =>
							String(getAttribute(firstElementChild(row) as ElementWithAttribs, "title")),
						expected: (n: number) => String(n),
					},
					{
						name: ":class",
						markup: `<span :class="'n-' + item.n"></span>`,
						read: (row: Element) =>
							getAttribute(firstElementChild(row) as ElementWithAttribs, "class"),
						expected: (n: number) => `n-${n}`,
					},
					{
						name: ":show",
						markup: `<span :show="item.n === 999"></span>`,
						read: (row: Element) => {
							const elem = firstElementChild(row) as HTMLElement;
							const style = elem.style?.display ?? getAttribute(elem, "style") ?? "";
							return style.includes("none") ? "hidden" : "visible";
						},
						expected: (n: number) => (n === 999 ? "visible" : "hidden"),
					},
				];

				for (const binding of bindings) {
					it(`re-renders a reused row when its item is mutated in place (${binding.name})`, async () => {
						// Issue #68: the row holds the very proxy the parent holds, so setting the loop
						// variable again is a no-op and only the object's own mutation can wake the row.
						const renderer = new ctor({ items: [{ id: 1, n: 100 }] });
						const html = `<div :for="item in items" :key="item.id">${binding.markup}</div>`;
						const fragment = renderer.parseHTML(html);
						await renderer.mount(fragment);
						await sleepForReactivity();

						const row = getRows(fragment)[0];
						assert.equal(binding.read(row), binding.expected(100));

						// Mutate the item without changing its identity or its key.
						renderer.$.items[0].n = 999;
						await sleepForReactivity();

						// Asserted on the row rather than on the fragment, so a row rendered twice
						// fails here instead of passing on the concatenated text.
						assert.equal(getRows(fragment).length, 1);
						assert.equal(getRows(fragment)[0], row, "Row node should be reused");
						assert.equal(binding.read(row), binding.expected(999));
					});

					it(`re-renders a reused row when the array is replaced with the same items (${binding.name})`, async () => {
						// Handing the loop a fresh array of the same objects is the most common update
						// in a mancha app, and the shape that hides a deep-mutation subscription leak.
						const renderer = new ctor({ items: [{ id: 1, n: 100 }] });
						const html = `<div :for="item in items" :key="item.id">${binding.markup}</div>`;
						const fragment = renderer.parseHTML(html);
						await renderer.mount(fragment);
						await sleepForReactivity();

						const row = getRows(fragment)[0];
						assert.equal(binding.read(row), binding.expected(100));

						// Mutate the item, then hand the loop a new array holding the same item refs.
						const items = renderer.$.items as { id: number; n: number }[];
						items[0].n = 999;
						renderer.$.items = [...items];
						await sleepForReactivity();

						assert.equal(getRows(fragment).length, 1);
						assert.equal(getRows(fragment)[0], row, "Row node should be reused");
						assert.equal(binding.read(row), binding.expected(999));
					});
				}

				it("re-renders a nested keyed row when the inner item is mutated in place", async () => {
					const renderer = new ctor({
						groups: [{ id: 0, kids: [{ id: 0, n: 1 }] }],
					});
					const html = `<div :for="g in groups" :key="g.id"><span :for="k in g.kids" :key="k.id" :text="k.n"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();
					await sleepForReactivity();

					const groups = renderer.$.groups as { kids: { n: number }[] }[];
					groups[0].kids[0].n = 7;
					await sleepForReactivity();
					await sleepForReactivity();

					// Asserted on the row, so a duplicated inner row fails instead of passing.
					const rows = getRows(fragment);
					assert.equal(rows.length, 1);
					assert.equal(getTextContent(rows[0])?.trim(), "7");
				});

				it("re-renders :data bindings when a shared object is mutated in place", async () => {
					// The :data expression yields the same object reference on every reconciliation,
					// so the reused row must be notified even though nothing changed identity.
					const renderer = new ctor({ items: [{ id: 1, meta: { n: 100 } }] });
					const html = `<div :for="item in items" :key="item.id" :data="{ m: item.meta }"><span :text="m.n"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();

					const row = getRows(fragment)[0];
					assert.equal(getTextContent(row), "100");

					renderer.$.items[0].meta.n = 999;
					await sleepForReactivity();

					assert.equal(getRows(fragment)[0], row, "Row node should be reused");
					assert.equal(getTextContent(row), "999");
				});

				// Negative guard. It also holds on a build without the #68 fix, where the row is
				// never woken at all, so what it documents is that the fix did not turn a dropped
				// row into one that keeps rendering.
				it("stops rendering a dropped row when its item is mutated later", async () => {
					const renderer = new ctor({ items: [{ id: 1, n: 1 }] });
					const html = `<div :for="item in items" :key="item.id"><span :text="item.n"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();

					const dropped = (renderer.$.items as { n: number }[])[0];
					renderer.$.items = [];
					await sleepForReactivity();
					await sleepForReactivity();
					assert.equal(getTextContent(fragment as unknown as Element)?.trim(), "");

					// The item outlives the row, but the disposed row must not react to it.
					dropped.n = 99;
					await sleepForReactivity();
					await sleepForReactivity();
					assert.equal(getTextContent(fragment as unknown as Element)?.trim(), "");
				});

				it("disposes the subrenderers nested inside a dropped row", async () => {
					// The inner :for creates a subrenderer per kid from the row's own subrenderer.
					// Nothing but the row disposal can ever reach those.
					let renders = 0;
					const renderer = new ctor({
						groups: [{ id: 0, kids: [{ id: 0, n: 1 }] }],
						show: (n: number) => {
							renders++;
							return n;
						},
					});
					const html = `<div :for="g in groups" :key="g.id"><span :for="k in g.kids" :key="k.id" :text="show(k.n)"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();
					await sleepForReactivity();

					const kids = (renderer.$.groups as { kids: { n: number }[] }[])[0].kids;
					renderer.$.groups = [];
					await sleepForReactivity();
					await sleepForReactivity();

					const before = renders;
					kids[0].n = 5;
					await sleepForReactivity();
					await sleepForReactivity();
					assert.equal(
						renders,
						before,
						"Nested subrenderer should not render after its row is dropped",
					);
				});

				it("renders a write-back that lands on an object woken earlier in the chain", async () => {
					// The mutation wakes `obj`, one observer derives a scalar from it, and a second
					// observer writes back to `obj`. That write is a new cascade, not a continuation
					// of the one that woke the observer, so the binding has to see it. Suppressing
					// it leaves the model and the DOM permanently disagreeing.
					const renderer = new ctor({ obj: { n: 0, tag: "x" }, trigger: 0 });
					const fragment = renderer.parseHTML(`<span :text="obj.tag"></span>`);
					await renderer.mount(fragment);

					renderer.effect(function (this: ReactiveContext) {
						const trigger = this.trigger as number;
						if (trigger > 0) (this.obj as { tag: string }).tag = `t${trigger}`;
					});
					renderer.effect(function (this: ReactiveContext) {
						const n = (this.obj as { n: number }).n;
						if (n > 0) this.trigger = n;
					});
					const settle = async () => {
						for (let i = 0; i < 10; i++) await sleepForReactivity();
					};
					await settle();

					(renderer.$.obj as { n: number }).n = 5;
					await settle();

					assert.equal((renderer.$.obj as { tag: string }).tag, "t5");
					assert.equal(getTextContent(fragment), "t5");
					renderer.dispose();
				});

				it("settles when a row expression writes back to its own item", async () => {
					// Render counters and last-seen stamps write to the item they render. The write
					// must not wake the row that made it, or the row renders forever.
					let calls = 0;
					const bump = (item: { n: number; renders?: number }) => {
						calls++;
						item.renders = (item.renders || 0) + 1;
						return item.n;
					};
					const renderer = new ctor({ items: [{ id: 1, n: 100 }], bump });
					const html = `<div :for="item in items" :key="item.id"><span :text="bump(item)"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					// Bounded waits, so a cycle shows up as growth instead of hanging the suite.
					const settle = async () => {
						for (let i = 0; i < 10; i++) await sleepForReactivity();
					};
					await settle();
					const settled = calls;
					await settle();

					// Stop the loop a regression would leave running, so this fails instead of hanging.
					renderer.dispose();
					assert.equal(calls, settled, "Row should stop re-rendering itself");
					// Pinned, so a run that settles only after rendering the row many times fails
					// here on the value instead of passing on stability alone.
					assert.equal(settled, 2);
					assert.equal(getTextContent(getRows(fragment)[0]), "100");
				});

				it("keeps rendering keyed rows that write to each other's items", async () => {
					// Documents an accepted limitation. A row that stamps a sibling's item makes the
					// sibling render, which stamps back: every pass produces a value neither row saw
					// before, so there is no state this can settle into and no scheduling policy can
					// make one. Other reactive systems raise a recursion error here; this one keeps
					// going. Rows like these only looked harmless while #68 meant they never
					// re-rendered at all.
					//
					// What this pins is that the churn stays confined: the rendered text remains
					// correct throughout, and tearing the renderer down stops it rather than leaving
					// a loop running. The observation window is a couple of debounce ticks, so a
					// regression fails here instead of hanging the suite.
					let calls = 0;
					const bump = (item: { id: number; n: number }, all: { stamp?: number }[]) => {
						calls++;
						const other = all[1 - item.id];
						other.stamp = (other.stamp || 0) + 1;
						return item.n;
					};
					const items = [
						{ id: 0, n: 10 },
						{ id: 1, n: 11 },
					];
					const renderer = new ctor({ items, bump });
					const html = `<div :for="item in items" :key="item.id"><span :text="bump(item, items)"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					const settle = async () => {
						for (let i = 0; i < 10; i++) await sleepForReactivity();
					};
					await settle();
					const spun = calls;
					await settle();
					assert.ok(calls > spun, `Expected the rows to keep waking each other, stuck at ${calls}`);

					// Disposing drops the subscriptions the rows hold, so only work already scheduled
					// still runs. Bounded rather than exact: what matters is that it stops.
					renderer.dispose();
					const atDispose = calls;
					await settle();
					assert.ok(
						calls - atDispose <= 10,
						`Disposing should stop the loop, got ${calls - atDispose} more renders`,
					);

					assert.equal(getTextContent(getRows(fragment)[0]), "10");
					assert.equal(getTextContent(getRows(fragment)[1]), "11");
				});

				it("stops waking rows that were dropped without being disposed", async () => {
					// Nested :for builds a subrenderer per inner row. A subscription outliving the
					// row, or a link left behind by an array the loop no longer holds, would make
					// every later mutation reach further than the last.
					const all = Array.from({ length: 12 }, (_, i) => ({
						id: i,
						kids: [
							{ id: 0, n: i },
							{ id: 1, n: i * 2 },
						],
					}));
					// Every store woken by a mutation calls notify() once, so counting those calls
					// measures how far a single mutation reaches. Counted through own properties on
					// this renderer and, via subrenderer(), on every row it builds. Patching the
					// shared prototype instead would leak the counter into every other test.
					let notifies = 0;
					let counting = false;
					const instrument = (target: IRenderer): IRenderer => {
						const notify = target.notify.bind(target);
						target.notify = (key: string, ms?: number) => {
							if (counting) notifies++;
							return notify(key, ms);
						};
						const subrenderer = target.subrenderer.bind(target);
						target.subrenderer = () => instrument(subrenderer());
						return target;
					};

					const renderer = instrument(new ctor({ all, shown: all.slice(0, 3) }));
					const html = `<div :for="item in shown" :key="item.id"><span :for="kid in item.kids" :key="kid.id" :text="kid.n"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();

					const costOfOneMutation = async (): Promise<number> => {
						notifies = 0;
						counting = true;
						all[0].kids[0].n += 1;
						await sleepForReactivity();
						await sleepForReactivity();
						counting = false;
						return notifies;
					};

					try {
						const before = await costOfOneMutation();
						assert.ok(before > 0, "Counter saw no notify at all, so it measures nothing");
						// Slide the window so every row is built and dropped several times over.
						for (let cycle = 1; cycle <= 24; cycle++) {
							renderer.$.shown = all.slice(cycle % 9, (cycle % 9) + 3);
							await sleepForReactivity();
						}
						renderer.$.shown = all.slice(0, 3);
						await sleepForReactivity();

						// Links left by an array the loop no longer holds are dropped the next time
						// the object is mutated, so the first mutation after the churn still pays for
						// clearing them out. Steady-state cost is what has to stay flat, so measure
						// the mutation after that one.
						const draining = await costOfOneMutation();
						const after = await costOfOneMutation();
						assert.ok(
							after <= before,
							`Mutation cost grew from ${before} to ${after} after churn (${draining} while draining)`,
						);
					} finally {
						renderer.dispose();
					}
				});

				it("leaves untouched rows alone when another item is replaced", async () => {
					let runs = 0;
					const track = (item: { n: number }) => {
						runs++;
						return item.n;
					};
					const items = Array.from({ length: 20 }, (_, i) => ({ id: i, n: i }));
					const renderer = new ctor({ items, track });
					const html = `<div :for="item in items" :key="item.id"><span :text="track(item)"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();

					// Replacing one item is O(1): the other 19 rows keep their rendered output.
					runs = 0;
					renderer.$.items[0] = { id: 0, n: 999 };
					await sleepForReactivity();
					await sleepForReactivity();

					assert.equal(runs, 1, "Only the replaced row should re-render");
					assert.equal(getTextContent(getRows(fragment)[0]), "999");
				});

				it("preserves an untouched row's :html subtree when another item is replaced", async () => {
					// :html rebuilds its children on every run, so a needless re-render is visible as
					// a destroyed subtree: lost focus, lost scroll position, restarted transitions.
					const renderer = new ctor({
						items: [
							{ id: 0, n: 0 },
							{ id: 1, n: 1 },
						],
					});
					const html = `<div :for="item in items" :key="item.id"><span :html="'<b>' + item.n + '</b>'"></span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);
					await sleepForReactivity();

					// :html replaces this child wholesale, so its identity tells us whether it ran.
					const host = firstElementChild(getRows(fragment)[1]) as Element;
					const subtree = host.firstChild;
					assert.equal(getTextContent(host), "1");

					renderer.$.items[0] = { id: 0, n: 999 };
					await sleepForReactivity();
					await sleepForReactivity();

					assert.equal(host.firstChild, subtree, "Untouched row's subtree should not be rebuilt");
					assert.equal(getTextContent(getRows(fragment)[0]), "999");
				});
			});
		});

		describe(":bind", () => {
			it("binds a text input value with existing store key", async function () {
				// Skip test if renderer does not support events.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Since we're dealing with events, we need to create a full document.
				const doc = globalThis.document.implementation.createHTMLDocument();
				// tsec-disable-next-line
				setInnerHTML(doc.body, `<input :bind="foo" />`);
				const node = doc.body.firstChild as HTMLInputElement;

				const renderer = new ctor();
				await renderer.set("foo", "bar");
				await renderer.mount(doc.body);

				// Processed attributes are removed.
				assert.equal(getAttribute(node, ":bind"), null);

				// Initial value is set.
				assert.equal(renderer.get("foo"), "bar");
				assert.equal(node.value, "bar");

				// Update the store value, and watch the node value react.
				await renderer.set("foo", "baz");
				assert.equal(node.value, "baz");

				// Update the node value, and watch the store value react.
				node.value = "qux";
				node.dispatchEvent(new globalThis.window.Event("change"));
				await sleepForReactivity();
				assert.equal(renderer.get("foo"), "qux");
			});

			it("binds to a text input value with undefined variable", async function () {
				// Skip test if renderer does not support events.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Since we're dealing with events, we need to create a full document.
				const doc = globalThis.document.implementation.createHTMLDocument();
				// tsec-disable-next-line
				setInnerHTML(doc.body, `<input :bind="foo" />`);

				// Value does not exist in store before mount().
				const renderer = new ctor();
				assert.equal(renderer.has("foo"), false);

				// After mount(), the value has been set in the store.
				await renderer.mount(doc.body);
				assert.equal(renderer.has("foo"), true);
			});

			it("binds a text input value with custom events", async function () {
				// Skip test if renderer does not support events.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Since we're dealing with events, we need to create a full document.
				const doc = globalThis.document.implementation.createHTMLDocument();
				// tsec-disable-next-line
				setInnerHTML(doc.body, `<input :bind="foo" :bind:on="my-custom-event" />`);
				const node = doc.body.firstChild as HTMLInputElement;

				const renderer = new ctor();
				renderer.set("foo", "bar");
				await renderer.mount(doc.body);

				// Processed attributes are removed.
				assert.equal(getAttribute(node, ":bind"), null);

				// Initial value is set.
				assert.equal(renderer.get("foo"), "bar");
				assert.equal(node.value, "bar");

				// Update the store value, and watch the node value react.
				await renderer.set("foo", "baz");
				assert.equal(node.value, "baz");

				// Update the node value, and watch the store value react only to the right event.
				node.value = "qux";
				node.dispatchEvent(new globalThis.window.Event("change"));
				await sleepForReactivity();
				assert.equal(renderer.get("foo"), "baz");
				node.dispatchEvent(new globalThis.window.Event("my-custom-event"));
				await sleepForReactivity();
				assert.equal(renderer.get("foo"), "qux");
			});

			it("binds select value when options are generated with :for", async function () {
				// Skip test if renderer does not support events.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Since we're dealing with events, we need to create a full document.
				const doc = globalThis.document.implementation.createHTMLDocument();
				// tsec-disable-next-line
				setInnerHTML(
					doc.body,
					`<select :bind="selected">
						<option :for="item in items" :attr:value="item.id">{{ item.name }}</option>
					</select>`,
				);
				const select = doc.body.firstChild as HTMLSelectElement;

				const renderer = new ctor();
				await renderer.set("items", [
					{ id: "apple", name: "Apple" },
					{ id: "banana", name: "Banana" },
					{ id: "cherry", name: "Cherry" },
				]);
				// Set the initial value to a non-first option.
				await renderer.set("selected", "banana");
				await renderer.mount(doc.body);

				// The select should reflect the bound value, not default to first option.
				assert.equal(select.value, "banana");
				assert.equal(renderer.get("selected"), "banana");
			});
		});

		describe(":show", () => {
			it("updates :show with compound expression after async state changes", async () => {
				// Reproduce the scenario from google-ads-account-picker:
				// 1. Mount HTML with :show="!error && items.length > 0"
				// 2. Simulate an async init function that sets state via the proxy ($.)
				// 3. Verify :show updates correctly after all state changes settle
				const renderer = new ctor();
				const html = `<div :show="!error && items.length > 0">Content</div>`;
				const fragment = renderer.parseHTML(html);

				// Mount first (processes :show directive, registers effect).
				await renderer.mount(fragment);

				const node = fragment.firstChild as HTMLElement;

				// After mount, items is auto-initialized to undefined, so :show should be hidden.
				assert.equal(
					((node as HTMLElement).style?.display ??
						getAttribute(node as Element, "style")?.includes("none"))
						? "none"
						: "",
					"none",
					"should be hidden initially",
				);

				// Simulate the async init pattern from main.ts:
				// Uses proxy setter ($.) which does NOT await set().
				const $ = renderer.$;
				$.error = null;
				$.items = [];

				// Wait for debounced notifications to settle.
				await sleepForReactivity();

				// Now simulate the async API response setting items.
				$.items = ["a", "b", "c"];

				// Wait for debounced notifications to settle.
				await sleepForReactivity();

				// :show should now be visible.
				const display =
					(node as HTMLElement).style?.display ??
					getAttribute(node as Element, "style")
						?.replace(/.*display:\s*/, "")
						.replace(/;.*/, "") ??
					"";
				assert.notEqual(
					display,
					"none",
					`should be visible after items are set (display: '${display}')`,
				);
			});

			it("updates :show via proxy setter (fire-and-forget set)", async () => {
				// Minimal repro: proxy setter $.prop = value doesn't await set().
				// This tests that the debounced notification still works.
				const renderer = new ctor();
				const html = `<div :show="items.length > 0" />`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment);

				const node = fragment.firstChild as HTMLElement;
				const getDisplay = () =>
					(node as HTMLElement).style?.display ??
					getAttribute(node as Element, "style")
						?.replace(/.*display:\s*/, "")
						.replace(/;.*/, "") ??
					"";

				// Initially hidden (items is undefined, .length throws, eval returns null → falsy).
				assert.equal(
					getDisplay() === "none" || getDisplay() === "" ? "none" : getDisplay(),
					"none",
				);

				// Set via proxy (fire-and-forget, not awaited).
				renderer.$.items = [1, 2, 3];

				// Wait for debounced notification.
				await sleepForReactivity();

				assert.notEqual(
					getDisplay(),
					"none",
					"element should be visible after setting items via proxy",
				);
			});

			it("shows then hides an element", async () => {
				const renderer = new ctor();
				const html = `<div :show="foo" />`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;

				renderer.set("foo", true);
				await renderer.mount(fragment);

				assert.ok(!node.hasAttribute?.(":show"));
				assert.notEqual(getAttribute(node, "style"), "display: none;");
				assert.notEqual((node as HTMLElement).style?.display, "none");

				await renderer.set("foo", false);
				assert.equal(getAttribute(node, "style"), "display: none;");
				assert.equal((node as HTMLElement).style?.display ?? "none", "none");
			});

			it("hides then shows an element", async () => {
				const renderer = new ctor();
				const html = `<div :show="foo" style="display: table;" />`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;

				renderer.set("foo", false);
				await renderer.mount(fragment);

				assert.ok(!node.hasAttribute?.(":show"));
				assert.equal(getAttribute(node, "style"), "display: none;");
				assert.equal((node as HTMLElement).style?.display ?? "none", "none");

				await renderer.set("foo", true);
				assert.equal(getAttribute(node, "style"), "display: table;");
				assert.equal((node as HTMLElement).style?.display ?? "table", "table");
			});

			it("hides an element based on data from the same element", async () => {
				const renderer = new ctor();
				const html = `<div :data="{ show: false }" :show="show" />`;
				const fragment = renderer.parseHTML(html);
				const node = fragment.firstChild as HTMLElement;

				await renderer.mount(fragment);
				const subrenderer = (node as unknown as { renderer: IRenderer }).renderer;

				assert.ok(!node.hasAttribute?.(":show"));
				assert.equal(getAttribute(node, "style"), "display: none;");
				assert.equal((node as HTMLElement).style?.display ?? "none", "none");

				await subrenderer.set("show", true);
				assert.notEqual(getAttribute(node, "style"), "display: none;");
				assert.notEqual((node as HTMLElement).style?.display, "none");
			});
		});

		describe(":if", () => {
			it("removes element when condition is false", async () => {
				const renderer = new ctor();
				const html = '<div :if="false">Content</div>';
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);
				assert.equal(getTextContent(fragment as unknown as Element), "");
				assert.equal(fragment.childNodes[0].nodeType, 8);
			});

			it("shows element when condition is true", async () => {
				const renderer = new ctor();
				const html = '<div :if="true">Content</div>';
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);
				await renderer.mount(fragment);
				assert.equal(getTextContent(fragment as unknown as Element), "Content");
				assert.equal(
					firstElementChild(fragment as unknown as Element)?.tagName.toUpperCase(),
					"DIV",
				);
			});

			it("toggles element visibility reactively", async () => {
				const renderer = new ctor({ show: true });
				const html = '<div :if="show">Content</div>';
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);
				assert.equal(getTextContent(fragment as unknown as Element), "Content");

				await renderer.set("show", false);
				assert.equal(getTextContent(fragment as unknown as Element), "");

				await renderer.set("show", true);
				assert.equal(getTextContent(fragment as unknown as Element), "Content");
			});

			it("preserves order of multiple elements", async () => {
				const renderer = new ctor({ cond1: true, cond2: true });
				const html = 'Start<div :if="cond1">1</div><div :if="cond2">2</div>End';
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);
				assert.equal(getTextContent(fragment as unknown as Element), "Start12End");

				await renderer.set("cond1", false);
				assert.equal(getTextContent(fragment as unknown as Element), "Start2End");

				await renderer.set("cond2", false);
				assert.equal(getTextContent(fragment as unknown as Element), "StartEnd");

				await renderer.set("cond2", true);
				assert.equal(getTextContent(fragment as unknown as Element), "Start2End");

				await renderer.set("cond1", true);
				assert.equal(getTextContent(fragment as unknown as Element), "Start12End");
			});

			it("works combined with :for loop", async () => {
				const renderer = new ctor({ items: [1, 2, 3] });
				const html = '<span :for="i in items" :if="i % 2 !== 0">{{ i }}</span>';
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);
				assert.equal(getTextContent(fragment as unknown as Element), "13");
			});

			it("reacts to parent variable changes with :for and :if combined", async () => {
				// Issue #7: Elements should be properly removed when :if condition becomes false
				const renderer = new ctor({
					selected: "apple",
					items: [
						{ id: "apple", name: "Apple", hidden: false },
						{ id: "banana", name: "Banana", hidden: false },
						{ id: "secret", name: "Secret", hidden: true },
					],
				});
				// Using selected without $parent to match the actual issue
				const html =
					'<span :for="item in items" :if="!item.hidden || item.id === selected">{{ item.name }}</span>';
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment);

				// Initially, only apple and banana should be visible (secret is hidden)
				assert.equal(getTextContent(fragment as unknown as Element), "AppleBanana");

				// Change selection to banana - secret should still be hidden
				await renderer.set("selected", "banana");
				assert.equal(getTextContent(fragment as unknown as Element), "AppleBanana");

				// Change back to apple - secret should still be hidden
				await renderer.set("selected", "apple");
				assert.equal(getTextContent(fragment as unknown as Element), "AppleBanana");
			});
		});

		it("reacts to changes within :for loop items", async () => {
			const renderer = new ctor({
				items: [
					{ val: 1, show: true },
					{ val: 2, show: false },
				],
			});
			const html = '<span :for="i in items" :if="i.show">{{ i.val }}</span>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);
			assert.equal(getTextContent(fragment as unknown as Element), "1");

			await renderer.set("items", [
				{ val: 1, show: true },
				{ val: 2, show: true },
			]);
			assert.equal(getTextContent(fragment as unknown as Element), "12");
		});

		it("reacts to nested property changes via parent proxy (issue #22)", async () => {
			// Issue #22: Nested property changes should trigger reactivity in subrenderers.
			const renderer = new ctor({
				items: [
					{ name: "a", visible: false },
					{ name: "b", visible: true },
				],
			});
			const html = '<span :for="item in items" :if="item.visible">{{ item.name }}</span>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Initially only "b" is visible
			assert.equal(getTextContent(fragment as unknown as Element), "b");

			// Modifying nested property via parent proxy SHOULD trigger the :for effect
			renderer.$.items[0].visible = true;
			await sleepForReactivity();
			// Now both "a" and "b" should be visible
			assert.equal(getTextContent(fragment as unknown as Element), "ab");
		});

		it("cleans up properly when :if toggles and then items array changes", async () => {
			// Regression test: ensure elements are properly tracked for cleanup
			// when :if toggles elements back ON before the items array changes.
			const renderer = new ctor({
				items: [
					{ val: "a", show: false },
					{ val: "b", show: true },
				],
			});
			const html = '<span :for="i in items" :if="i.show">{{ i.val }}</span>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Initially only "b" is visible
			assert.equal(getTextContent(fragment as unknown as Element), "b");

			// Toggle "a" to visible by replacing the items array with updated values
			await renderer.set("items", [
				{ val: "a", show: true },
				{ val: "b", show: true },
			]);
			assert.equal(getTextContent(fragment as unknown as Element), "ab");

			// Now change the items array entirely - all old elements should be cleaned up
			renderer.$.items = [{ val: "x", show: true }];
			await sleepForReactivity();

			// Should only have "x", not "ab" + "x" (which would indicate orphaned elements)
			const spans = Array.from(fragment.childNodes).filter(
				(n) => (n as Element).tagName?.toLowerCase() === "span",
			);
			assert.equal(spans.length, 1);
			assert.equal(getTextContent(fragment as unknown as Element), "x");
		});

		it(":for inside :if re-renders when state updates after :if becomes true (issue #31)", async () => {
			// Issue #31 Bug 2: When :for is inside an :if block, and state is updated
			// asynchronously after mount, the :for loop should re-render when both
			// the :if condition becomes true AND the items array changes.
			const renderer = new ctor({ screen: "loading", items: [] });

			// Use a wrapper div for the :if, with :for inside
			const html = `<div :if="screen === 'loaded'"><span :for="item in items">{{ item.name }}</span></div>`;
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Helper to get the container and items
			const getContainer = () =>
				Array.from(fragment.childNodes).find(
					(n) => (n as Element).tagName?.toLowerCase() === "div",
				) as Element | undefined;
			const getItems = () => {
				const container = getContainer();
				if (!container) return [];
				return Array.from(container.childNodes).filter(
					(n) => (n as Element).tagName?.toLowerCase() === "span",
				);
			};

			// Initially the container is hidden (replaced by placeholder)
			// The :for hasn't rendered anything yet
			assert.equal(getItems().length, 0);

			// Simulate async data load: update items AND switch screen
			renderer.$.items = [{ name: "Item 1" }, { name: "Item 2" }, { name: "Item 3" }];
			renderer.$.screen = "loaded";

			await sleepForReactivity();

			// The :for loop should have rendered 3 items
			const items = getItems();
			assert.equal(items.length, 3, `Expected 3 items, got ${items.length}`);

			// Verify content
			const texts = items.map((item) => getTextContent(item as Element)?.trim());
			assert.deepEqual(texts, ["Item 1", "Item 2", "Item 3"]);
		});

		it(":for inside :if handles state set before :if becomes true (issue #31)", async () => {
			// Issue #31 Bug 2 variant: Items are set BEFORE the :if condition becomes true
			const renderer = new ctor({ screen: "loading", items: [] });

			const html = `<div :if="screen === 'loaded'"><span :for="item in items">{{ item.name }}</span></div>`;
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const getContainer = () =>
				Array.from(fragment.childNodes).find(
					(n) => (n as Element).tagName?.toLowerCase() === "div",
				) as Element | undefined;
			const getItems = () => {
				const container = getContainer();
				if (!container) return [];
				return Array.from(container.childNodes).filter(
					(n) => (n as Element).tagName?.toLowerCase() === "span",
				);
			};

			// Set items first, THEN change screen
			renderer.$.items = [{ name: "A" }, { name: "B" }];
			await sleepForReactivity();

			// Still loading, no items visible (container hidden)
			assert.equal(getItems().length, 0);

			// Now switch to loaded
			renderer.$.screen = "loaded";
			await sleepForReactivity();

			// Items should now be visible
			const items = getItems();
			assert.equal(items.length, 2, `Expected 2 items, got ${items.length}`);
		});
	});

	describe(":text", () => {
		it("render simple text string", async () => {
			const renderer = new ctor({ foo: "bar" });
			const html = `<div :text="foo"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(node, ":text"), null);
			assert.equal(renderer.get("foo"), "bar");
			assert.equal(getTextContent(node), "bar");
		});

		it("render positive number", async () => {
			const renderer = new ctor({ counter: 42 });
			const html = `<div :text="counter"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "42");
		});

		it("render zero", async () => {
			const renderer = new ctor({ counter: 0 });
			const html = `<div :text="counter"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "0");
		});

		it("render negative number", async () => {
			const renderer = new ctor({ value: -123 });
			const html = `<div :text="value"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "-123");
		});

		it("render floating point number", async () => {
			const renderer = new ctor({ value: 1.5 });
			const html = `<div :text="value"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "1.5");
		});

		it("render boolean true", async () => {
			const renderer = new ctor({ flag: true });
			const html = `<div :text="flag"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "true");
		});

		it("render boolean false", async () => {
			const renderer = new ctor({ flag: false });
			const html = `<div :text="flag"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "false");
		});

		it("render null as empty string", async () => {
			const renderer = new ctor({ value: null });
			const html = `<div :text="value"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "");
		});

		it("render undefined as empty string", async () => {
			const renderer = new ctor({ value: undefined });
			const html = `<div :text="value"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "");
		});

		it("render empty string", async () => {
			const renderer = new ctor({ value: "" });
			const html = `<div :text="value"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "");
		});

		it("render expression result as number", async () => {
			const renderer = new ctor({ a: 10, b: 5 });
			const html = `<div :text="a + b"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "15");
		});

		it("updates reactively when number changes", async () => {
			const renderer = new ctor({ counter: 1 });
			const html = `<div :text="counter"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "1");

			await renderer.set("counter", 2);
			assert.equal(getTextContent(node), "2");

			await renderer.set("counter", 0);
			assert.equal(getTextContent(node), "0");
		});
	});

	describe(":text output re-entry (#104)", () => {
		// Flips a global flag if the value it lives in is ever evaluated rather than printed.
		const flag = "__mancha104Ran";
		const payload = `{{ (0).constructor.constructor("globalThis.${flag} = true; return 1")() }}`;
		const globals = globalThis as unknown as Record<string, boolean>;

		beforeEach(() => {
			globals[flag] = false;
		});

		it(":text does not evaluate the value it just wrote", async () => {
			const renderer = new ctor();
			await renderer.set("c", payload);
			const fragment = renderer.parseHTML(`<p :text="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			assert.equal(globals[flag], false, "store value must not be executed");
			assert.equal(getTextContent(node), payload);
		});

		it("{{ }} substitution still treats the value as data", async () => {
			const renderer = new ctor();
			await renderer.set("c", payload);
			const fragment = renderer.parseHTML(`<p>{{ c }}</p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			assert.equal(globals[flag], false, "store value must not be executed");
			assert.equal(getTextContent(node), payload);
		});

		it(":text renders literal {{ }} verbatim", async () => {
			const renderer = new ctor({ c: "hello {{ world }}" });
			const fragment = renderer.parseHTML(`<p :text="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			assert.equal(getTextContent(node), "hello {{ world }}");
		});

		it(":text still updates when its dependency changes after mount", async () => {
			const renderer = new ctor({ c: "before" });
			const fragment = renderer.parseHTML(`<p :text="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "before");

			await renderer.set("c", "after");
			assert.equal(getTextContent(node), "after");

			// A value assigned after mount is data too, braces included.
			await renderer.set("c", "{{ world }}");
			assert.equal(getTextContent(node), "{{ world }}");
			assert.equal(globals[flag], false);
		});

		it("{{ }} interpolation is still reactive after mount", async () => {
			const renderer = new ctor({ c: "before" });
			const fragment = renderer.parseHTML(`<p>{{ c }}</p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "before");

			await renderer.set("c", "after");
			assert.equal(getTextContent(node), "after");
		});

		it("a sibling text node next to a :text element is still interpolated", async () => {
			const renderer = new ctor({ a: "A", b: "B" });
			const fragment = renderer.parseHTML(`<div><span :text="a"></span>{{ b }}</div>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			assert.equal(getTextContent(node), "AB");
		});
	});

	describe(":html", () => {
		it("render simple HTML", async () => {
			const renderer = new ctor();
			const html = `<div :html="foo" />`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;

			const inner = "<div>bar</div>";
			renderer.set("foo", inner);
			await renderer.mount(fragment);
			assert.equal(innerHTML(node), inner);
			assert.equal(node.childNodes.length, 1);
		});

		it("render contents of HTML", async () => {
			const renderer = new ctor();
			const html = `<div :html="foo"></div>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;

			const inner = "<div>{{ bar }}</div>";
			renderer.set("foo", inner);
			renderer.set("bar", "Hello World");
			await renderer.mount(fragment);
			assert.equal(getTextContent(node.firstChild?.firstChild as Element), "Hello World");

			// Modify content and observe changes.
			await renderer.set("bar", "Goodbye World");
			assert.equal(getTextContent(node.firstChild?.firstChild as Element), "Goodbye World");
		});

		it("render HTML within a :for", async () => {
			const renderer = new ctor();
			const html = `<div :for="item in items" :html="$parent.inner"></div>`;
			const fragment = renderer.parseHTML(html);

			renderer.set("items", [{ text: "foo" }, { text: "bar" }]);
			renderer.set("inner", `<span :text="item.text"></span>`);
			await renderer.mount(fragment);

			const children = Array.from(fragment.childNodes).slice(1);
			assert.equal(children.length, 2);
			assert.equal(getTextContent(children[0] as Element), "foo");
			assert.equal(getTextContent(children[1] as Element), "bar");
		});
	});

	describe(":html content double evaluation (#109)", () => {
		it("evaluates the inserted content exactly once", async () => {
			const renderer = new ctor();
			await renderer.set("c", "<span>{{ x }}</span>");
			await renderer.set("x", "{{ y }}");
			await renderer.set("y", "boom");
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			// One pass turns {{ x }} into the string "{{ y }}"; a second pass would reach "boom".
			assert.equal(getTextContent(node), "{{ y }}");
		});

		it("evaluates content nested deep in the subtree exactly once", async () => {
			const renderer = new ctor();
			await renderer.set("c", "<div><section><span>{{ x }}</span></section></div>");
			await renderer.set("x", "{{ y }}");
			await renderer.set("y", "boom");
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			assert.equal(getTextContent(node), "{{ y }}");
		});

		it("still evaluates content once after the dependency changes twice", async () => {
			const renderer = new ctor();
			await renderer.set("c", "<span>{{ x }}</span>");
			await renderer.set("x", "first");
			await renderer.set("y", "boom");
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "first");

			// First update: the content expression itself changes.
			await renderer.set("c", "<span>second: {{ x }}</span>");
			assert.equal(getTextContent(node), "second: first");

			// Second update: the result legitimately contains braces, which must survive.
			await renderer.set("x", "{{ y }}");
			assert.equal(getTextContent(node), "second: {{ y }}");
		});

		it("keeps a nested :text inside the content working and reactive", async () => {
			const renderer = new ctor();
			await renderer.set("label", "one");
			await renderer.set("y", "boom");
			await renderer.set("c", `<em :text="label"></em>`);
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getTextContent(node), "one");

			await renderer.set("label", "two");
			assert.equal(getTextContent(node), "two");

			// The nested :text writes data, so braces in the value stay verbatim.
			await renderer.set("label", "{{ y }}");
			assert.equal(getTextContent(node), "{{ y }}");
		});

		it("still runs a nested :for inside the content", async () => {
			const renderer = new ctor();
			await renderer.set("items", ["a", "b"]);
			await renderer.set("c", `<span :for="item in items" :text="item"></span>`);
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			assert.equal(getTextContent(node), "ab");
		});

		it("does not accumulate skipped nodes as the content is replaced", async () => {
			const renderer = new ctor();
			await renderer.set("c", "<span>0</span>");
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);

			const afterMount = renderer._skipNodes.size;
			for (let i = 1; i <= 10; i++) await renderer.set("c", `<span>${i}</span>`);
			await sleepForReactivity();

			// Each run replaces the previous content, so the bookkeeping must not grow with it.
			assert.equal(getTextContent(node), "10");
			assert.equal(renderer._skipNodes.size, afterMount);
		});

		it("does not accumulate skipped nodes when a nested :for swaps its rows", async () => {
			const renderer = new ctor();
			await renderer.set("items", ["a", "b"]);
			await renderer.set("c", '<span :for="i in items" :text="i"></span><b>0</b>');
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			await renderer.mount(fragment);

			// :for detaches the rows :html marked, so unmarking whatever is live at the time of
			// the next replacement leaves the originals behind for good.
			const afterMount = renderer._skipNodes.size;
			for (let i = 1; i <= 6; i++) {
				await renderer.set("items", ["a", "b", `x${i}`]);
				await sleepForReactivity();
				await renderer.set("items", ["a", "b"]);
				await sleepForReactivity();
				await renderer.set("c", `<span :for="i in items" :text="i"></span><b>${i}</b>`);
				await sleepForReactivity();
			}

			assert.equal(renderer._skipNodes.size, afterMount);
		});
	});

	describe(":for inside :html content (#109)", () => {
		// The rows sit next to the :for template, whose parent differs per implementation.
		function rowTexts(root: Node): (string | null)[] {
			const template = Array.from(traverse(root)).find(
				(found) => (found as Element).tagName?.toLowerCase() === "template",
			);
			assert.ok(template, ":for template not found");
			const siblings = Array.from((template as Node).parentNode?.childNodes || []);
			return siblings.filter((n) => n !== template).map((n) => getTextContent(n as Element));
		}

		it("keeps the rows when items grow after mount", async () => {
			const renderer = new ctor();
			await renderer.set("items", ["a", "b"]);
			await renderer.set("c", `<span :for="i in items" :text="i"></span>`);
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.deepEqual(rowTexts(node), ["a", "b"]);

			await renderer.set("items", ["a", "b", "z"]);
			await sleepForReactivity();

			assert.deepEqual(rowTexts(node), ["a", "b", "z"]);
			assert.equal(getTextContent(node), "abz");
		});

		it("keeps the rows when items shrink after mount", async () => {
			const renderer = new ctor();
			await renderer.set("items", ["a", "b", "z"]);
			await renderer.set("c", `<span :for="i in items" :text="i"></span>`);
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.deepEqual(rowTexts(node), ["a", "b", "z"]);

			await renderer.set("items", ["a"]);
			await sleepForReactivity();

			assert.deepEqual(rowTexts(node), ["a"]);
			assert.equal(getTextContent(node), "a");
		});

		it("keeps the rows when a keyed :for changes after mount", async () => {
			const renderer = new ctor();
			await renderer.set("items", ["a", "b"]);
			await renderer.set("c", `<span :for="i in items" :key="i" :text="i"></span>`);
			const fragment = renderer.parseHTML(`<p :html="c"></p>`);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.deepEqual(rowTexts(node), ["a", "b"]);

			await renderer.set("items", ["a", "b", "z"]);
			await sleepForReactivity();

			assert.deepEqual(rowTexts(node), ["a", "b", "z"]);
			assert.equal(getTextContent(node), "abz");
		});
	});

	describe("observer cleanup (memory leak prevention)", () => {
		it(":for cleans up observers when items are removed", async () => {
			const renderer = new ctor({
				items: [{ name: "a" }, { name: "b" }, { name: "c" }],
			});
			const html = '<span :for="item in items" :text="item.name"></span>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Get initial observer count.
			const initialStats = renderer.getObserverStats();
			const initialCount = initialStats.totalObservers;

			// Remove all items.
			await renderer.set("items", []);
			await sleepForReactivity();

			// Trigger a notification to activate lazy cleanup.
			await renderer.set("items", [{ name: "x" }]);
			await sleepForReactivity();

			// Observer count should not have grown significantly.
			// The old subrenderers' observers should have been cleaned up.
			const afterStats = renderer.getObserverStats();

			// We should have roughly the same number of observers (or fewer),
			// not 3x as many from accumulated stale observers.
			assert.ok(
				afterStats.totalObservers <= initialCount + 2,
				`Expected observers to be cleaned up. Initial: ${initialCount}, After: ${afterStats.totalObservers}`,
			);
		});

		it(":for cleans up observers after multiple add/remove cycles", async () => {
			const renderer = new ctor({ items: [] });
			const html = '<span :for="item in items" :text="item.name"></span>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Perform multiple add/remove cycles.
			for (let cycle = 0; cycle < 5; cycle++) {
				// Add items.
				await renderer.set(
					"items",
					Array.from({ length: 10 }, (_, i) => ({ name: `item-${cycle}-${i}` })),
				);
				await sleepForReactivity();

				// Remove items.
				await renderer.set("items", []);
				await sleepForReactivity();
			}

			// Trigger cleanup by adding one item.
			await renderer.set("items", [{ name: "final" }]);
			await sleepForReactivity();

			// After 5 cycles of 10 items each, without cleanup we'd have 50+ stale observers.
			// With cleanup, we should have just a few.
			const stats = renderer.getObserverStats();
			assert.ok(
				stats.totalObservers < 20,
				`Expected cleanup to prevent observer accumulation. Got: ${stats.totalObservers}`,
			);
		});

		it(":html cleans up observers when content changes", async () => {
			const renderer = new ctor({
				content: '<span :text="value">initial</span>',
				value: "test1",
			});
			const html = '<div :html="content"></div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const initialStats = renderer.getObserverStats();
			const initialCount = initialStats.totalObservers;

			// Change content multiple times.
			for (let i = 0; i < 5; i++) {
				await renderer.set("content", `<span :text="value">v${i}</span>`);
				await sleepForReactivity();
			}

			// Trigger value change to activate any remaining observers.
			await renderer.set("value", "final");
			await sleepForReactivity();

			const afterStats = renderer.getObserverStats();

			// Without cleanup, we'd accumulate observers from each content change.
			// With cleanup (via dispose), observer count should be stable.
			assert.ok(
				afterStats.totalObservers <= initialCount + 5,
				`Expected :html to clean up old observers. Initial: ${initialCount}, After: ${afterStats.totalObservers}`,
			);
		});

		it(":html disposes subrenderer when content is replaced", async () => {
			const renderer = new ctor({
				content: "<span>{{ counter }}</span>",
				counter: "initial",
			});
			const html = '<div :html="content"></div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Verify initial content works.
			const div = fragment.firstChild as HTMLElement;
			assert.equal(getTextContent(div), "initial");

			// Update counter - should reflect.
			await renderer.set("counter", "updated");
			await sleepForReactivity();
			assert.equal(getTextContent(div), "updated");

			// Replace content entirely.
			await renderer.set("content", "<span>static</span>");
			await sleepForReactivity();
			assert.equal(getTextContent(div), "static");

			// Update counter - old content observer should be disposed,
			// so this shouldn't affect anything.
			await renderer.set("counter", "should-not-appear");
			await sleepForReactivity();
			assert.equal(
				getTextContent(div),
				"static",
				"Old observer should be disposed and not update removed content",
			);
		});

		it("nested :for inside :for cleans up inner observers", async () => {
			const renderer = new ctor({
				outer: [{ inner: [{ val: "a" }, { val: "b" }] }, { inner: [{ val: "c" }] }],
			});
			const html = '<div :for="o in outer"><span :for="i in o.inner" :text="i.val"></span></div>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const initialStats = renderer.getObserverStats();

			// Replace outer array completely.
			await renderer.set("outer", [{ inner: [{ val: "x" }] }]);
			await sleepForReactivity();

			// Trigger another change to activate cleanup.
			await renderer.set("outer", [{ inner: [{ val: "y" }, { val: "z" }] }]);
			await sleepForReactivity();

			const afterStats = renderer.getObserverStats();

			// Should not accumulate observers from removed nested loops.
			assert.ok(
				afterStats.totalObservers <= initialStats.totalObservers + 5,
				`Expected nested cleanup. Initial: ${initialStats.totalObservers}, After: ${afterStats.totalObservers}`,
			);
		});

		it(":for with :text inside cleans up text observers", async () => {
			const renderer = new ctor({ items: ["a", "b", "c"] });
			const html = '<span :for="item in items" :text="item"></span>';
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Clear and re-add items multiple times.
			for (let i = 0; i < 3; i++) {
				await renderer.set("items", []);
				await sleepForReactivity();
				await renderer.set("items", ["x", "y"]);
				await sleepForReactivity();
			}

			const stats = renderer.getObserverStats();

			// Should have cleaned up observers from removed items.
			// Without cleanup: 3 initial + (3 cycles * 3 items) = 12+ observers for "item".
			// With cleanup: should stabilize around the current item count.
			assert.ok(
				stats.totalObservers < 15,
				`Expected text observers to be cleaned up. Got: ${stats.totalObservers}`,
			);
		});
	});

	describe(":attr", () => {
		it("processes href attribute", async () => {
			const renderer = new ctor({ foo: "example.com" });
			const html = `<a :attr:href="foo"></a>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(node, ":attr:href"), null);
			assert.equal(getAttribute(node, "href"), "example.com");
		});
		it("processes custom attribute", async () => {
			const renderer = new ctor({ foo: "example.com" });
			const html = `<a :attr:custom-attr="foo"></a>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(node, ":attr:custom-attr"), null);
			assert.equal(getAttribute(node, "custom-attr"), "example.com");
		});
	});

	describe(":prop", () => {
		it("processes disabled property", async () => {
			const renderer = new ctor({ foo: true });
			const html = `<option :prop:disabled="foo">value</option>`;
			const fragment = renderer.parseHTML(html);
			const elem = fragment.firstChild as HTMLButtonElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(elem, ":prop:disabled"), null);
			assert.equal(elem.disabled, true);
		});
		it("processes href property", async () => {
			const renderer = new ctor({ foo: "https://example.com/" });
			const html = `<a :prop:href="foo"></a>`;
			const fragment = renderer.parseHTML(html);
			const elem = fragment.firstChild as HTMLAnchorElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(elem, ":prop:href"), null);
			assert.equal(elem.href, "https://example.com/");
		});
		it("processes custom property", async () => {
			const renderer = new ctor({ foo: "example.com" });
			const html = `<a :prop:custom-prop="foo"></a>`;
			const fragment = renderer.parseHTML(html);
			const node = fragment.firstChild as HTMLElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(node, "custom-prop"), null);
			assert.equal((node as unknown as { customProp: string }).customProp, "example.com");
		});
	});

	describe(":stripTypes plugin", () => {
		it("strips :types attribute after rendering", async () => {
			const renderer = new ctor({ name: "John" });
			const html = `<div :types='{"name": "string"}'><span>{{ name }}</span></div>`;
			const fragment = renderer.parseHTML(html);
			const elem = fragment.firstChild as HTMLElement;

			await renderer.mount(fragment);

			// Verify :types attribute is removed after rendering
			assert.equal(getAttribute(elem, ":types"), null);
		});

		it("strips data-types attribute after rendering", async () => {
			const renderer = new ctor({ name: "Jane" });
			const html = `<div data-types='{"name": "string"}'><span>{{ name }}</span></div>`;
			const fragment = renderer.parseHTML(html);
			const elem = fragment.firstChild as HTMLElement;

			await renderer.mount(fragment);

			// Verify data-types attribute is removed after rendering
			assert.equal(getAttribute(elem, "data-types"), null);
		});

		it("strips types from nested elements", async () => {
			const renderer = new ctor({ name: "Bob", age: 30 });
			const html = `
          <div :types='{"name": "string"}'>
            <span>{{ name }}</span>
            <div data-types='{"age": "number"}'>
              <span>{{ age }}</span>
            </div>
          </div>
        `;
			const fragment = renderer.parseHTML(html);

			await renderer.mount(fragment);

			// Verify all types attributes are removed using traverse
			for (const node of traverse(fragment)) {
				const elem = node as Element;
				assert.equal(getAttribute(elem, ":types"), null, "Should not have :types");
				assert.equal(getAttribute(elem, "data-types"), null, "Should not have data-types");
			}
		});
	});

	describe("$resolve", () => {
		it("is accessible in :data expressions", async () => {
			// Mock API client.
			const api = {
				listUsers: () => Promise.resolve([{ name: "Alice" }, { name: "Bob" }]),
			};

			const renderer = new ctor({ api });
			const html = `<div :data="{ users: $resolve(api.listUsers) }"></div>`;
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Get the subrenderer's store.
			const elem = fragment.firstChild as unknown as { renderer: IRenderer };
			const el = elem as unknown as RenderedElement;
			if (!el.renderer) throw new Error("renderer missing");
			const subrenderer = el.renderer;

			// Verify the state object was created.
			const users = subrenderer.get("users") as StoreState;
			assert.ok(users, "users should be set");
			assert.equal(typeof users, "object", "users should be an object");
			assert.ok("$pending" in users, "users should have $pending");
			assert.ok("$result" in users, "users should have $result");
			assert.ok("$error" in users, "users should have $error");
		});

		it("passes options to the function", async () => {
			let receivedOptions: unknown = null;
			const api = {
				getUser: (opts: unknown) => {
					receivedOptions = opts;
					return Promise.resolve({ name: "Test" });
				},
			};

			const renderer = new ctor({ api, userId: "42" });
			const html = `<div :data="{ user: $resolve(api.getUser, { path: { id: userId } }) }"></div>`;
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			// Wait a tick for promise execution.
			await new Promise((resolve) => setTimeout(resolve, 10));

			assert.deepEqual(receivedOptions, { path: { id: "42" } });
		});

		it("state object updates after promise resolves", async () => {
			const api = {
				getData: () => Promise.resolve({ value: 123 }),
			};

			const renderer = new ctor({ api });
			const html = `<div :data="{ result: $resolve(api.getData) }"></div>`;
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const elem = fragment.firstChild as unknown as { renderer: IRenderer };
			const el = elem as unknown as RenderedElement;
			if (!el.renderer) throw new Error("renderer missing");
			const subrenderer = el.renderer;

			// Wait for promise to resolve.
			await new Promise((resolve) => setTimeout(resolve, 30));

			// State should be updated.
			// Verify the state object was created.
			const result = subrenderer.get("result") as StoreState | null;
			if (!result) throw new Error("result should be set");
			assert.equal(result.$pending, false);
			assert.deepEqual(result.$result, { value: 123 });
			assert.equal(result.$error, null);
		});

		it("state object updates after promise rejects", async () => {
			const api = {
				failingCall: () => Promise.reject(new Error("API Error")),
			};

			const renderer = new ctor({ api });
			const html = `<div :data="{ result: $resolve(api.failingCall) }"></div>`;
			const fragment = renderer.parseHTML(html);
			await renderer.mount(fragment);

			const elem = fragment.firstChild as unknown as { renderer: IRenderer };
			const el = elem as unknown as RenderedElement;
			if (!el.renderer) throw new Error("renderer missing");
			const subrenderer = el.renderer;
			const result = subrenderer.get("result") as StoreState | null;

			// Wait for promise to reject.
			await new Promise((resolve) => setTimeout(resolve, 30));

			// State should be updated.
			if (!result) throw new Error("result should be set");
			assert.equal(result.$pending, false);
			assert.equal(result.$result, null);
			assert.ok(result.$error instanceof Error);
			assert.equal((result.$error as Error).message, "API Error");
		});
	});

	describe(":render", () => {
		describe("path resolution (rebaseRelativePaths)", () => {
			it("resolves relative path with dirpath", async () => {
				const renderer = new ctor();
				const html = `<div :render="./init.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/components" });

				const elem = fragment.firstChild as Element;
				// Directives are readable in both :render and data-render spellings.
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				assert.equal(resolved, "/components/./init.js");
			});

			it("resolves relative path without leading ./", async () => {
				const renderer = new ctor();
				const html = `<div :render="init.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/components" });

				const elem = fragment.firstChild as Element;
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				assert.equal(resolved, "/components/init.js");
			});

			it("preserves absolute path starting with /", async () => {
				const renderer = new ctor();
				const html = `<div :render="/lib/init.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/components" });

				const elem = fragment.firstChild as Element;
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				assert.equal(resolved, "/lib/init.js");
			});

			it("preserves absolute URL with protocol", async () => {
				const renderer = new ctor();
				const html = `<div :render="https://cdn.example.com/init.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/components" });

				const elem = fragment.firstChild as Element;
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				assert.equal(resolved, "https://cdn.example.com/init.js");
			});

			it("handles missing dirpath param by using renderer default", async () => {
				const renderer = new ctor();
				const html = `<div :render="./init.js"></div>`;
				const fragment = renderer.parseHTML(html);

				// Don't pass dirpath - renderer will use its default.
				await renderer.preprocessNode(fragment, {});

				const elem = fragment.firstChild as Element;
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				// Renderer's default dirpath is used. For server it may be empty,
				// for browser it's based on location.href.
				assert.ok(
					resolved?.endsWith("./init.js"),
					`Expected path ending with ./init.js, got: ${resolved}`,
				);
			});

			it("works with data-render attribute", async () => {
				const renderer = new ctor();
				const html = `<div data-render="./init.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/components" });

				const elem = fragment.firstChild as Element;
				assert.equal(getAttribute(elem, "data-render"), "/components/./init.js");
			});

			it("resolves path inside custom component template", async () => {
				const renderer = new ctor();
				const html = `
            <template is="my-widget">
              <div :render="./widget.js" class="widget"></div>
            </template>
            <my-widget></my-widget>
          `;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/components" });

				// Find the resolved element by class (template is removed, my-widget is replaced).
				let resolvedElem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (
						(node as Element).className === "widget" ||
						getAttribute(node as Element, "class") === "widget"
					) {
						resolvedElem = node as Element;
						break;
					}
				}
				assert.ok(resolvedElem, "Should find element with class='widget'");
				const resolved =
					getAttribute(resolvedElem as Element, ":render") ||
					getAttribute(resolvedElem as Element, "data-render");
				assert.equal(resolved, "/components/./widget.js");
			});

			it("rebases paths before template is cloned (race condition test)", async () => {
				const renderer = new ctor();
				// Template with an img that has a relative src path.
				const html = `
            <template is="img-widget">
              <div class="container"><img src="./image.png" class="test-img"></div>
            </template>
            <img-widget></img-widget>
          `;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/assets" });

				// Find the cloned img element.
				let imgElem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (getAttribute(node as Element, "class") === "test-img") {
						imgElem = node as Element;
						break;
					}
				}
				assert.ok(imgElem, "Should find img element with class='test-img'");
				// The path should be rebased to /assets/./image.png.
				const src = getAttribute(imgElem as Element, "src");
				assert.equal(src, "/assets/./image.png", "img src should be rebased before cloning");
			});
		});

		describe("execution (rendering)", () => {
			it("removes :render attribute after execution attempt", async () => {
				const renderer = new ctor();
				const html = `<div :render="/nonexistent.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/" });
				await renderer.renderNode(fragment, {});

				const elem = fragment.firstChild as Element;
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				assert.equal(resolved, null);
			});

			it("removes data-render attribute after execution attempt", async () => {
				const renderer = new ctor();
				const html = `<div data-render="/nonexistent.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/" });
				await renderer.renderNode(fragment, {});

				const elem = fragment.firstChild as Element;
				assert.equal(getAttribute(elem, "data-render"), null);
			});

			it("removes :render from cloned elements in :for loop", async () => {
				const renderer = new ctor({ items: ["a", "b", "c"] });
				const html = `<div :for="item in items" :render="/nonexistent.js">{{ item }}</div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment);

				// :for keeps the original element hidden in a template and adds clones.
				// The clones should have :render removed (processed by their subrenderers).
				// The original (template) may still have :render since it's in skipNodes.
				let cloneCount = 0;
				for (const node of traverse(fragment)) {
					const elem = node as Element;
					if (elem.tagName?.toLowerCase() === "div") {
						// Skip the cloaked original element inside the template.
						if (getAttribute(elem, "data-m-cloak") !== null) continue;

						cloneCount++;
						const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
						assert.equal(resolved, null, "Each clone should have :render removed");
					}
				}
				// Should have 3 visible clones.
				assert.equal(cloneCount, 3, "Should have 3 div clones");
			});

			it("removes :render from nested elements", async () => {
				const renderer = new ctor();
				const html = `
            <div :render="/outer.js">
              <span :render="/inner.js"></span>
            </div>
          `;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/" });
				await renderer.renderNode(fragment, {});

				// Both outer and inner should have :render removed.
				for (const node of traverse(fragment)) {
					const elem = node as Element;
					const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
					assert.equal(resolved, null, `Element ${elem.tagName} should have :render removed`);
				}
			});

			it("removes :render even when element is hidden with :show=false", async () => {
				const renderer = new ctor({ visible: false });
				const html = `<div :show="visible" :render="/nonexistent.js"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment);

				const elem = fragment.firstChild as Element;
				const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
				assert.equal(resolved, null, ":render should be removed even if hidden");
			});

			it("processes :render on multiple sibling elements", async () => {
				const renderer = new ctor();
				const html = `
            <div :render="/a.js" class="a"></div>
            <div :render="/b.js" class="b"></div>
            <div :render="/c.js" class="c"></div>
          `;
				const fragment = renderer.parseHTML(html);

				await renderer.preprocessNode(fragment, { dirpath: "/" });
				await renderer.renderNode(fragment, {});

				// All three should have :render removed.
				let count = 0;
				for (const node of traverse(fragment)) {
					const elem = node as Element;
					if (elem.tagName?.toLowerCase() === "div") {
						count++;
						const resolved = getAttribute(elem, ":render") || getAttribute(elem, "data-render");
						assert.equal(resolved, null, "Each sibling should have :render removed");
					}
				}
				assert.equal(count, 3, "Should have 3 div elements");
			});

			it(":render can access :data variables on same element", async function () {
				// Skip for non-browser environments that can't do dynamic imports.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// This test verifies a real usage scenario:
				// A chart component wants to use configuration from :data in its init function.
				const renderer = new ctor();
				const html = `<div :data="{ chartType: 'bar', chartData: [1, 2, 3] }" :render="./fixtures/render-init-capture.js" class="chart"></div>`;
				const fragment = renderer.parseHTML(html);

				await renderer.mount(fragment, { dirpath: "." });

				// Find the element with class="chart".
				let elem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (getAttribute(node as Element, "class") === "chart") {
						elem = node as Element;
						break;
					}
				}
				assert.ok(elem, "Should find element with class='chart'");
				const el = elem as unknown as RenderedElement;

				// The init function stored what it could access at execution time.
				if (!el._initState) throw new Error("Init function should have stored state");

				// chartType from :data IS available when :render executes.
				assert.equal(
					el._initState.hasChartType,
					true,
					"chartType should be available when :render executes",
				);
				assert.equal(
					el._initState?.chartType,
					"bar",
					"chartType should be 'bar' when :render executes",
				);

				// After mount completes, the variable is still set.
				if (!el.renderer) throw new Error("renderer missing");
				const subrenderer = el.renderer;
				assert.equal(
					subrenderer.$.chartType,
					"bar",
					"After mount, chartType should be 'bar' from :data",
				);
			});

			it(":render can access $parent variables from ancestor :data", async function () {
				// Skip for non-browser environments that can't do dynamic imports.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Test that :render can access variables set by a parent's :data through $parent.
				const renderer = new ctor();
				const html = `
            <div :data="{ parentConfig: 'inherited' }">
              <div :data="{ childConfig: 'local' }" :render="./fixtures/render-init-capture.js" class="nested"></div>
            </div>
          `;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment, { dirpath: "." });

				// Find the nested element.
				let elem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (getAttribute(node as Element, "class") === "nested") {
						elem = node as Element;
						break;
					}
				}
				assert.ok(elem, "Should find element with class='nested'");
				const el = elem as unknown as RenderedElement;
				assert.ok(el._initState, "Init function should have stored state");

				// The child's :data variable should be available.
				if (!el.renderer) throw new Error("renderer missing");
				assert.equal(el.renderer.$.childConfig, "local", "childConfig should be 'local'");

				// The parent's variable should be accessible via $parent.
				assert.equal(
					el._initState?.parentVar,
					undefined,
					"parentVar should be undefined (fixture looks for 'inheritedVar')",
				);
				assert.equal(
					el.renderer.$.$parent?.$.parentConfig,
					"inherited",
					"parentConfig should be accessible via $parent",
				);
			});

			it(":render can modify renderer store via set()", async function () {
				// Skip for non-browser environments that can't do dynamic imports.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Test that :render init function can call renderer.set() to modify store.
				const renderer = new ctor();
				const html = `<div :data="{ count: 5 }" :render="./fixtures/render-init-modify.js" class="counter"></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment, { dirpath: "." });

				// Find the counter element.
				let elem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (getAttribute(node as Element, "class") === "counter") {
						elem = node as Element;
						break;
					}
				}
				assert.ok(elem, "Should find element with class='counter'");
				const el = elem as unknown as RenderedElement;

				// The init function should have read count=5 and set count=6.
				assert.equal(el._modifiedCount, 6, "Init should have incremented count to 6");
				if (!el.renderer) throw new Error("renderer missing");
				assert.equal(el.renderer.$.count, 6, "Store should have count=6");
			});

			it(":render with :data accessing deep object properties", async function () {
				// Skip for non-browser environments that can't do dynamic imports.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Test that :render can access nested object properties from :data.
				const renderer = new ctor();
				const html = `
            <div
              :data="{ config: { theme: { primary: 'blue', secondary: 'green' } } }"
              :render="./fixtures/render-init-capture.js"
              class="themed">
            </div>
          `;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment, { dirpath: "." });

				// Find the themed element.
				let elem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (getAttribute(node as Element, "class") === "themed") {
						elem = node as Element;
						break;
					}
				}
				assert.ok(elem, "Should find element with class='themed'");
				const el = elem as unknown as RenderedElement;

				// Verify nested object is accessible.
				if (!el.renderer) throw new Error("renderer missing");
				const subrenderer = el.renderer;
				assert.deepEqual(
					subrenderer.$.config,
					{ theme: { primary: "blue", secondary: "green" } },
					"Deep config object should be accessible",
				);
				assert.equal(
					subrenderer.$.config.theme.primary,
					"blue",
					"Nested property should be accessible",
				);
			});

			it(":render without :data accesses parent renderer variables", async function () {
				// Skip for non-browser environments that can't do dynamic imports.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// :render creates a subrenderer, which inherits from parent.
				const renderer = new ctor();
				renderer.set("chartType", "line");
				const html = `<div :render="./fixtures/render-init-capture.js" class="standalone"></div>`;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment, { dirpath: "." });

				// Find the standalone element.
				let elem: Element | null = null;
				for (const node of traverse(fragment)) {
					if (getAttribute(node as Element, "class") === "standalone") {
						elem = node as Element;
						break;
					}
				}
				assert.ok(elem, "Should find element with class='standalone'");
				const el = elem as unknown as RenderedElement;
				if (!el._initState) throw new Error("Init function should have stored state");

				// The init function receives a subrenderer. has() checks local store only,
				// so it returns false. But get()/$.xxx accesses parent chain.
				assert.equal(el._initState.hasChartType, false, "has() checks local store only");
				assert.equal(el._initState.chartType, "line", "chartType accessible via parent chain");
			});

			it(":for with :render and :data executes init for each iteration with its scope", async function () {
				// Skip for non-browser environments that can't do dynamic imports.
				if (["htmlparser2"].includes(new ctor().impl)) this.skip();

				// Each :for iteration gets its own :data scope, and :render runs with that scope.
				const renderer = new ctor();
				renderer.set("items", ["a", "b", "c"]);
				const html = `
            <div :for="item in items" :data="{ index: items.indexOf(item) }" :render="./fixtures/render-init-capture.js" class="item"></div>
          `;
				const fragment = renderer.parseHTML(html);
				await renderer.mount(fragment, { dirpath: "." });

				// Find visible item elements (skip the hidden template).
				const visibleItems: Element[] = [];
				for (const node of traverse(fragment)) {
					const elem = node as Element;
					if (getAttribute(elem, "class") === "item") {
						if (getAttribute(elem, "data-m-cloak") === null) {
							visibleItems.push(elem);
						}
					}
				}

				assert.equal(visibleItems.length, 3, "Should have 3 visible item elements");

				// Each visible item should have _initState from its :render call.
				for (let i = 0; i < visibleItems.length; i++) {
					const elem = visibleItems[i];
					const el = elem as unknown as RenderedElement;
					assert.ok(el._initState, `Item ${i} should have _initState`);
					assert.ok(el.renderer, `Item ${i} should have renderer`);
				}
			});

			describe("execution order with other plugins", () => {
				it(":render sees text content after :text is applied", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					renderer.set("message", "Hello World");
					const html = `<div :data="{}" :text="message" :render="./fixtures/render-init-inspect.js"></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const elem = fragment.querySelector("div");
					assert.ok(elem);
					const el = elem as unknown as RenderedElement;
					if (!el._renderedState) throw new Error("Should have captured rendered state");
					assert.equal(
						el._renderedState.textContent,
						"Hello World",
						":render should see text content from :text",
					);
				});

				it(":render sees class after :class is applied", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					renderer.set("isActive", true);
					const html = `<div :data="{}" class="base" :class="isActive ? 'active' : ''" :render="./fixtures/render-init-inspect.js"></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const elem = fragment.querySelector("div");
					assert.ok(elem);
					const el = elem as unknown as RenderedElement;
					if (!el._renderedState) throw new Error("Should have captured rendered state");
					if (!el._renderedState.className) throw new Error("Should have captured className");
					assert.ok(
						el._renderedState.className.includes("active"),
						":render should see 'active' class from :class",
					);
					assert.ok(
						el._renderedState.className.includes("base"),
						":render should see original 'base' class",
					);
				});

				it(":render sees visibility after :show is applied", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					renderer.set("isVisible", false);
					const html = `<div :data="{}" :show="isVisible" :render="./fixtures/render-init-inspect.js"></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const elem = fragment.querySelector("div");
					assert.ok(elem);
					const el = elem as unknown as RenderedElement;
					if (!el._renderedState) throw new Error("Should have captured rendered state");
					assert.equal(
						el._renderedState.displayStyle,
						"none",
						":render should see display:none from :show=false",
					);
				});

				it(":render sees custom attribute after :attr:* is applied", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					renderer.set("testId", "my-component");
					const html = `<div :data="{}" :attr:data-testid="testId" :render="./fixtures/render-init-inspect.js"></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const elem = fragment.querySelector("div");
					assert.ok(elem);
					const el = elem as unknown as RenderedElement;
					assert.ok(el._renderedState, "Should have captured rendered state");

					// Verify the attribute was set on the element after mount.
					const attrValue = getAttribute(el, "data-testid");
					assert.equal(attrValue, "my-component", "Attribute should be set after mount");
				});

				it(":render sees multiple plugin effects combined", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					renderer.set("title", "Dashboard");
					renderer.set("isAdmin", true);
					const html = `
              <div
                :data="{}"
                :text="title"
                :class="isAdmin ? 'admin' : 'user'"
                :render="./fixtures/render-init-inspect.js"
                class="panel">
              </div>
            `;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const elem = fragment.querySelector("div");
					assert.ok(elem);
					const el = elem as unknown as RenderedElement;
					if (!el._renderedState) throw new Error("Should have captured rendered state");
					if (!el._renderedState.className) throw new Error("Should have captured className");
					assert.equal(el._renderedState.textContent, "Dashboard", "Should see :text content");
					assert.ok(el._renderedState.className.includes("admin"), "Should see :class effect");
					assert.ok(el._renderedState.className.includes("panel"), "Should see original class");
				});
			});

			describe("undefined variable auto-initialization", () => {
				it(":render sets undefined variable referenced in {{ expression }}", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					// The template references dynamicMessage which is NOT defined.
					// The :render callback will set it.
					const html = `
              <div :render="./fixtures/render-set-undefined-var.js">
                <span class="message">{{ dynamicMessage }}</span>
              </div>
            `;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const elem = fragment.querySelector("div");
					assert.ok(elem);
					const el = elem as unknown as RenderedElement;
					assert.ok(el._renderExecuted, ":render callback should have executed");

					// The span should now contain the message set by :render.
					const span = fragment.querySelector(".message") as Element;
					assert.ok(span, "Should find span with class='message'");
					const content = getTextContent(span);
					assert.equal(
						content,
						"Hello from render callback!",
						"{{ dynamicMessage }} should reflect value set by :render",
					);
				});

				it(":render sets undefined number variable", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					const html = `
              <div :render="./fixtures/render-set-undefined-var.js">
                <span class="number">{{ dynamicNumber }}</span>
              </div>
            `;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const span = fragment.querySelector(".number") as Element;
					assert.equal(getTextContent(span), "42", "{{ dynamicNumber }} should be 42");
				});

				it(":render sets undefined array variable used in :for", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					// dynamicArray is NOT defined initially.
					// :render sets it to ["a", "b", "c"].
					const html = `
              <div :render="./fixtures/render-set-undefined-var.js">
                <span :for="item in dynamicArray" class="array-item">{{ item }}</span>
              </div>
            `;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					// Find visible items (skip the hidden template).
					const items: Element[] = [];
					for (const node of traverse(fragment)) {
						const elem = node as Element;
						if (getAttribute(elem, "class") === "array-item") {
							if (getAttribute(elem, "data-m-cloak") === null) {
								items.push(elem);
							}
						}
					}

					assert.equal(items.length, 3, "Should have 3 items from dynamicArray");
					assert.equal(getTextContent(items[0]), "a");
					assert.equal(getTextContent(items[1]), "b");
					assert.equal(getTextContent(items[2]), "c");
				});

				it(":render sets undefined object variable with nested access", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					const html = `
              <div :render="./fixtures/render-set-undefined-var.js">
                <span class="key">{{ dynamicObject.key }}</span>
                <span class="nested">{{ dynamicObject.nested.prop }}</span>
              </div>
            `;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment, { dirpath: "." });

					const keySpan = fragment.querySelector(".key") as Element;
					const nestedSpan = fragment.querySelector(".nested") as Element;
					assert.equal(getTextContent(keySpan), "value", "dynamicObject.key should be 'value'");
					assert.equal(
						getTextContent(nestedSpan),
						"deep",
						"dynamicObject.nested.prop should be 'deep'",
					);
				});

				it("undefined variable in {{ expression }} is reactive to later set()", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					// noPreDefinition is NOT defined initially.
					const html = `<div><span class="reactive">{{ noPreDefinition }}</span></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					// Initially it should be undefined (rendered as empty or "undefined").
					const span = fragment.querySelector(".reactive") as Element;
					const initialContent = getTextContent(span);
					assert.ok(
						initialContent === "undefined" || initialContent === "",
						`Initial content should be empty or 'undefined', got: '${initialContent}'`,
					);

					// Now set the variable after mount.
					await renderer.set("noPreDefinition", "Now I exist!");

					// The span should reactively update.
					const updatedContent = getTextContent(span);
					assert.equal(updatedContent, "Now I exist!", "Content should update reactively");
				});

				it("undefined variable in :for is reactive to later set()", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					// lateArray is NOT defined initially.
					const html = `<span :for="item in lateArray" class="late-item">{{ item }}</span>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					// Initially there should be no visible items (array is undefined).
					let items = Array.from(traverse(fragment)).filter((node) => {
						const elem = node as Element;
						if (getAttribute(elem, "class") !== "late-item") return false;
						return getAttribute(elem, "data-m-cloak") === null;
					});
					assert.equal(items.length, 0, "Should have no items initially");

					// Now set the array.
					await renderer.set("lateArray", ["x", "y"]);

					// Should now have 2 items.
					items = Array.from(traverse(fragment)).filter((node) => {
						const elem = node as Element;
						if (getAttribute(elem, "class") !== "late-item") return false;
						return getAttribute(elem, "data-m-cloak") === null;
					});
					assert.equal(items.length, 2, "Should have 2 items after setting lateArray");
					assert.equal(getTextContent(items[0] as Element), "x");
					assert.equal(getTextContent(items[1] as Element), "y");
				});

				it("undefined variable in :text is reactive to later set()", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					const html = `<div :text="laterMessage" class="text-test"></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					const elem = fragment.querySelector(".text-test") as Element;
					const initialContent = getTextContent(elem);
					assert.ok(
						initialContent === "undefined" || initialContent === "",
						`Initial :text content should be empty or 'undefined', got: '${initialContent}'`,
					);

					await renderer.set("laterMessage", "Text appeared!");
					assert.equal(getTextContent(elem), "Text appeared!", ":text should update reactively");
				});

				it("undefined variable in :show is reactive to later set()", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					const html = `<div :show="isVisible" class="show-test">Content</div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					const elem = fragment.querySelector(".show-test") as Element;
					// Initially undefined, which is falsy, so should be hidden.
					const initialDisplay = getAttribute(elem, "style") || "";
					assert.ok(
						initialDisplay.includes("display: none") || initialDisplay.includes("display:none"),
						"Should be hidden initially when :show is undefined",
					);

					await renderer.set("isVisible", true);
					const updatedDisplay = getAttribute(elem, "style") || "";
					assert.ok(
						!updatedDisplay.includes("display: none") && !updatedDisplay.includes("display:none"),
						"Should be visible after setting isVisible to true",
					);
				});

				it("undefined variable in :class is reactive to later set()", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					const html = `<div :class="dynamicClass" class="base class-test"></div>`;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					const elem = fragment.querySelector(".class-test") as Element;
					const initialClass = getAttribute(elem, "class") || "";
					assert.ok(initialClass.includes("base"), "Should have base class");
					assert.ok(!initialClass.includes("added"), "Should not have 'added' class initially");

					await renderer.set("dynamicClass", "added");
					const updatedClass = getAttribute(elem, "class") || "";
					assert.ok(updatedClass.includes("base"), "Should still have base class");
					assert.ok(updatedClass.includes("added"), "Should now have 'added' class");
				});

				it("multiple undefined variables in same template are all reactive", async function () {
					if (["htmlparser2"].includes(new ctor().impl)) this.skip();

					const renderer = new ctor();
					const html = `
              <div>
                <span class="a">{{ varA }}</span>
                <span class="b">{{ varB }}</span>
                <span class="c">{{ varC }}</span>
              </div>
            `;
					const fragment = renderer.parseHTML(html);
					await renderer.mount(fragment);

					// Set all three variables.
					await renderer.set("varA", "Alpha");
					await renderer.set("varB", "Beta");
					await renderer.set("varC", "Gamma");

					assert.equal(getTextContent(fragment.querySelector(".a") as Element), "Alpha");
					assert.equal(getTextContent(fragment.querySelector(".b") as Element), "Beta");
					assert.equal(getTextContent(fragment.querySelector(".c") as Element), "Gamma");
				});
			});
		});

		describe("plain attribute cloning onto custom elements and includes", () => {
			it("clones plain attributes from a custom element onto its first child", async () => {
				const renderer = new ctor();
				const template = `<template is="widget"><p>hi</p></template>`;
				const html = `<widget id="g" title="t" aria-label="l"></widget>`;
				const fragment = renderer.parseHTML(template + html);

				await renderer.mount(fragment);

				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "p");
				assert.equal(getAttribute(node, "id"), "g");
				assert.equal(getAttribute(node, "title"), "t");
				assert.equal(getAttribute(node, "aria-label"), "l");
			});

			it("clones plain attributes from an <include> onto its first child", async () => {
				const renderer = new ctor();
				const fragment = renderer.parseHTML(`<include src="foo.html" id="g" title="t"></include>`);
				renderer.preprocessLocal = async () => renderer.parseHTML(`<p>hi</p>`);

				await renderer.mount(fragment, { dirpath: "." });

				const node = fragment.firstChild as Element;
				assert.equal(node.tagName.toLowerCase(), "p");
				assert.equal(getAttribute(node, "id"), "g");
				assert.equal(getAttribute(node, "title"), "t");
				assert.equal(getAttribute(node, "src"), null);
			});
		});
	});
}
