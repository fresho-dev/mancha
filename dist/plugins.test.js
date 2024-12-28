import * as assert from "assert";
import * as path from "path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { Renderer as NodeRenderer } from "./index.js";
import { Renderer as WorkerRenderer } from "./worker.js";
import { getAttribute } from "./dome.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./store.js";
import { getTextContent, innerHTML } from "./test_utils.js";
function testRenderers(testName, testCode, rendererClasses = {}) {
    for (const [label, ctor] of Object.entries(rendererClasses)) {
        describe(label, () => {
            it(testName, async () => {
                try {
                    await testCode(ctor);
                }
                catch (exc) {
                    console.error(exc);
                    assert.fail(exc);
                }
            });
        });
    }
}
describe("Plugins", () => {
    describe("<include>", () => {
        [
            "http://foo.com/bar.html",
            "https://foo.com/bar.html",
            "//foo.com/bar.html",
            "//foo.com/baz/../bar.html",
        ].forEach((source) => {
            testRenderers(`includes a remote source using absolute path (${source})`, async (ctor) => {
                const renderer = new ctor();
                const html = `<include src="${source}"></include>`;
                const fragment = renderer.parseHTML(html);
                renderer.preprocessRemote = async function (fpath, params) {
                    return renderer.parseHTML(`<div>${fpath}</div>`);
                };
                await renderer.mount(fragment);
                const node = fragment.firstChild;
                assert.equal(getAttribute(node, "src"), null);
                assert.equal(getTextContent(node), source);
            }, { NodeRenderer, WorkerRenderer });
        });
        ["/bar.html", "/baz/../bar.html"].forEach((source) => {
            testRenderers(`includes a local source using absolute path (${source})`, async (ctor) => {
                const renderer = new ctor();
                const html = `<include src="${source}"></include>`;
                const fragment = renderer.parseHTML(html);
                renderer.preprocessLocal = async function (fpath, params) {
                    return renderer.parseHTML(`<div>${fpath}</div>`);
                };
                await renderer.mount(fragment, { dirpath: "/foo" });
                const node = fragment.firstChild;
                assert.equal(getAttribute(node, "src"), null);
                assert.equal(getTextContent(node), source);
            }, { NodeRenderer, WorkerRenderer });
        });
        ["bar.html", "./bar.html", "baz/../bar.html"].forEach((source) => {
            testRenderers(`includes a local source using relative path (${source})`, async (ctor) => {
                const renderer = new ctor();
                const html = `<include src="${source}"></include>`;
                const fragment = renderer.parseHTML(html);
                renderer.preprocessLocal = async function (fpath, params) {
                    return renderer.parseHTML(`<div>${fpath}</div>`);
                };
                await renderer.mount(fragment, { dirpath: "/foo" });
                const node = fragment.firstChild;
                assert.equal(getAttribute(node, "src"), null);
                assert.equal(getTextContent(node), `/foo/${source}`);
            }, { NodeRenderer, WorkerRenderer });
        });
        testRenderers(`propagates attributes to first child`, async (ctor) => {
            const renderer = new ctor({ a: "foo", b: "bar" });
            const html = `<include src="foo.html" :on:click="fn()" :class="a" :text="b"></include>`;
            const fragment = renderer.parseHTML(html);
            renderer.preprocessLocal = async function (fpath, params) {
                return renderer.parseHTML(`<span>Hello</span> <span>World</span>`);
            };
            await renderer.mount(fragment);
            const node = fragment.firstChild;
            console.log("node", renderer.serializeHTML(node));
            assert.equal(getAttribute(node, "src"), null);
            assert.equal(getAttribute(node, ":on:click"), null);
            assert.equal(getAttribute(node, "class"), "foo");
            assert.equal(getTextContent(node), "bar");
        }, { NodeRenderer });
    });
    describe("rebase", () => {
        testRenderers("rebase relative paths", async (ctor) => {
            const renderer = new ctor();
            const html = `<img src="bar/baz.jpg"></img>`;
            const fragment = renderer.parseHTML(html);
            await renderer.mount(fragment, { dirpath: "/foo" });
            const node = fragment.firstChild;
            assert.equal(node.src, "/foo/bar/baz.jpg");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("rebase (not) absolute paths", async (ctor) => {
            const renderer = new ctor();
            const html = `<img src="/foo/bar.jpg"></img>`;
            const fragment = renderer.parseHTML(html);
            await renderer.mount(fragment, { dirpath: "/baz" });
            const node = fragment.firstChild;
            assert.equal(node.src || getAttribute(node, "src"), "/foo/bar.jpg");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("rebase relative paths with indirection", async (ctor) => {
            const renderer = new ctor();
            const html = `<include src="foo/fragment.tpl.html"></include>`;
            const fragment = renderer.parseHTML(html);
            renderer.preprocessLocal = async function (fpath, params) {
                assert.equal(fpath, "foo/fragment.tpl.html");
                const node = renderer.parseHTML(`<img src="bar/baz.jpg"></img>`);
                await renderer.preprocessNode(node, {
                    ...params,
                    dirpath: path.dirname(fpath),
                });
                return node;
            };
            await renderer.mount(fragment);
            const node = fragment.firstChild;
            assert.equal(node.src, "foo/bar/baz.jpg");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("rebase relative paths with indirection and base path", async (ctor) => {
            const renderer = new ctor();
            const html = `<include src="bar/fragment.tpl.html"></include>`;
            const fragment = renderer.parseHTML(html);
            renderer.preprocessLocal = async function (fpath, params) {
                assert.equal(fpath, "foo/bar/fragment.tpl.html");
                const node = renderer.parseHTML(`<img src="baz/qux.jpg"></img>`);
                await renderer.preprocessNode(node, {
                    ...params,
                    dirpath: path.dirname(fpath),
                });
                return node;
            };
            await renderer.mount(fragment, { dirpath: "foo" });
            const node = fragment.firstChild;
            assert.equal(node.src, "foo/bar/baz/qux.jpg");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe("<custom-element>", () => {
        testRenderers("custom element with :text and :class attributes", async (ctor) => {
            const renderer = new ctor({ a: "foo", b: "bar" });
            const customElement = "<span>Hello World</span>";
            const template = `<template is="custom-element">${customElement}</template>`;
            const html = `<custom-element :text="a" :class="b"></custom-element>`;
            const fragment = renderer.parseHTML(template + html);
            await renderer.mount(fragment);
            const node = fragment.firstChild;
            assert.equal(node.tagName.toLowerCase(), "span");
            assert.equal(getTextContent(node), "foo");
            assert.equal(getAttribute(node, "class"), "bar");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("custom element with :data attribute", async (ctor) => {
            const renderer = new ctor();
            const customElement = "<span>{{ foo.bar }}</span>";
            const template = `<template is="custom-element">${customElement}</template>`;
            const html = `<custom-element :data="{ foo: { bar: 'baz' } }"></custom-element>`;
            const fragment = renderer.parseHTML(template + html);
            await renderer.mount(fragment);
            const node = fragment.firstChild;
            assert.equal(node.tagName.toLowerCase(), "span");
            assert.equal(getTextContent(node), "baz");
            assert.equal(getAttribute(node, ":data"), null);
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("custom element with <slot/>", async (ctor) => {
            const renderer = new ctor({ foo: "bar" });
            const customElement = "<span><slot/></span>";
            const template = `<template is="custom-element">${customElement}</template>`;
            const html = `<custom-element>{{ foo }}</custom-element>`;
            const fragment = renderer.parseHTML(template + html);
            await renderer.mount(fragment);
            const node = fragment.firstChild;
            assert.equal(node.tagName.toLowerCase(), "span");
            assert.equal(getTextContent(node), "bar");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("custom element from include", async (ctor) => {
            const renderer = new ctor();
            const html = `<custom-element></custom-element>`;
            const include = `<include src="foo.html"></include>`;
            const fragment = renderer.parseHTML(include + html);
            renderer.preprocessLocal = async function (fpath, params) {
                const customElement = "<span>Hello World</span>";
                const template = `<template is="custom-element">${customElement}</template>`;
                return this.preprocessString(template);
            };
            await renderer.mount(fragment);
            const node = fragment.firstChild;
            assert.equal(node.tagName.toLowerCase(), "span");
            assert.equal(getTextContent(node), "Hello World");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe("{{ expressions }}", () => {
        testRenderers("resolves single variable", async (ctor) => {
            const content = "Hello {{ name }}";
            const renderer = new ctor({ name: "World" });
            const fragment = renderer.parseHTML(content);
            const textNode = fragment.childNodes[0];
            assert.equal(textNode.data, "Hello {{ name }}");
            await renderer.mount(fragment);
            assert.equal(textNode.data, "Hello World");
            renderer.set("name", "Stranger");
            await new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(textNode.data, "Hello Stranger");
            renderer.set("name", "John");
            await new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(textNode.data, "Hello John");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":data", () => {
        testRenderers("initializes unseen value", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :data="{foo: 'bar'}"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            const subrenderer = node.renderer;
            assert.equal(getAttribute(node, ":data"), null);
            assert.equal(subrenderer.$.foo, "bar");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("initializes an array of values", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            const subrenderer = node.renderer;
            assert.equal(getAttribute(node, ":data"), null);
            assert.deepEqual(subrenderer.$.arr, [1, 2, 3]);
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("initializes an array of objects", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            const subrenderer = node.renderer;
            assert.equal(getAttribute(node, ":data"), null);
            assert.deepEqual(subrenderer.$.arr, [{ n: 1 }, { n: 2 }, { n: 3 }]);
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("initializes avoiding subrenderer", async (ctor) => {
            const renderer = new ctor({ foo: 1, bar: 2 });
            const html = `<div :data="{ baz: 3 }"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            // Mount the node directly, otherwise it's not the root node.
            await renderer.mount(node);
            assert.equal(renderer, node.renderer);
            assert.equal(getAttribute(node, ":data"), null);
            // The renderer has all the initial properties + the new one.
            assert.equal(renderer.get("foo"), 1);
            assert.equal(renderer.get("bar"), 2);
            assert.equal(renderer.get("baz"), 3);
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("initializes using subrenderer", async (ctor) => {
            const renderer = new ctor({ foo: 1, bar: 2 });
            const html = `<div><div :data="{ baz: 3 }"></div><div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            // Mount the node directly, otherwise it's not the root node.
            await renderer.mount(node);
            const subnode = node.firstChild;
            const subrenderer = subnode.renderer;
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
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":class", () => {
        testRenderers("single class", async (ctor) => {
            const renderer = new ctor({ foo: "bar" });
            const html = `<div :class="foo"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            assert.equal(getAttribute(node, ":class"), null);
            assert.equal(renderer.$.foo, "bar");
            assert.equal(getAttribute(node, "class"), "bar");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("multiple classes", async (ctor) => {
            const renderer = new ctor({ foo: "bar" });
            const html = `<div class="foo" :class="foo"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            assert.equal(getAttribute(node, ":class"), null);
            assert.equal(renderer.$.foo, "bar");
            assert.equal(renderer.$.bar, "baz");
            assert.equal(getAttribute(node, "class"), "foo bar");
        });
    });
    describe("on:event", () => {
        testRenderers("click", async (ctor) => {
            const renderer = new ctor({ counter: 0 });
            const html = `<div :on:click="counter = counter + 1"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            assert.equal(renderer.$.counter, 0);
            node.click?.();
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.$.counter, 1);
        }, 
        // We don't expect events to work with Wor`kerRenderer.
        { NodeRenderer });
    });
    describe(":for", () => {
        [0, 1, 10].forEach((n) => {
            testRenderers(`container with ${n} items`, async (ctor) => {
                const renderer = new ctor();
                const html = `<div :for="item in items">{{ item }}</div>`;
                const fragment = renderer.parseHTML(html);
                const node = fragment.firstChild;
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
                    assert.equal(getTextContent(children[i]), container[i]);
                }
            }, { NodeRenderer, WorkerRenderer });
        });
        testRenderers("container that updates items", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :for="item in items">{{ item }}</div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            const parent = node.parentNode;
            assert.notEqual(parent, null);
            // Create array with no elements.
            renderer.set("items", []);
            await renderer.mount(fragment);
            // Confirm that there are no children except for the template element.
            const children0 = Array.from(parent?.childNodes || []);
            assert.equal(children0.length, 1);
            assert.equal(children0[0].tagName.toLowerCase(), "template");
            assert.equal(children0[0].firstChild, node);
            // Add a single item.
            renderer.$.items = ["foo"];
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            const children1 = Array.from(parent?.childNodes || []);
            assert.equal(children1.length, renderer.$.items.length + 1);
            assert.equal(getTextContent(children1[1]), "foo");
            // Add multiple items.
            renderer.$.items.push("bar", "baz");
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            const children2 = Array.from(parent?.childNodes || []);
            assert.equal(children2.length, renderer.$.items.length + 1);
            assert.equal(getTextContent(children2[1]), "foo");
            assert.equal(getTextContent(children2[2]), "bar");
            assert.equal(getTextContent(children2[3]), "baz");
            // Remove one item.
            renderer.$.items.pop();
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            const children3 = Array.from(parent?.childNodes || []);
            assert.equal(children3.length, renderer.$.items.length + 1);
            assert.equal(getTextContent(children3[1]), "foo");
            assert.equal(getTextContent(children3[2]), "bar");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("container does not resolve initially", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :for="item in items">{{ item }}</div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            const parent = node.parentNode;
            assert.notEqual(parent, null);
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
            assert.equal(children[0].tagName.toLowerCase(), "template");
            assert.equal(children[0].firstChild, node);
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("template node with :text property", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :text="item" :for="item in items"></div>`;
            const fragment = renderer.parseHTML(html);
            renderer.set("items", ["1", "2"]);
            await renderer.mount(fragment);
            const children12 = Array.from(fragment.childNodes).slice(1);
            assert.equal(children12.length, 2);
            assert.equal(getTextContent(children12[0])?.trim(), "1");
            assert.equal(getTextContent(children12[1])?.trim(), "2");
            await renderer.set("items", ["a", "b"]);
            const childrenAB = Array.from(fragment.childNodes).slice(1);
            assert.equal(childrenAB.length, 2);
            assert.equal(getTextContent(childrenAB[0])?.trim(), "a");
            assert.equal(getTextContent(childrenAB[1])?.trim(), "b");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers(`container with object items`, async (ctor) => {
            const renderer = new ctor();
            const html = `<div :for="item in items">{{ item.text }}</div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
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
                assert.equal(getTextContent(children[i]), container[i].text);
            }
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":bind", () => {
        testRenderers("binds a text input value with existing store key", async (ctor) => {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" />`;
            const dom = new JSDOM(html);
            const doc = dom.window.document;
            const node = doc.body.firstChild;
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
            node.dispatchEvent(new dom.window.Event("change"));
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            assert.equal(renderer.get("foo"), "qux");
        }, 
        // We don't expect events to work with WorkerRenderer.
        { NodeRenderer });
        testRenderers("fails to bind a text input value with undefined variable", async (ctor) => {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" />`;
            const dom = new JSDOM(html, {});
            const doc = dom.window.document;
            // Value does not exist in store before mount().
            const renderer = new ctor();
            assert.equal(renderer.has("foo"), false);
            // After mount(), the value is still not in the store.
            await renderer.mount(doc.body);
            assert.equal(renderer.has("foo"), false);
        }, 
        // We don't expect events to work with WorkerRenderer.
        { NodeRenderer });
        testRenderers("binds a text input value with custom events", async (ctor) => {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" :bind:on="my-custom-event" />`;
            const dom = new JSDOM(html);
            const doc = dom.window.document;
            const node = doc.body.firstChild;
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
            node.dispatchEvent(new dom.window.Event("change"));
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            assert.equal(renderer.get("foo"), "baz");
            node.dispatchEvent(new dom.window.Event("my-custom-event"));
            await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
            assert.equal(renderer.get("foo"), "qux");
        }, 
        // We don't expect events to work with WorkerRenderer.
        { NodeRenderer });
    });
    describe(":show", () => {
        testRenderers("shows then hides an element", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :show="foo" />`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            renderer.set("foo", true);
            await renderer.mount(fragment);
            assert.ok(!node.hasAttribute?.(":show"));
            assert.notEqual(getAttribute(node, "style"), "display: none;");
            assert.notEqual(node.style?.display, "none");
            await renderer.set("foo", false);
            assert.equal(getAttribute(node, "style"), "display: none;");
            assert.equal(node.style?.display ?? "none", "none");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("hides then shows an element", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :show="foo" style="display: bar;" />`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            renderer.set("foo", false);
            await renderer.mount(fragment);
            assert.ok(!node.hasAttribute?.(":show"));
            assert.equal(getAttribute(node, "style"), "display: none;");
            assert.equal(node.style?.display ?? "none", "none");
            await renderer.set("foo", true);
            assert.equal(getAttribute(node, "style"), "display: bar;");
            assert.equal(node.style?.display ?? "bar", "bar");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("hides an element based on data from the same element", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :data="{ show: false }" :show="show" />`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            const subrenderer = node.renderer;
            assert.ok(!node.hasAttribute?.(":show"));
            assert.equal(getAttribute(node, "style"), "display: none;");
            assert.equal(node.style?.display ?? "none", "none");
            await subrenderer.set("show", true);
            assert.notEqual(getAttribute(node, "style"), "display: none;");
            assert.notEqual(node.style?.display, "none");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":text", () => {
        testRenderers("render simple text string", async (ctor) => {
            const renderer = new ctor({ foo: "bar" });
            const html = `<div :text="foo"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            assert.equal(getAttribute(node, ":text"), null);
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(getTextContent(node), "bar");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":html", () => {
        testRenderers("render simple HTML", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :html="foo" />`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            const inner = "<div>bar</div>";
            renderer.set("foo", inner);
            await renderer.mount(fragment);
            assert.equal(innerHTML(node), inner);
            assert.equal(node.childNodes.length, 1);
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("render contents of HTML", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :html="foo"></div>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            const inner = "<div>{{ bar }}</div>";
            renderer.set("foo", inner);
            renderer.set("bar", "Hello World");
            await renderer.mount(fragment);
            assert.equal(getTextContent(node.firstChild?.firstChild), "Hello World");
            // Modify content and observe changes.
            await renderer.set("bar", "Goodbye World");
            assert.equal(getTextContent(node.firstChild?.firstChild), "Goodbye World");
        }, { NodeRenderer, WorkerRenderer });
        testRenderers("render HTML within a :for", async (ctor) => {
            const renderer = new ctor();
            const html = `<div :for="item in items" :html="$parent.inner"></div>`;
            const fragment = renderer.parseHTML(html);
            renderer.set("items", [{ text: "foo" }, { text: "bar" }]);
            renderer.set("inner", `<span :text="item.text"></span>`);
            await renderer.mount(fragment);
            const children = Array.from(fragment.childNodes).slice(1);
            assert.equal(children.length, 2);
            assert.equal(getTextContent(children[0]), "foo");
            assert.equal(getTextContent(children[1]), "bar");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":attr", () => {
        testRenderers("processes arbitrary attributes", async (ctor) => {
            const renderer = new ctor({ foo: "example.com" });
            const html = `<a :attr:custom-attr="foo"></a>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            assert.equal(getAttribute(node, ":attr:custom-attr"), null);
            assert.equal(getAttribute(node, "custom-attr"), "example.com");
        }, { NodeRenderer, WorkerRenderer });
    });
    describe(":prop", () => {
        testRenderers("processes arbitrary properties", async (ctor) => {
            const renderer = new ctor({ foo: "example.com" });
            const html = `<a :prop:custom-prop="foo"></a>`;
            const fragment = renderer.parseHTML(html);
            const node = fragment.firstChild;
            await renderer.mount(fragment);
            assert.equal(getAttribute(node, "custom-prop"), null);
            assert.equal(getAttribute(node, ":prop:href"), null);
            assert.equal(node.customProp, "example.com");
        }, { NodeRenderer, WorkerRenderer });
    });
});
