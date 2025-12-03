import { IRenderer } from "./renderer.js";
import { dirname, getAttribute, traverse } from "./dome.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./store.js";
import { assert, getTextContent, innerHTML, setupGlobalTestEnvironment } from "./test_utils.js";

export function testSuite(ctor: new (...args: any[]) => IRenderer): void {
  describe("Plugins Test Suite", () => {
    before(() => setupGlobalTestEnvironment());
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

      it("reuses existing renderer instance", async function () {
        const renderer = new ctor();
        const html = `<div :data="{ foo: 'bar' }"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;

        await renderer.mount(fragment);
        const initialRenderer = (node as any).renderer;
        assert.ok(initialRenderer, "Renderer should be attached after first mount");
        assert.equal(initialRenderer.$.foo, "bar", "Initial data should be set");

        // Modify a value in the subrenderer to confirm it's the same instance later
        initialRenderer.set("foo", "new_bar");

        // Simulate re-processing the :data attribute by re-mounting
        // In a real scenario, this could be triggered by a parent :for loop re-rendering
        // or a manual call to renderNode on an already mounted element.
        await renderer.mount(fragment);
        const currentRenderer = (node as any).renderer;

        assert.ok(currentRenderer, "Renderer should still be attached after re-mount");
        assert.equal(initialRenderer, currentRenderer, "Should reuse the same renderer instance");
        assert.equal(currentRenderer.$.foo, "new_bar", "Modified data should persist in reused renderer");
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

        const children = Array.from(parent?.childNodes || []).slice(1);
        assert.equal(children.length, container.length);
        for (let i = 0; i < container.length; i++) {
          assert.equal(getTextContent(children[i] as Element), container[i].text);
        }
      });

      it("container with nested arrays", async function () {
        // Create array with 0..n elements.
        let curr = 0;
        const container = [];
        for (let i = 0; i < 10; i++) {
          const subarr = Array.from({ length: 10 }, (_, x) => ({ text: String(curr++) }));
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

      it("template element is not displayed", async function () {
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
        assert.equal(getAttribute(tplelem.childNodes[0] as Element, "style"), "display: none;");
        assert.equal(getTextContent(childelem), "foo");
      });

      it("container using map with arrow function", async function () {
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

      it("binds to a text input value with undefined variable", async function () {
        // Skip test if renderer does not support events.
        if (["htmlparser2"].includes(new ctor().impl)) this.skip();

        // Since we're dealing with events, we need to create a full document.
        const doc = globalThis.document.implementation.createHTMLDocument();
        (doc.body as any).innerHTML = `<input :bind="foo" />`;

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

    describe(":stripTypes plugin", () => {
      it("strips :types attribute after rendering", async function () {
        const renderer = new ctor({ name: "John" });
        const html = `<div :types='{"name": "string"}'><span>{{ name }}</span></div>`;
        const fragment = renderer.parseHTML(html);
        const elem = fragment.firstChild as HTMLElement;

        await renderer.mount(fragment);

        // Verify :types attribute is removed after rendering
        assert.equal(getAttribute(elem, ":types"), null);
      });

      it("strips data-types attribute after rendering", async function () {
        const renderer = new ctor({ name: "Jane" });
        const html = `<div data-types='{"name": "string"}'><span>{{ name }}</span></div>`;
        const fragment = renderer.parseHTML(html);
        const elem = fragment.firstChild as HTMLElement;

        await renderer.mount(fragment);

        // Verify data-types attribute is removed after rendering
        assert.equal(getAttribute(elem, "data-types"), null);
      });

      it("strips types from nested elements", async function () {
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
      it("is accessible in :data expressions", async function () {
        // Mock API client.
        const api = {
          listUsers: () => Promise.resolve([{ name: "Alice" }, { name: "Bob" }]),
        };

        const renderer = new ctor({ api });
        const html = `<div :data="{ users: $resolve(api.listUsers) }"></div>`;
        const fragment = renderer.parseHTML(html);
        await renderer.mount(fragment);

        // Get the subrenderer's store.
        const elem = fragment.firstChild as any;
        const subrenderer = elem.renderer;

        // Verify the state object was created.
        const users = subrenderer.get("users");
        assert.ok(users !== null, "users should be set");
        assert.equal(typeof users, "object", "users should be an object");
        assert.ok("$pending" in users, "users should have $pending");
        assert.ok("$result" in users, "users should have $result");
        assert.ok("$error" in users, "users should have $error");
      });

      it("passes options to the function", async function () {
        let receivedOptions: any = null;
        const api = {
          getUser: (opts: any) => {
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

      it("state object updates after promise resolves", async function () {
        const api = {
          getData: () => Promise.resolve({ value: 123 }),
        };

        const renderer = new ctor({ api });
        const html = `<div :data="{ result: $resolve(api.getData) }"></div>`;
        const fragment = renderer.parseHTML(html);
        await renderer.mount(fragment);

        const elem = fragment.firstChild as any;
        const subrenderer = elem.renderer;

        // Wait for promise to resolve.
        await new Promise((resolve) => setTimeout(resolve, 30));

        // State should be updated.
        const result = subrenderer.get("result");
        assert.equal(result.$pending, false);
        assert.deepEqual(result.$result, { value: 123 });
        assert.equal(result.$error, null);
      });

      it("state object updates after promise rejects", async function () {
        const api = {
          failingCall: () => Promise.reject(new Error("API Error")),
        };

        const renderer = new ctor({ api });
        const html = `<div :data="{ result: $resolve(api.failingCall) }"></div>`;
        const fragment = renderer.parseHTML(html);
        await renderer.mount(fragment);

        const elem = fragment.firstChild as any;
        const subrenderer = elem.renderer;
        const result = subrenderer.get("result");

        // Wait for promise to reject.
        await new Promise((resolve) => setTimeout(resolve, 30));

        // State should be updated.
        assert.equal(result.$pending, false);
        assert.equal(result.$result, null);
        assert.ok(result.$error instanceof Error);
        assert.equal(result.$error?.message, "API Error");
      });
    });

    describe(":render", () => {
      describe("path resolution (rebaseRelativePaths)", () => {
        it("resolves relative path with dirpath", async function () {
          const renderer = new ctor();
          const html = `<div :render="./init.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/components" });

          const elem = fragment.firstChild as Element;
          // Check for either :render or data-render (safe_browser converts).
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          assert.equal(resolved, "/components/./init.js");
        });

        it("resolves relative path without leading ./", async function () {
          const renderer = new ctor();
          const html = `<div :render="init.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/components" });

          const elem = fragment.firstChild as Element;
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          assert.equal(resolved, "/components/init.js");
        });

        it("preserves absolute path starting with /", async function () {
          const renderer = new ctor();
          const html = `<div :render="/lib/init.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/components" });

          const elem = fragment.firstChild as Element;
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          assert.equal(resolved, "/lib/init.js");
        });

        it("preserves absolute URL with protocol", async function () {
          const renderer = new ctor();
          const html = `<div :render="https://cdn.example.com/init.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/components" });

          const elem = fragment.firstChild as Element;
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          assert.equal(resolved, "https://cdn.example.com/init.js");
        });

        it("handles missing dirpath param by using renderer default", async function () {
          const renderer = new ctor();
          const html = `<div :render="./init.js"></div>`;
          const fragment = renderer.parseHTML(html);

          // Don't pass dirpath - renderer will use its default.
          await renderer.preprocessNode(fragment, {});

          const elem = fragment.firstChild as Element;
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          // Renderer's default dirpath is used. For server it may be empty,
          // for browser it's based on location.href.
          assert.ok(resolved?.endsWith("./init.js"), `Expected path ending with ./init.js, got: ${resolved}`);
        });

        it("works with data-render attribute", async function () {
          const renderer = new ctor();
          const html = `<div data-render="./init.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/components" });

          const elem = fragment.firstChild as Element;
          assert.equal(getAttribute(elem, "data-render"), "/components/./init.js");
        });

        it("resolves path inside custom component template", async function () {
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
            if ((node as Element).className === "widget" || getAttribute(node as Element, "class") === "widget") {
              resolvedElem = node as Element;
              break;
            }
          }
          assert.ok(resolvedElem, "Should find element with class='widget'");
          const resolved =
            getAttribute(resolvedElem!!, ":render") || getAttribute(resolvedElem!!, "data-render");
          assert.equal(resolved, "/components/./widget.js");
        });

        it("rebases paths before template is cloned (race condition test)", async function () {
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
          const src = getAttribute(imgElem!!, "src");
          assert.equal(src, "/assets/./image.png", "img src should be rebased before cloning");
        });
      });

      describe("execution (rendering)", () => {
        it("removes :render attribute after execution attempt", async function () {
          const renderer = new ctor();
          const html = `<div :render="/nonexistent.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/" });
          await renderer.renderNode(fragment, {});

          const elem = fragment.firstChild as Element;
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          assert.equal(resolved, null);
        });

        it("removes data-render attribute after execution attempt", async function () {
          const renderer = new ctor();
          const html = `<div data-render="/nonexistent.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.preprocessNode(fragment, { dirpath: "/" });
          await renderer.renderNode(fragment, {});

          const elem = fragment.firstChild as Element;
          assert.equal(getAttribute(elem, "data-render"), null);
        });

        it("removes :render from cloned elements in :for loop", async function () {
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
              const resolved =
                getAttribute(elem, ":render") || getAttribute(elem, "data-render");
              assert.equal(resolved, null, "Each clone should have :render removed");
            }
          }
          // Should have 3 visible clones.
          assert.equal(cloneCount, 3, "Should have 3 div clones");
        });

        it("removes :render from nested elements", async function () {
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
            const resolved =
              getAttribute(elem, ":render") || getAttribute(elem, "data-render");
            assert.equal(resolved, null, `Element ${elem.tagName} should have :render removed`);
          }
        });

        it("removes :render even when element is hidden with :show=false", async function () {
          const renderer = new ctor({ visible: false });
          const html = `<div :show="visible" :render="/nonexistent.js"></div>`;
          const fragment = renderer.parseHTML(html);

          await renderer.mount(fragment);

          const elem = fragment.firstChild as Element;
          const resolved =
            getAttribute(elem, ":render") || getAttribute(elem, "data-render");
          assert.equal(resolved, null, ":render should be removed even if hidden");
        });

        it("processes :render on multiple sibling elements", async function () {
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
              const resolved =
                getAttribute(elem, ":render") || getAttribute(elem, "data-render");
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
          let elem: any = null;
          for (const node of traverse(fragment)) {
            if (getAttribute(node as Element, "class") === "chart") {
              elem = node;
              break;
            }
          }
          assert.ok(elem, "Should find element with class='chart'");

          // The init function stored what it could access at execution time.
          assert.ok(elem._initState, "Init function should have stored state");

          // chartType from :data IS available when :render executes.
          assert.equal(
            elem._initState.hasChartType,
            true,
            "chartType should be available when :render executes"
          );
          assert.equal(
            elem._initState.chartType,
            "bar",
            "chartType should be 'bar' when :render executes"
          );

          // After mount completes, the variable is still set.
          const subrenderer = elem.renderer;
          assert.equal(
            subrenderer.$.chartType,
            "bar",
            "After mount, chartType should be 'bar' from :data"
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
          let elem: any = null;
          for (const node of traverse(fragment)) {
            if (getAttribute(node as Element, "class") === "nested") {
              elem = node;
              break;
            }
          }
          assert.ok(elem, "Should find element with class='nested'");
          assert.ok(elem._initState, "Init function should have stored state");

          // The child's :data variable should be available.
          assert.equal(
            elem.renderer.$.childConfig,
            "local",
            "childConfig should be 'local'"
          );

          // The parent's variable should be accessible via $parent.
          assert.equal(
            elem._initState.parentVar,
            undefined,
            "parentVar should be undefined (fixture looks for 'inheritedVar')"
          );
          assert.equal(
            elem.renderer.$.$parent?.$.parentConfig,
            "inherited",
            "parentConfig should be accessible via $parent"
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
          let elem: any = null;
          for (const node of traverse(fragment)) {
            if (getAttribute(node as Element, "class") === "counter") {
              elem = node;
              break;
            }
          }
          assert.ok(elem, "Should find element with class='counter'");

          // The init function should have read count=5 and set count=6.
          assert.equal(elem._modifiedCount, 6, "Init should have incremented count to 6");
          assert.equal(elem.renderer.$.count, 6, "Store should have count=6");
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
          let elem: any = null;
          for (const node of traverse(fragment)) {
            if (getAttribute(node as Element, "class") === "themed") {
              elem = node;
              break;
            }
          }
          assert.ok(elem, "Should find element with class='themed'");

          // Verify nested object is accessible.
          const subrenderer = elem.renderer;
          assert.deepEqual(
            subrenderer.$.config,
            { theme: { primary: "blue", secondary: "green" } },
            "Deep config object should be accessible"
          );
          assert.equal(
            subrenderer.$.config.theme.primary,
            "blue",
            "Nested property should be accessible"
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
          let elem: any = null;
          for (const node of traverse(fragment)) {
            if (getAttribute(node as Element, "class") === "standalone") {
              elem = node;
              break;
            }
          }
          assert.ok(elem, "Should find element with class='standalone'");
          assert.ok(elem._initState, "Init function should have stored state");

          // The init function receives a subrenderer. has() checks local store only,
          // so it returns false. But get()/$.xxx accesses parent chain.
          assert.equal(elem._initState.hasChartType, false, "has() checks local store only");
          assert.equal(elem._initState.chartType, "line", "chartType accessible via parent chain");
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
          const visibleItems: any[] = [];
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
            assert.ok(elem._initState, `Item ${i} should have _initState`);
            assert.ok(elem.renderer, `Item ${i} should have renderer`);
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

            const elem = fragment.querySelector("div") as any;
            assert.ok(elem._renderedState, "Should have captured rendered state");
            assert.equal(
              elem._renderedState.textContent,
              "Hello World",
              ":render should see text content from :text"
            );
          });

          it(":render sees class after :class is applied", async function () {
            if (["htmlparser2"].includes(new ctor().impl)) this.skip();

            const renderer = new ctor();
            renderer.set("isActive", true);
            const html = `<div :data="{}" class="base" :class="isActive ? 'active' : ''" :render="./fixtures/render-init-inspect.js"></div>`;
            const fragment = renderer.parseHTML(html);
            await renderer.mount(fragment, { dirpath: "." });

            const elem = fragment.querySelector("div") as any;
            assert.ok(elem._renderedState, "Should have captured rendered state");
            assert.ok(
              elem._renderedState.className.includes("active"),
              ":render should see 'active' class from :class"
            );
            assert.ok(
              elem._renderedState.className.includes("base"),
              ":render should see original 'base' class"
            );
          });

          it(":render sees visibility after :show is applied", async function () {
            if (["htmlparser2"].includes(new ctor().impl)) this.skip();

            const renderer = new ctor();
            renderer.set("isVisible", false);
            const html = `<div :data="{}" :show="isVisible" :render="./fixtures/render-init-inspect.js"></div>`;
            const fragment = renderer.parseHTML(html);
            await renderer.mount(fragment, { dirpath: "." });

            const elem = fragment.querySelector("div") as any;
            assert.ok(elem._renderedState, "Should have captured rendered state");
            assert.equal(
              elem._renderedState.displayStyle,
              "none",
              ":render should see display:none from :show=false"
            );
          });

          it(":render sees custom attribute after :attr:* is applied", async function () {
            if (["htmlparser2"].includes(new ctor().impl)) this.skip();

            const renderer = new ctor();
            renderer.set("testId", "my-component");
            const html = `<div :data="{}" :attr:data-testid="testId" :render="./fixtures/render-init-inspect.js"></div>`;
            const fragment = renderer.parseHTML(html);
            await renderer.mount(fragment, { dirpath: "." });

            const elem = fragment.querySelector("div") as any;
            assert.ok(elem._renderedState, "Should have captured rendered state");

            // Verify the attribute was set on the element after mount.
            const attrValue = getAttribute(elem, "data-testid");
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

            const elem = fragment.querySelector("div") as any;
            assert.ok(elem._renderedState, "Should have captured rendered state");
            assert.equal(elem._renderedState.textContent, "Dashboard", "Should see :text content");
            assert.ok(elem._renderedState.className.includes("admin"), "Should see :class effect");
            assert.ok(elem._renderedState.className.includes("panel"), "Should see original class");
          });
        });
      });
    });
  });
}
