import * as assert from "assert";
import * as path from "path";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";
import { Renderer as NodeRenderer } from "./index.js";
import { Renderer as WorkerRenderer } from "./worker.js";
import { getAttribute, innerHTML, getTextContent } from "./dome.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./store.js";

class MockRenderer extends IRenderer {
  parseHTML(content: string, params?: ParserParams): DocumentFragment {
    return JSDOM.fragment(content);
  }
  serializeHTML(fragment: DocumentFragment): string {
    throw new Error("Not implemented.");
  }
  preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

function testRenderers(
  testName: string,
  testCode: (ctor: new (...args: any[]) => IRenderer) => Promise<any>,
  rendererClasses: { [label: string]: new (...args: any[]) => IRenderer } = {}
) {
  for (const [label, ctor] of Object.entries(rendererClasses)) {
    describe(label, () => {
      it(testName, () => testCode(ctor));
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
      testRenderers(
        `includes a remote source using absolute path (${source})`,
        async (ctor) => {
          const renderer = new ctor();
          const html = `<include src="${source}"></include>`;
          const fragment = renderer.parseHTML(html);

          renderer.preprocessRemote = async function (fpath, params) {
            return renderer.parseHTML(`<div>${fpath}</div>`) as unknown as DocumentFragment;
          };
          await renderer.mount(fragment);

          const node = fragment.firstChild as Element;
          assert.equal(getAttribute(node, "src"), null);
          assert.equal(getTextContent(node), source);
        },
        { MockRenderer, NodeRenderer, WorkerRenderer }
      );
    });

    ["/bar.html", "/baz/../bar.html"].forEach((source) => {
      testRenderers(
        `includes a local source using absolute path (${source})`,
        async (ctor) => {
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
        },
        { MockRenderer, NodeRenderer, WorkerRenderer }
      );
    });

    ["bar.html", "./bar.html", "baz/../bar.html"].forEach((source) => {
      testRenderers(
        `includes a local source using relative path (${source})`,
        async (ctor) => {
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
        },
        { MockRenderer, NodeRenderer, WorkerRenderer }
      );
    });

    testRenderers(
      `propagates attributes to first child`,
      async (ctor) => {
        const renderer = new ctor({ a: 1, b: 2 });
        const html = `<include src="foo.html" attr="bar" :foo="a" $bar="b"></include>`;
        const fragment = renderer.parseHTML(html);

        renderer.preprocessLocal = async function (fpath, params) {
          return renderer.parseHTML(
            `<span>Hello</span> <span>World</span>`
          ) as unknown as DocumentFragment;
        };
        await renderer.mount(fragment);

        const node = fragment.firstChild as Element;
        assert.equal(getAttribute(node, "src"), null);
        assert.equal(getAttribute(node, "attr"), "bar");
        assert.equal(getAttribute(node.nextSibling as Element, "attr"), null);
        assert.equal(getAttribute(node, "foo"), "1");
        assert.equal((node as any).bar, 2);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("rebase", () => {
    testRenderers(
      "rebase relative paths",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<script src="bar/baz.js"></script>`;
        const fragment = renderer.parseHTML(html);

        await renderer.mount(fragment, { dirpath: "/foo" });

        const node = fragment.firstChild as Element;
        assert.equal(getAttribute(node, "src"), "/foo/bar/baz.js");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "rebase (not) absolute paths",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<script src="/foo/bar.js"></script>`;
        const fragment = renderer.parseHTML(html);

        await renderer.mount(fragment, { dirpath: "/baz" });

        const node = fragment.firstChild as Element;
        assert.equal(getAttribute(node, "src"), "/foo/bar.js");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "rebase relative paths with indirection",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<include src="foo/fragment.tpl.html"></include>`;
        const fragment = renderer.parseHTML(html);

        renderer.preprocessLocal = async function (fpath, params) {
          assert.equal(fpath, "foo/fragment.tpl.html");
          const node = renderer.parseHTML(`<script src="bar/baz.js"></script>`);
          await renderer.preprocessNode(node, {
            ...params,
            dirpath: path.dirname(fpath),
          });
          return node;
        };
        await renderer.mount(fragment);

        const node = fragment.firstChild as Element;
        assert.equal(getAttribute(node, "src"), "foo/bar/baz.js");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "rebase relative paths with indirection and base path",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<include src="bar/fragment.tpl.html"></include>`;
        const fragment = renderer.parseHTML(html);

        renderer.preprocessLocal = async function (fpath, params) {
          assert.equal(fpath, "foo/bar/fragment.tpl.html");
          const node = renderer.parseHTML(`<script src="baz/qux.js"></script>`);
          await renderer.preprocessNode(node, {
            ...params,
            dirpath: path.dirname(fpath),
          });
          return node;
        };
        await renderer.mount(fragment, { dirpath: "foo" });

        const node = fragment.firstChild as Element;
        assert.equal(getAttribute(node, "src"), "foo/bar/baz/qux.js");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("<custom-element>", () => {
    testRenderers(
      "custom element with attributes and properties",
      async (ctor) => {
        const renderer = new ctor({ a: 1, b: 2 });
        const customElement = "<span>Hello World</span>";
        const template = `<template is="custom-element">${customElement}</template>`;
        const html = `<custom-element foo="bar" :attr="a" $prop="b"></custom-element>`;
        const fragment = renderer.parseHTML(template + html);
        await renderer.mount(fragment);
        const node = fragment.firstChild as Element;
        assert.equal(node.tagName.toLowerCase(), "span");
        assert.equal(getTextContent(node), "Hello World");
        assert.equal(getAttribute(node, "foo"), "bar");
        assert.equal(getAttribute(node, "attr"), "1");
        assert.equal((node as any).prop, 2);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "custom element with :data attribute",
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "custom element with <slot/>",
      async (ctor) => {
        const renderer = new ctor({ foo: "bar" });
        const customElement = "<span><slot/></span>";
        const template = `<template is="custom-element">${customElement}</template>`;
        const html = `<custom-element>{{ foo }}</custom-element>`;
        const fragment = renderer.parseHTML(template + html);
        await renderer.mount(fragment);
        const node = fragment.firstChild as Element;
        assert.equal(node.tagName.toLowerCase(), "span");
        assert.equal(getTextContent(node), "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "custom element from include",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<custom-element></custom-element>`;
        const include = `<include src="foo.html"></include>`;
        const fragment = renderer.parseHTML(include + html);
        renderer.preprocessLocal = async function (fpath, params) {
          const customElement = "<span>Hello World</span>";
          const template = `<template is="custom-element">${customElement}</template>`;
          return this.preprocessString(template) as unknown as DocumentFragment;
        };
        await renderer.mount(fragment);

        const node = fragment.firstChild as Element;
        assert.equal(node.tagName.toLowerCase(), "span");
        assert.equal(getTextContent(node), "Hello World");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("{{ expressions }}", () => {
    testRenderers(
      "resolves single variable",
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe(":data", () => {
    testRenderers(
      "initializes unseen value",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{foo: 'bar'}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.equal(subrenderer.$.foo, "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "initializes an array of values",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.deepEqual(subrenderer.$.arr, [1, 2, 3]);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "initializes an array of objects",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.deepEqual(subrenderer.$.arr, [{ n: 1 }, { n: 2 }, { n: 3 }]);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "initializes avoiding subrenderer",
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "initializes using subrenderer",
      async (ctor) => {
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

        // The subrenderer has all the properties + the new one.
        assert.equal(subrenderer.$.foo, 1);
        assert.equal(subrenderer.$.bar, 2);
        assert.equal(subrenderer.$.baz, 3);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "initializes async values",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{x: await Promise.resolve(1)}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        const subrenderer = (node as any).renderer;
        assert.equal(getAttribute(node, ":data"), null);
        assert.equal(subrenderer.$.x, 1);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("@watch", () => {
    testRenderers(
      "simple watch",
      async (ctor) => {
        const renderer = new ctor({ foo: "foo", bar: "bar", foobar: null });
        const html = `<div @watch="foobar = foo + bar"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        assert.equal(getAttribute(node, "@watch"), null);
        assert.equal(renderer.$.foobar, "foobar");

        // Change one of the dependencies and observe result.
        renderer.set("foo", "baz");
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(renderer.$.foobar, "bazbar");

        // Change the other dependency and observe result.
        renderer.set("bar", "qux");
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(renderer.$.foobar, "bazqux");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "watch nested property",
      async (ctor) => {
        const renderer = new ctor({ foo: { bar: "bar" }, foobar: null });
        const html = `<div @watch="foobar = foo.bar"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);
        assert.equal(getAttribute(node, "@watch"), null);
        assert.equal(renderer.$.foobar, "bar");

        // Set subproperty directly.
        renderer.$.foo!!.bar = "baz";
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(renderer.$.foobar, "baz");

        // Replace parent object.
        renderer.set("foo", { bar: "qux" });
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(renderer.$.foobar, "qux");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "watch boolean expression with two variables",
      async (ctor) => {
        const renderer = new ctor({ foo: true, bar: false, foobar: null });
        const html = `<div @watch="foobar = !foo && !bar"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as Element;
        await renderer.mount(fragment);

        assert.equal(getAttribute(node, "@watch"), null);
        assert.equal(renderer.$.foobar, false);

        renderer.$.foo = false;
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(renderer.$.foobar, true);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe(":attribute", () => {
    testRenderers(
      "class",
      async (ctor) => {
        const renderer = new ctor({ foo: "bar" });
        const html = `<div :class="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(getAttribute(node, ":class"), null);
        assert.equal(renderer.$.foo, "bar");
        assert.equal(getAttribute(node, "class"), "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("$attribute", () => {
    testRenderers(
      "custom-attribute",
      async (ctor) => {
        const renderer = new ctor({ foo: "bar" });
        const html = `<div $custom-attribute="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(getAttribute(node, "$custom-attribute"), null);
        assert.equal(renderer.$.foo, "bar");
        assert.equal((node as any)["customAttribute"], "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("@attribute", () => {
    testRenderers(
      "click",
      async (ctor) => {
        const renderer = new ctor({ counter: 0 });
        const html = `<div @click="counter++"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(renderer.$.counter, 0);

        node.click?.();
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        assert.equal(renderer.$.counter, 1);
      },
      // We don't expect events to work with Wor`kerRenderer.
      { MockRenderer, NodeRenderer }
    );
  });

  describe(":for", () => {
    [0, 1, 10].forEach((n) => {
      testRenderers(
        `container with ${n} items`,
        async (ctor) => {
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
        },
        { MockRenderer, NodeRenderer, WorkerRenderer }
      );
    });

    testRenderers(
      "container that updates items",
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "container does not resolve initially",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :for="item in items">{{ item }}</div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        const parent = node.parentNode;
        assert.notEqual(parent, null);

        // Create renderer with no array => fails.
        await assert.rejects(renderer.mount(fragment), /ReferenceError: items is not defined/);

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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "template node with attributes and properties",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $myprop="item" :myattr="item" :for="item in items">{{ item }}</div>`;
        const fragment = renderer.parseHTML(html);

        renderer.set("items", ["1", "2"]);
        await renderer.mount(fragment);

        const children12 = Array.from(fragment.childNodes).slice(1);
        assert.equal(children12.length, 2);
        assert.equal(getTextContent(children12[0] as Element)?.trim(), "1");
        assert.equal(getTextContent(children12[1] as Element)?.trim(), "2");
        assert.equal((children12[0] as any)["myprop"], "1");
        assert.equal((children12[1] as any)["myprop"], "2");
        assert.equal(getAttribute(children12[0] as Element, "myattr"), "1");
        assert.equal(getAttribute(children12[1] as Element, "myattr"), "2");

        await renderer.set("items", ["a", "b"]);
        const childrenAB = Array.from(fragment.childNodes).slice(1);
        assert.equal(childrenAB.length, 2);
        assert.equal(getTextContent(childrenAB[0] as Element)?.trim(), "a");
        assert.equal(getTextContent(childrenAB[1] as Element)?.trim(), "b");
        assert.equal((childrenAB[0] as any)["myprop"], "a", 'myprop should be "a"');
        assert.equal((childrenAB[1] as any)["myprop"], "b", 'myprop should be "b"');
        assert.equal(getAttribute(childrenAB[0] as Element, "myattr"), "a");
        assert.equal(getAttribute(childrenAB[1] as Element, "myattr"), "b");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      `container with object items`,
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe(":bind", () => {
    testRenderers(
      "binds a text input value with existing store key",
      async (ctor) => {
        // Since we're dealing with events, we need to create a full document.
        const html = `<input :bind="foo" />`;
        const dom = new JSDOM(html);
        const doc = dom.window.document;
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
        node.dispatchEvent(new dom.window.Event("change"));
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
        assert.equal(renderer.get("foo"), "qux");
      },
      // We don't expect events to work with WorkerRenderer.
      { MockRenderer, NodeRenderer }
    );

    testRenderers(
      "fails to bind a text input value with undefined variable",
      async (ctor) => {
        // Since we're dealing with events, we need to create a full document.
        const html = `<input :bind="foo" />`;
        const dom = new JSDOM(html, {});
        const doc = dom.window.document;

        // Value does not exist in store before mount().
        const renderer = new ctor();
        assert.equal(renderer.has("foo"), false);
        await assert.rejects(renderer.mount(doc.body), /ReferenceError: foo is not defined/);
      },
      // We don't expect events to work with WorkerRenderer.
      { MockRenderer, NodeRenderer }
    );

    testRenderers(
      "binds a text input value with custom events",
      async (ctor) => {
        // Since we're dealing with events, we need to create a full document.
        const html = `<input :bind="foo" :bind-events="my-custom-event" />`;
        const dom = new JSDOM(html);
        const doc = dom.window.document;
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
        node.dispatchEvent(new dom.window.Event("change"));
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
        assert.equal(renderer.get("foo"), "baz");
        node.dispatchEvent(new dom.window.Event("my-custom-event"));
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
        assert.equal(renderer.get("foo"), "qux");
      },
      // We don't expect events to work with WorkerRenderer.
      { MockRenderer, NodeRenderer }
    );
  });

  describe(":show", () => {
    testRenderers(
      "shows then hides an element",
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "hides then shows an element",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :show="foo" style="display: bar;" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;

        renderer.set("foo", false);
        await renderer.mount(fragment);

        assert.ok(!node.hasAttribute?.(":show"));
        assert.equal(getAttribute(node, "style"), "display: none;");
        assert.equal((node as HTMLElement).style?.display ?? "none", "none");

        await renderer.set("foo", true);
        assert.equal(getAttribute(node, "style"), "display: bar;");
        assert.equal((node as HTMLElement).style?.display ?? "bar", "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "hides an element based on data from the same element",
      async (ctor) => {
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("$text", () => {
    testRenderers(
      "render simple text string",
      async (ctor) => {
        const renderer = new ctor({ foo: "bar" });
        const html = `<div $text="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(getAttribute(node, "$text"), null);
        assert.equal(renderer.get("foo"), "bar");
        assert.equal(getTextContent(node), "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });

  describe("$html", () => {
    testRenderers(
      "render simple HTML",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $html="foo" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstChild as HTMLElement;

        const inner = "<div>bar</div>";
        renderer.set("foo", inner);
        await renderer.mount(fragment);
        assert.equal(innerHTML(node), inner);
        assert.equal(node.childNodes.length, 1);
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "render contents of HTML",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $html="foo"></div>`;
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
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );

    testRenderers(
      "render HTML within a :for",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :for="item in items" $html="inner"></div>`;
        const fragment = renderer.parseHTML(html);

        renderer.set("items", [{ text: "foo" }, { text: "bar" }]);
        renderer.set("inner", `<span $text="item.text"></span>`);
        await renderer.mount(fragment);

        const children = Array.from(fragment.childNodes).slice(1);
        assert.equal(children.length, 2);
        assert.equal(getTextContent(children[0] as Element), "foo");
        assert.equal(getTextContent(children[1] as Element), "bar");
      },
      { MockRenderer, NodeRenderer, WorkerRenderer }
    );
  });
});
