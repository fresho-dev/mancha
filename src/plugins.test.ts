import type { ElementWithAttribs } from "./dome.js";
import { dirname, firstElementChild, getAttribute, traverse } from "./dome.js";
import type { IRenderer } from "./renderer.js";
import type { StoreState } from "./store.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./store.js";
import {
	assert,
	getTextContent,
	innerHTML,
	setInnerHTML,
	setupGlobalTestEnvironment,
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
				await new Promise((resolve) => setTimeout(resolve, 10));
				assert.equal(textNode.data, "Hello Stranger");

				renderer.set("name", "John");
				await new Promise((resolve) => setTimeout(resolve, 10));
				assert.equal(textNode.data, "Hello John");
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
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
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
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
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
				// template.content exists for browser/safe_browser but not worker
				const templateFirstChild = template0.content?.firstChild || template0.firstChild;
				assert.equal(templateFirstChild, node);

				// Add a single item.
				renderer.$.items = ["foo"];
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
				const children1 = Array.from(parent?.childNodes || []);
				assert.equal(children1.length, renderer.$.items.length + 1);
				assert.equal(getTextContent(children1[1] as Element), "foo");

				// Add multiple items.
				renderer.$.items.push("bar", "baz");
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
				const children2 = Array.from(parent?.childNodes || []);
				assert.equal(children2.length, renderer.$.items.length + 1);
				assert.equal(getTextContent(children2[1] as Element), "foo");
				assert.equal(getTextContent(children2[2] as Element), "bar");
				assert.equal(getTextContent(children2[3] as Element), "baz");

				// Remove one item.
				renderer.$.items.pop();
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
				const children3 = Array.from(parent?.childNodes || []);
				assert.equal(children3.length, renderer.$.items.length + 1);
				assert.equal(getTextContent(children3[1] as Element), "foo");
				assert.equal(getTextContent(children3[2] as Element), "bar");
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
				// template.content exists for browser/safe_browser but not worker
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

				// The template element has display none, and the child element has the text.
				// For browser renderers, content is in template.content; for worker it's in template.childNodes
				const templateChild =
					(tplelem as HTMLTemplateElement).content?.firstChild || tplelem.childNodes[0];
				assert.equal(getAttribute(templateChild as Element, "style"), "display: none;");
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
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
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
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
				assert.equal(renderer.get("foo"), "baz");
				node.dispatchEvent(new globalThis.window.Event("my-custom-event"));
				await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
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
		it("processes custom attribute", async function () {
			// Skip test if renderer does not support unsafe attributes.
			if (["safe_browser"].includes(new ctor().impl)) this.skip();
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
		it("processes href property", async function () {
			// Skip test if renderer does not support unsafe properties.
			if (["safe_browser"].includes(new ctor().impl)) this.skip();
			const renderer = new ctor({ foo: "https://example.com/" });
			const html = `<a :prop:href="foo"></a>`;
			const fragment = renderer.parseHTML(html);
			const elem = fragment.firstChild as HTMLAnchorElement;
			await renderer.mount(fragment);
			assert.equal(getAttribute(elem, ":prop:href"), null);
			assert.equal(elem.href, "https://example.com/");
		});
		it("processes custom property", async function () {
			// Skip test if renderer does not support unsafe properties.
			if (["safe_browser"].includes(new ctor().impl)) this.skip();
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
				// Check for either :render or data-render (safe_browser converts).
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
						// Skip the original element (inside template, hidden with display:none).
						const style = getAttribute(elem, "style") || "";
						if (style.includes("display: none")) continue;

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
						const style = getAttribute(elem, "style") || "";
						if (!style.includes("display: none")) {
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
							const style = getAttribute(elem, "style") || "";
							if (!style.includes("display: none")) {
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
						const style = getAttribute(elem, "style") || "";
						return !style.includes("display: none");
					});
					assert.equal(items.length, 0, "Should have no items initially");

					// Now set the array.
					await renderer.set("lateArray", ["x", "y"]);

					// Should now have 2 items.
					items = Array.from(traverse(fragment)).filter((node) => {
						const elem = node as Element;
						if (getAttribute(elem, "class") !== "late-item") return false;
						const style = getAttribute(elem, "style") || "";
						return !style.includes("display: none");
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
	});
}
