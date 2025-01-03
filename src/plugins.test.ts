import { IRenderer } from "./renderer.js";
import { dirname, getAttribute } from "./dome.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./store.js";
import { assert, getTextContent, innerHTML } from "./test_utils.js";

export function testSuite(ctor: new (...args: any[]) => IRenderer): void {
  describe("Plugins Test Suite", () => {
    describe("<include>", () => {
      [
        "http://foo.com/bar.html",
        "https://foo.com/bar.html",
        "//foo.com/bar.html",
        "//foo.com/baz/../bar.html",
      ].forEach((source) => {
        it(`includes a remote source using absolute path (${source})`, async function () {
          const renderer = new ctor();
          const html = `<include src="${source}"></include>`;
          const fragment = renderer.parseHTML(html);

          renderer.preprocessRemote = async function (fpath, _) {
            return renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
          };
          await renderer.mount(fragment);

          const node = fragment.firstChild as Element;
          assert.equal(getAttribute(node, "src"), null);
          assert.equal(getTextContent(node), source);
        });
      });

      ["/bar.html", "/baz/../bar.html"].forEach((source) => {
        it(`includes a local source using absolute path (${source})`, async function () {
          const renderer = new ctor();
          const html = `<include src="${source}"></include>`;
          const fragment = renderer.parseHTML(html);

          renderer.preprocessLocal = async function (fpath, params) {
            return renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
          };
          await renderer.mount(fragment, { dirpath: "/foo" });

          const node = fragment.firstChild as Element;
          assert.equal(getAttribute(node, "src"), null);
          assert.equal(getTextContent(node), source);
        });
      });

      ["bar.html", "./bar.html", "baz/../bar.html"].forEach((source) => {
        it(`includes a local source using relative path (${source})`, async function () {
          const renderer = new ctor();
          const html = `<include src="${source}"></include>`;
          const fragment = renderer.parseHTML(html);

          renderer.preprocessLocal = async function (fpath, params) {
            return renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
          };
          await renderer.mount(fragment, { dirpath: "/foo" });

          const node = fragment.firstChild as Element;
          assert.equal(getAttribute(node, "src"), null);
          assert.equal(getTextContent(node), `/foo/${source}`);
        });
      });

      it(`propagates attributes to first child`, async function () {
        const renderer = new ctor({ a: "foo", b: "bar" });
        const html = `<include src="foo.html" :on:click="fn()" :class="a" :text="b"></include>`;
        const fragment = renderer.parseHTML(html);

        renderer.preprocessLocal = async function (fpath, params) {
          return renderer.parseHTML(
            `<span>Hello</span> <span>World</span>`
          ) as unknown as DocumentFragment;
        };
        await renderer.mount(fragment, { dirpath: "." });

        const node = fragment.firstChild as Element;
        assert.equal(getAttribute(node, "src"), null);
        assert.equal(getAttribute(node, ":on:click"), null);
        assert.equal(getAttribute(node, "class"), "foo");
        assert.equal(getTextContent(node), "bar");
      });
    });

    describe("rebase", () => {
      it("rebase relative paths", async function () {
        const renderer = new ctor();
        const html = `<img src="bar/baz.jpg"></img>`;
        const fragment = renderer.parseHTML(html);

        await renderer.mount(fragment, { dirpath: "/foo" });

        const node = fragment.firstChild as HTMLImageElement;
        assert.equal(getAttribute(node, "src"), "/foo/bar/baz.jpg");
      });

      it("rebase (not) absolute paths", async function () {
        const renderer = new ctor();
        const html = `<img src="/foo/bar.jpg"></img>`;
        const fragment = renderer.parseHTML(html);

        await renderer.mount(fragment, { dirpath: "/baz" });

        const node = fragment.firstChild as HTMLImageElement;
        assert.equal(getAttribute(node, "src"), "/foo/bar.jpg");
      });

      it("rebase relative paths with indirection", async function () {
        const renderer = new ctor();
        const html = `<include src="foo/fragment.tpl.html"></include>`;
        const fragment = renderer.parseHTML(html);

        renderer.preprocessLocal = async function (fpath, params) {
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

      it("rebase relative paths with indirection and base path", async function () {
        const renderer = new ctor();
        const html = `<include src="bar/fragment.tpl.html"></include>`;
        const fragment = renderer.parseHTML(html);

        renderer.preprocessLocal = async function (fpath, params) {
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
      it("custom element registration", async function () {
        const renderer = new ctor();
        const customElement = "<span>Hello World</span>";
        const template = `<template is="custom-element">${customElement}</template>`;
        const fragment = renderer.parseHTML(template);
        await renderer.mount(fragment);
        assert.equal(renderer._customElements.has("custom-element"), true);
        const tpl = renderer._customElements.get("custom-element")! as HTMLTemplateElement;
        assert.equal(innerHTML(tpl), customElement);
      });

      it("custom element with no attributes", async function () {
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

      it("custom element with :text and :class attributes", async function () {
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

      it("custom element with :data attribute", async function () {
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

      it("custom element with <slot/>", async function () {
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

      it("custom element from include", async function () {
        const renderer = new ctor();
        const html = `<custom-element></custom-element>`;
        const include = `<include src="foo.html"></include>`;
        const fragment = renderer.parseHTML(include + html);
        renderer.preprocessLocal = async function (fpath, params) {
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
      it("resolves single variable", async function () {
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
      it("initializes unseen value", async function () {
        const renderer = new ctor();
        const html = `<div :data="{foo: 'bar'}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.equal(subrenderer.$.foo, "bar");
      });

      it("initializes an array of values", async function () {
        const renderer = new ctor();
        const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.deepEqual(subrenderer.$.arr, [1, 2, 3]);
      });

      it("initializes an array of objects", async function () {
        const renderer = new ctor();
        const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.deepEqual(subrenderer.$.arr, [{ n: 1 }, { n: 2 }, { n: 3 }]);
      });

      it("initializes avoiding subrenderer", async function () {
        const renderer = new ctor({ foo: 1, bar: 2 });
        const html = `<div :data="{ baz: 3 }"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        // Mount the node directly, otherwise it's not the root node.
        await renderer.mount(node);
        assert.equal(renderer, (node as any).renderer);
        assert.equal(getAttribute(node, ":data"), null);

        // The renderer has all the initial properties + the new one.
        assert.equal(renderer.get("foo"), 1);
        assert.equal(renderer.get("bar"), 2);
        assert.equal(renderer.get("baz"), 3);
      });

      it("initializes using subrenderer", async function () {
        const renderer = new ctor({ foo: 1, bar: 2 });
        const html = `<div><div :data="{ baz: 3 }"></div><div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        // Mount the node directly, otherwise it's not the root node.
        await renderer.mount(node);
        const subnode = node.firstChild as Element;
        const subrenderer = (subnode as any).renderer;
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
    });

    describe(":class", () => {
      it("single class", async function () {
        const renderer = new ctor({ foo: "bar" });
        const html = `<div :class="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(getAttribute(node, ":class"), null);
        assert.equal(renderer.$.foo, "bar");
        assert.equal(getAttribute(node, "class"), "bar");
      });
      it("multiple classes", async function () {
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

    describe("on:event", function () {
      it("click", async function () {
        // Skip test if renderer does not support events.
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
    });

    describe(":for", () => {
      [0, 1, 10].forEach((n) => {
        it(`container with ${n} items`, async function () {
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

      it("container that updates items", async function () {
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
        assert.equal((children0[0] as HTMLElement).tagName.toLowerCase(), "template");
        assert.equal(children0[0].firstChild, node);

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

      it("container does not resolve initially", async function () {
        const renderer = new ctor();
        const html = `<div :for="item in items">{{ item }}</div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        const parent = node.parentNode;
        assert.ok(parent);

        // Create renderer with no array => fails.
        await renderer.mount(fragment);
        assert.equal(renderer.get("item"), null);
        assert.equal(renderer.get("items"), null);

        // Add a placeholder for the array, but it's not array type.
        await renderer.set("items", null);
        await renderer.mount(fragment);

        assert.equal(renderer.get("item"), null);
        assert.equal(getAttribute(node, ":for"), null);
        assert.notEqual(node.parentNode, parent);

        const children = Array.from(parent?.childNodes || []);
        assert.equal(children.length, 1);
        assert.equal((children[0] as HTMLElement).tagName.toLowerCase(), "template");
        assert.equal(children[0].firstChild, node);
      });

      it("template node with :text property", async function () {
        const renderer = new ctor();
        const html = `<div :text="item" :for="item in items"></div>`;
        const fragment = renderer.parseHTML(html);

        renderer.set("items", ["1", "2"]);
        await renderer.mount(fragment);

        const children12 = Array.from(fragment.childNodes).slice(1);
        assert.equal(children12.length, 2);
        assert.equal(getTextContent(children12[0] as Element)?.trim(), "1");
        assert.equal(getTextContent(children12[1] as Element)?.trim(), "2");

        await renderer.set("items", ["a", "b"]);
        const childrenAB = Array.from(fragment.childNodes).slice(1);
        assert.equal(childrenAB.length, 2);
        assert.equal(getTextContent(childrenAB[0] as Element)?.trim(), "a");
        assert.equal(getTextContent(childrenAB[1] as Element)?.trim(), "b");
      });

      it(`container with object items`, async function () {
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
        assert.notEqual(renderer.$.item, "foo");

        const children = Array.from(parent?.childNodes || []).slice(1);
        assert.equal(children.length, container.length);
        for (let i = 0; i < container.length; i++) {
          assert.equal(getTextContent(children[i] as Element), container[i].text);
        }
      });
    });

    describe(":bind", () => {
      it("binds a text input value with existing store key", async function () {
        // Skip test if renderer does not support events.
        if (["htmlparser2"].includes(new ctor().impl)) this.skip();

        // Since we're dealing with events, we need to create a full document.
        const doc = globalThis.document.implementation.createHTMLDocument();
        (doc.body as any).innerHTML = `<input :bind="foo" />`;
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

      it("fails to bind a text input value with undefined variable", async function () {
        // Skip test if renderer does not support events.
        if (["htmlparser2"].includes(new ctor().impl)) this.skip();

        // Since we're dealing with events, we need to create a full document.
        const doc = globalThis.document.implementation.createHTMLDocument();
        (doc.body as any).innerHTML = `<input :bind="foo" />`;

        // Value does not exist in store before mount().
        const renderer = new ctor();
        assert.equal(renderer.has("foo"), false);

        // After mount(), the value is still not in the store.
        await renderer.mount(doc.body);
        assert.equal(renderer.has("foo"), false);
      });

      it("binds a text input value with custom events", async function () {
        // Skip test if renderer does not support events.
        if (["htmlparser2"].includes(new ctor().impl)) this.skip();

        // Since we're dealing with events, we need to create a full document.
        const doc = globalThis.document.implementation.createHTMLDocument();
        (doc.body as any).innerHTML = `<input :bind="foo" :bind:on="my-custom-event" />`;
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
    });

    describe(":show", () => {
      it("shows then hides an element", async function () {
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

      it("hides then shows an element", async function () {
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

      it("hides an element based on data from the same element", async function () {
        const renderer = new ctor();
        const html = `<div :data="{ show: false }" :show="show" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;

        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;

        assert.ok(!node.hasAttribute?.(":show"));
        assert.equal(getAttribute(node, "style"), "display: none;");
        assert.equal((node as HTMLElement).style?.display ?? "none", "none");

        await subrenderer.set("show", true);
        assert.notEqual(getAttribute(node, "style"), "display: none;");
        assert.notEqual((node as HTMLElement).style?.display, "none");
      });
    });

    describe(":text", () => {
      it("render simple text string", async function () {
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
      it("render simple HTML", async function () {
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

      it("render contents of HTML", async function () {
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

      it("render HTML within a :for", async function () {
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
      it("processes href attribute", async function () {
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
      it("processes disabled property", async function () {
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
        assert.equal((node as any).customProp, "example.com");
      });
    });
  });
}
