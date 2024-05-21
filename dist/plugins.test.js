"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const path = require("path");
const mocha_1 = require("mocha");
const jsdom_1 = require("jsdom");
const core_1 = require("./core");
const reactive_1 = require("./reactive");
class MockRenderer extends core_1.IRenderer {
    parseHTML(content, params) {
        return params?.root
            ? new jsdom_1.JSDOM(content).window.document
            : jsdom_1.JSDOM.fragment(content);
    }
    serializeHTML(fragment) {
        throw new Error("Not implemented.");
    }
    preprocessLocal(fpath, params) {
        throw new Error("Not implemented.");
    }
}
(0, mocha_1.describe)("Plugins", () => {
    (0, mocha_1.describe)("<include>", () => {
        [
            "http://foo.com/bar.html",
            "https://foo.com/bar.html",
            "//foo.com/bar.html",
            "//foo.com/baz/../bar.html",
        ].forEach((source) => {
            (0, mocha_1.it)(`includes a remote source using absolute path (${source})`, async () => {
                const html = `<include src="${source}"></include>`;
                const fragment = jsdom_1.JSDOM.fragment(html);
                const renderer = new MockRenderer();
                renderer.preprocessRemote = async function (fpath, params) {
                    return jsdom_1.JSDOM.fragment(`<div>${fpath}</div>`);
                };
                await renderer.mount(fragment);
                const node = fragment.firstElementChild;
                assert.equal(node.getAttribute("src"), null);
                assert.equal(node.innerHTML, source);
            });
        });
        ["/bar.html", "/baz/../bar.html"].forEach((source) => {
            (0, mocha_1.it)(`includes a local source using absolute path (${source})`, async () => {
                const html = `<include src="${source}"></include>`;
                const fragment = jsdom_1.JSDOM.fragment(html);
                const renderer = new MockRenderer();
                renderer.preprocessLocal = async function (fpath, params) {
                    return jsdom_1.JSDOM.fragment(`<div>${fpath}</div>`);
                };
                await renderer.mount(fragment, { dirpath: "/foo" });
                const node = fragment.firstElementChild;
                assert.equal(node.getAttribute("src"), null);
                assert.equal(node.innerHTML, source);
            });
        });
        ["bar.html", "./bar.html", "baz/../bar.html"].forEach((source) => {
            (0, mocha_1.it)(`includes a local source using relative path (${source})`, async () => {
                const html = `<include src="${source}"></include>`;
                const fragment = jsdom_1.JSDOM.fragment(html);
                const renderer = new MockRenderer();
                renderer.preprocessLocal = async function (fpath, params) {
                    return jsdom_1.JSDOM.fragment(`<div>${fpath}</div>`);
                };
                await renderer.mount(fragment, { dirpath: "/foo" });
                const node = fragment.firstElementChild;
                assert.equal(node.getAttribute("src"), null);
                assert.equal(node.innerHTML, `/foo/${source}`);
            });
        });
    });
    (0, mocha_1.describe)("rebase", () => {
        (0, mocha_1.it)("rebase relative paths", async () => {
            const html = `<script src="bar/baz.js"></script>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const renderer = new MockRenderer();
            await renderer.mount(fragment, { dirpath: "/foo" });
            const node = fragment.firstElementChild;
            assert.equal(node.getAttribute("src"), "/foo/bar/baz.js");
        });
        (0, mocha_1.it)("rebase (not) absolute paths", async () => {
            const html = `<script src="/foo/bar.js"></script>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const renderer = new MockRenderer();
            await renderer.mount(fragment, { dirpath: "/baz" });
            const node = fragment.firstElementChild;
            assert.equal(node.getAttribute("src"), "/foo/bar.js");
        });
        (0, mocha_1.it)("rebase relative paths with indirection", async () => {
            const html = `<include src="foo/fragment.tpl.html"></include>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const renderer = new MockRenderer();
            renderer.preprocessLocal = async function (fpath, params) {
                assert.equal(fpath, "foo/fragment.tpl.html");
                const node = jsdom_1.JSDOM.fragment(`<script src="bar/baz.js"></script>`);
                await renderer.preprocessNode(node, {
                    ...params,
                    dirpath: path.dirname(fpath),
                });
                return node;
            };
            await renderer.mount(fragment);
            const node = fragment.firstElementChild;
            assert.equal(node.getAttribute("src"), "foo/bar/baz.js");
        });
    });
    (0, mocha_1.it)("rebase relative paths with indirection and base path", async () => {
        const html = `<include src="bar/fragment.tpl.html"></include>`;
        const fragment = jsdom_1.JSDOM.fragment(html);
        const renderer = new MockRenderer();
        renderer.preprocessLocal = async function (fpath, params) {
            assert.equal(fpath, "foo/bar/fragment.tpl.html");
            const node = jsdom_1.JSDOM.fragment(`<script src="baz/qux.js"></script>`);
            await renderer.preprocessNode(node, {
                ...params,
                dirpath: path.dirname(fpath),
            });
            return node;
        };
        await renderer.mount(fragment, { dirpath: "foo" });
        const node = fragment.firstElementChild;
        assert.equal(node.getAttribute("src"), "foo/bar/baz/qux.js");
    });
    (0, mocha_1.describe)("{{ expressions }}", () => {
        (0, mocha_1.it)("resolves single variable", async () => {
            const content = "Hello {{ name }}";
            const renderer = new MockRenderer({ name: "World" });
            const fragment = jsdom_1.JSDOM.fragment(content);
            const textNode = fragment.childNodes[0];
            assert.equal(textNode.textContent, "Hello {{ name }}");
            await renderer.mount(fragment);
            assert.equal(textNode.textContent, "Hello World");
            await renderer.set("name", "Stranger");
            assert.equal(textNode.textContent, "Hello Stranger");
            await renderer.set("name", "John");
            assert.equal(textNode.textContent, "Hello John");
        });
    });
    (0, mocha_1.describe)(":data", () => {
        (0, mocha_1.it)("initializes unseen value", async () => {
            const html = `<div :data="{foo: 'bar'}"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            await renderer.mount(fragment);
            assert.equal(node.getAttribute(":data"), null);
            assert.equal(renderer.get("foo"), "bar");
        });
        (0, mocha_1.it)("initializes an array of values", async () => {
            const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            await renderer.mount(fragment);
            assert.equal(node.getAttribute(":data"), null);
            assert.deepEqual(renderer.get("arr"), [1, 2, 3]);
        });
        (0, mocha_1.it)("initializes an array of objects", async () => {
            const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            await renderer.mount(fragment);
            assert.equal(node.getAttribute(":data"), null);
            assert.deepEqual(renderer.get("arr"), [{ n: 1 }, { n: 2 }, { n: 3 }]);
        });
    });
    (0, mocha_1.describe)("@watch", () => {
        (0, mocha_1.it)("simple watch", async () => {
            const html = `<div @watch="foobar = foo + bar"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "foo", bar: "bar", foobar: null });
            await renderer.mount(fragment);
            assert.equal(node.getAttribute("@watch"), null);
            assert.equal(renderer.get("foobar"), "foobar");
            // Change one of the dependencies and observe result.
            await renderer.set("foo", "baz");
            assert.equal(renderer.get("foobar"), "bazbar");
            // Change the other dependency and observe result.
            await renderer.set("bar", "qux");
            assert.equal(renderer.get("foobar"), "bazqux");
        });
        (0, mocha_1.it)("watch nested property", async () => {
            const html = `<div @watch="foobar = foo.bar"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: { bar: "bar" }, foobar: null });
            await renderer.mount(fragment);
            assert.equal(node.getAttribute("@watch"), null);
            assert.equal(renderer.get("foobar"), "bar");
            // Set subproperty directly.
            renderer.get("foo").bar = "baz";
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.get("foobar"), "baz");
            // Replace parent object.
            await renderer.set("foo", { bar: "qux" });
            assert.equal(renderer.get("foobar"), "qux");
        });
        (0, mocha_1.it)("watch boolean expression with two variables", async () => {
            const html = `<div @watch="foobar = !foo && !bar"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: true, bar: false, foobar: null });
            await renderer.mount(fragment);
            assert.equal(node.getAttribute("@watch"), null);
            assert.equal(renderer.get("foobar"), false);
            await renderer.set("foo", false);
            assert.equal(renderer.get("foobar"), true);
        });
    });
    (0, mocha_1.describe)(":attribute", () => {
        (0, mocha_1.it)("class", async () => {
            const html = `<div :class="foo"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            await renderer.mount(fragment);
            assert.equal(node.getAttribute(":class"), null);
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.className, "bar");
        });
    });
    (0, mocha_1.describe)("$attribute", () => {
        (0, mocha_1.it)("inner-text", async () => {
            const html = `<div $inner-text="foo"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            await renderer.mount(fragment);
            assert.equal(node.getAttribute("$inner-text"), null);
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.innerText, "bar");
        });
    });
    (0, mocha_1.describe)("@attribute", () => {
        (0, mocha_1.it)("click", async () => {
            const html = `<div @click="counter++"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ counter: 0 });
            await renderer.mount(fragment);
            assert.equal(renderer.get("counter"), 0);
            node.click?.();
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.get("counter"), 1);
        });
    });
    (0, mocha_1.describe)(":for", () => {
        [0, 1, 10].forEach((n) => {
            (0, mocha_1.it)(`container with ${n} items`, async () => {
                const html = `<div :for="item in items">{{ item }}</div>`;
                const fragment = jsdom_1.JSDOM.fragment(html);
                const node = fragment.firstElementChild;
                const parent = node.parentNode;
                assert.notEqual(parent, null);
                // Create array with 0..n elements.
                const container = Array.from({ length: n }, (_, x) => String(x));
                const renderer = new MockRenderer({ items: container });
                await renderer.mount(fragment);
                assert.equal(node.getAttribute(":for"), null);
                assert.notEqual(node.parentNode, parent);
                assert.notEqual(renderer.get("item"), "foo");
                const children = Array.from(parent?.childNodes || []).slice(1);
                assert.equal(children.length, container.length);
                for (let i = 0; i < container.length; i++) {
                    assert.equal(children[i].textContent, container[i]);
                }
            });
        });
        (0, mocha_1.it)("container that updates items", async () => {
            const html = `<div :for="item in items">{{ item }}</div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            assert.notEqual(parent, null);
            // Create array with no elements.
            const renderer = new MockRenderer({ items: [] });
            await renderer.mount(fragment);
            // Confirm that there are no children except for the template element.
            const children0 = Array.from(parent?.childNodes || []);
            assert.equal(children0.length, 1);
            assert.equal(children0[0].tagName, "TEMPLATE");
            assert.equal(children0[0].firstChild, node);
            // Add a single item.
            renderer.get("items").push("foo");
            // renderer.get("items").push("foo");
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            const children1 = Array.from(parent?.childNodes || []);
            assert.equal(children1.length, renderer.get("items").length + 1);
            assert.equal(children1[1].textContent, "foo");
            // Add multiple items.
            renderer.get("items").push("bar", "baz");
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            const children2 = Array.from(parent?.childNodes || []);
            assert.equal(children2.length, renderer.get("items").length + 1);
            assert.equal(children2[1].textContent, "foo");
            assert.equal(children2[2].textContent, "bar");
            assert.equal(children2[3].textContent, "baz");
            // Remove one item.
            renderer.get("items").pop();
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            const children3 = Array.from(parent?.childNodes || []);
            assert.equal(children3.length, renderer.get("items").length + 1);
            assert.equal(children3[1].textContent, "foo");
            assert.equal(children3[2].textContent, "bar");
        });
        (0, mocha_1.it)("container does not resolve initially", async () => {
            const html = `<div :for="item in items">{{ item }}</div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            assert.notEqual(parent, null);
            // Create renderer with no array => fails.
            const renderer = new MockRenderer();
            assert.rejects(renderer.mount(fragment), /ReferenceError: items is not defined/);
            // Add a placeholder for the array, but it's not array type.
            await renderer.set("items", null);
            await renderer.mount(fragment);
            assert.equal(renderer.get("item"), null);
            assert.equal(node.getAttribute(":for"), null);
            assert.notEqual(node.parentNode, parent);
            const children = Array.from(parent?.childNodes || []);
            assert.equal(children.length, 1);
            assert.equal(children[0].tagName, "TEMPLATE");
            assert.equal(children[0].firstChild, node);
        });
        (0, mocha_1.it)("template node with attributes and properties", async () => {
            const html = `<div $myprop="item" :myattr="item" :for="item in items">{{ item }}</div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const renderer = new MockRenderer({ items: ["1", "2"] });
            await renderer.mount(fragment);
            // await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 4));
            const children12 = Array.from(fragment.childNodes).slice(1);
            assert.equal(children12.length, 2);
            assert.equal(children12[0].textContent?.trim(), "1");
            assert.equal(children12[1].textContent?.trim(), "2");
            assert.equal(children12[0]["myprop"], "1");
            assert.equal(children12[1]["myprop"], "2");
            assert.equal(children12[0].getAttribute("myattr"), "1");
            assert.equal(children12[1].getAttribute("myattr"), "2");
            await renderer.update({ items: ["a", "b"] });
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            const childrenAB = Array.from(fragment.childNodes).slice(1);
            assert.equal(childrenAB.length, 2);
            assert.equal(childrenAB[0].textContent?.trim(), "a");
            assert.equal(childrenAB[1].textContent?.trim(), "b");
            assert.equal(childrenAB[0]["myprop"], "a", 'myprop should be "a"');
            assert.equal(childrenAB[1]["myprop"], "b", 'myprop should be "b"');
            assert.equal(childrenAB[0].getAttribute("myattr"), "a");
            assert.equal(childrenAB[1].getAttribute("myattr"), "b");
        });
    });
    (0, mocha_1.describe)(":bind", () => {
        (0, mocha_1.it)("binds a text input value with existing store key", async () => {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" />`;
            const dom = new jsdom_1.JSDOM(html);
            const node = dom.window.document.body.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            await renderer.mount(dom.window.document.body);
            // Processed attributes are removed.
            assert.equal(node.getAttribute(":bind"), null);
            // Initial value is set.
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.value, "bar");
            // Update the store value, and watch the node value react.
            await renderer.set("foo", "baz");
            assert.equal(node.value, "baz");
            // Update the node value, and watch the store value react.
            node.value = "qux";
            node.dispatchEvent(new dom.window.Event("change"));
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.get("foo"), "qux");
        });
        (0, mocha_1.it)("binds a text input value with new store key", async () => {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" value="bar" />`;
            const dom = new jsdom_1.JSDOM(html);
            const node = dom.window.document.body.firstElementChild;
            // Value does not exist in store before mount().
            const renderer = new MockRenderer();
            assert.equal(renderer.get("foo"), null);
            await renderer.mount(dom.window.document.body);
            // Processed attributes are removed.
            assert.equal(node.getAttribute(":bind"), null);
            // Initial value is set.
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.value, "bar");
            // Update the store value, and watch the node value react.
            await renderer.set("foo", "baz");
            assert.equal(node.value, "baz");
            // Update the node value, and watch the store value react.
            node.value = "qux";
            node.dispatchEvent(new dom.window.Event("change"));
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.get("foo"), "qux");
        });
        (0, mocha_1.it)("binds a text input value with custom events", async () => {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" :bind-events="my-custom-event" />`;
            const dom = new jsdom_1.JSDOM(html);
            const node = dom.window.document.body.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            await renderer.mount(dom.window.document.body);
            // Processed attributes are removed.
            assert.equal(node.getAttribute(":bind"), null);
            // Initial value is set.
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.value, "bar");
            // Update the store value, and watch the node value react.
            await renderer.set("foo", "baz");
            assert.equal(node.value, "baz");
            // Update the node value, and watch the store value react only to the right event.
            node.value = "qux";
            node.dispatchEvent(new dom.window.Event("change"));
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.get("foo"), "baz");
            node.dispatchEvent(new dom.window.Event("my-custom-event"));
            await new Promise((resolve) => setTimeout(resolve, reactive_1.REACTIVE_DEBOUNCE_MILLIS * 3));
            assert.equal(renderer.get("foo"), "qux");
        });
    });
    (0, mocha_1.describe)(":show", () => {
        (0, mocha_1.it)("shows then hides an element", async () => {
            const html = `<div :show="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: true });
            await renderer.mount(fragment);
            assert.ok(!node.hasAttribute(":show"));
            assert.notEqual(node.style.display, "none");
            await renderer.set("foo", false);
            assert.equal(node.style.display, "none");
        });
        (0, mocha_1.it)("hides then shows an element", async () => {
            const html = `<div :show="foo" style="display: bar" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: false });
            await renderer.mount(fragment);
            assert.ok(!node.hasAttribute(":show"));
            assert.equal(node.style.display, "none");
            await renderer.set("foo", true);
            assert.equal(node.style.display, "bar");
        });
        (0, mocha_1.it)("hides an element based on data from the same element", async () => {
            const html = `<div :data="{show: false}" :show="show" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            await renderer.mount(fragment);
            assert.ok(!node.hasAttribute(":show"));
            assert.equal(node.style.display, "none");
            await renderer.set("show", true);
            assert.notEqual(node.style.display, "none");
        });
    });
    (0, mocha_1.describe)("$html", () => {
        (0, mocha_1.it)("render simple HTML", async () => {
            const html = `<div $html="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const inner = "<div>bar</div>";
            const renderer = new MockRenderer({ foo: inner });
            await renderer.mount(fragment);
            assert.equal(node.innerHTML, inner);
            assert.equal(node.childElementCount, 1);
        });
        (0, mocha_1.it)("render contents of HTML", async () => {
            const html = `<div $html="foo"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const inner = "<div>{{ bar }}</div>";
            const renderer = new MockRenderer({ foo: inner, bar: "Hello World" });
            await renderer.mount(fragment);
            assert.equal(node.firstChild?.textContent, "Hello World");
            // Modify content and observe changes.
            await renderer.set("bar", "Goodbye World");
            assert.equal(node.firstChild?.textContent, "Goodbye World");
        });
        (0, mocha_1.it)("render HTML within a :for", async () => {
            const html = `<div :for="item in items" $html="inner"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const renderer = new MockRenderer({
                items: [{ text: "foo" }, { text: "bar" }],
                inner: `<span $text="item.text"></span>`,
            });
            await renderer.mount(fragment);
            const children = Array.from(fragment.childNodes).slice(1);
            assert.equal(children.length, 2);
            assert.equal(children[0].firstChild?.textContent, "foo");
            assert.equal(children[1].firstChild?.textContent, "bar");
        });
    });
    (0, mocha_1.describe)("shorthands", () => {
        (0, mocha_1.it)("$text", async () => {
            const html = `<div $text="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            await renderer.mount(fragment);
            assert.equal(node.textContent, "bar");
        });
    });
});
