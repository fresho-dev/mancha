import * as assert from "assert";
import * as path from "path";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";
import { Renderer as NodeRenderer } from "./index.js";
import { REACTIVE_DEBOUNCE_MILLIS } from "./reactive.js";

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
  rendererClasses: (new (...args: any[]) => IRenderer)[]
) {
  for (const ctor of rendererClasses) {
    describe(`${ctor.name}`, () => {
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

          const node = fragment.firstElementChild as Element;
          assert.equal(node.getAttribute("src"), null);
          assert.equal(node.innerHTML, source);
        },
        [MockRenderer, NodeRenderer]
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

          const node = fragment.firstElementChild as Element;
          assert.equal(node.getAttribute("src"), null);
          assert.equal(node.innerHTML, source);
        },
        [MockRenderer, NodeRenderer]
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

          const node = fragment.firstElementChild as Element;
          assert.equal(node.getAttribute("src"), null);
          assert.equal(node.innerHTML, `/foo/${source}`);
        },
        [MockRenderer, NodeRenderer]
      );
    });
  });

  describe("rebase", () => {
    testRenderers(
      "rebase relative paths",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<script src="bar/baz.js"></script>`;
        const fragment = renderer.parseHTML(html);

        await renderer.mount(fragment, { dirpath: "/foo" });

        const node = fragment.firstElementChild as Element;
        assert.equal(node.getAttribute("src"), "/foo/bar/baz.js");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "rebase (not) absolute paths",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<script src="/foo/bar.js"></script>`;
        const fragment = renderer.parseHTML(html);

        await renderer.mount(fragment, { dirpath: "/baz" });

        const node = fragment.firstElementChild as Element;
        assert.equal(node.getAttribute("src"), "/foo/bar.js");
      },
      [MockRenderer, NodeRenderer]
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

        const node = fragment.firstElementChild as Element;
        assert.equal(node.getAttribute("src"), "foo/bar/baz.js");
      },
      [MockRenderer, NodeRenderer]
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

        const node = fragment.firstElementChild as Element;
        assert.equal(node.getAttribute("src"), "foo/bar/baz/qux.js");
      },
      [MockRenderer, NodeRenderer]
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
        assert.equal(textNode.textContent, "Hello {{ name }}");

        await renderer.mount(fragment);
        assert.equal(textNode.textContent, "Hello World");

        await renderer.set("name", "Stranger");
        assert.equal(textNode.textContent, "Hello Stranger");

        await renderer.set("name", "John");
        assert.equal(textNode.textContent, "Hello John");
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe(":data", () => {
    testRenderers(
      "initializes unseen value",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{foo: 'bar'}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as Element;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute(":data"), null);
        assert.equal(renderer.get("foo"), "bar");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "initializes an array of values",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as Element;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute(":data"), null);
        assert.deepEqual(renderer.get("arr"), [1, 2, 3]);
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "initializes an array of objects",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as Element;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute(":data"), null);
        assert.deepEqual(renderer.get("arr"), [{ n: 1 }, { n: 2 }, { n: 3 }]);
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe("@watch", () => {
    testRenderers(
      "simple watch",
      async (ctor) => {
        const renderer = new ctor({ foo: "foo", bar: "bar", foobar: null });
        const html = `<div @watch="foobar = foo + bar"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as Element;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute("@watch"), null);
        assert.equal(renderer.get("foobar"), "foobar");

        // Change one of the dependencies and observe result.
        await renderer.set("foo", "baz");
        assert.equal(renderer.get("foobar"), "bazbar");

        // Change the other dependency and observe result.
        await renderer.set("bar", "qux");
        assert.equal(renderer.get("foobar"), "bazqux");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "watch nested property",
      async (ctor) => {
        const renderer = new ctor({ foo: { bar: "bar" }, foobar: null });
        const html = `<div @watch="foobar = foo.bar"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as Element;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute("@watch"), null);
        assert.equal(renderer.get("foobar"), "bar");

        // Set subproperty directly.
        renderer.get("foo")!!.bar = "baz";
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        assert.equal(renderer.get("foobar"), "baz");

        // Replace parent object.
        await renderer.set("foo", { bar: "qux" });
        assert.equal(renderer.get("foobar"), "qux");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "watch boolean expression with two variables",
      async (ctor) => {
        const renderer = new ctor({ foo: true, bar: false, foobar: null });
        const html = `<div @watch="foobar = !foo && !bar"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as Element;
        await renderer.mount(fragment);

        assert.equal(node.getAttribute("@watch"), null);
        assert.equal(renderer.get("foobar"), false);

        await renderer.set("foo", false);
        assert.equal(renderer.get("foobar"), true);
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe(":attribute", () => {
    testRenderers(
      "class",
      async (ctor) => {
        const renderer = new ctor({ foo: "bar" });
        const html = `<div :class="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute(":class"), null);
        assert.equal(renderer.get("foo"), "bar");
        assert.equal(node.className, "bar");
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe("$attribute", () => {
    testRenderers(
      "inner-text",
      async (ctor) => {
        const renderer = new ctor({ foo: "bar" });
        const html = `<div $inner-text="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(node.getAttribute("$inner-text"), null);
        assert.equal(renderer.get("foo"), "bar");
        assert.equal(node.innerText, "bar");
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe("@attribute", () => {
    testRenderers(
      "click",
      async (ctor) => {
        const renderer = new ctor({ counter: 0 });
        const html = `<div @click="counter++"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;
        await renderer.mount(fragment);
        assert.equal(renderer.get("counter"), 0);

        node.click?.();
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        assert.equal(renderer.get("counter"), 1);
      },
      [MockRenderer, NodeRenderer]
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
          const node = fragment.firstElementChild as HTMLElement;
          const parent = node.parentNode;
          assert.notEqual(parent, null);

          // Create array with 0..n elements.
          const container = Array.from({ length: n }, (_, x) => String(x));
          await renderer.set("items", container);
          await renderer.mount(fragment);

          assert.equal(node.getAttribute(":for"), null);
          assert.notEqual(node.parentNode, parent);
          assert.notEqual(renderer.get("item"), "foo");

          const children = Array.from(parent?.childNodes || []).slice(1);
          assert.equal(children.length, container.length);
          for (let i = 0; i < container.length; i++) {
            assert.equal(children[i]!!.textContent, container[i]);
          }
        },
        [MockRenderer, NodeRenderer]
      );
    });

    testRenderers(
      "container that updates items",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :for="item in items">{{ item }}</div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;
        const parent = node.parentNode;
        assert.notEqual(parent, null);

        // Create array with no elements.
        await renderer.set("items", []);
        await renderer.mount(fragment);

        // Confirm that there are no children except for the template element.
        const children0 = Array.from(parent?.childNodes || []);
        assert.equal(children0.length, 1);
        assert.equal((children0[0] as HTMLElement).tagName, "TEMPLATE");
        assert.equal(children0[0].firstChild, node);

        // Add a single item.
        renderer.get("items").push("foo");
        // renderer.get("items").push("foo");
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        const children1 = Array.from(parent?.childNodes || []);
        assert.equal(children1.length, renderer.get("items").length + 1);
        assert.equal((children1[1] as HTMLElement).textContent, "foo");

        // Add multiple items.
        renderer.get("items").push("bar", "baz");
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        const children2 = Array.from(parent?.childNodes || []);
        assert.equal(children2.length, renderer.get("items").length + 1);
        assert.equal((children2[1] as HTMLElement).textContent, "foo");
        assert.equal((children2[2] as HTMLElement).textContent, "bar");
        assert.equal((children2[3] as HTMLElement).textContent, "baz");

        // Remove one item.
        renderer.get("items").pop();
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        const children3 = Array.from(parent?.childNodes || []);
        assert.equal(children3.length, renderer.get("items").length + 1);
        assert.equal((children3[1] as HTMLElement).textContent, "foo");
        assert.equal((children3[2] as HTMLElement).textContent, "bar");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "container does not resolve initially",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :for="item in items">{{ item }}</div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;
        const parent = node.parentNode;
        assert.notEqual(parent, null);

        // Create renderer with no array => fails.
        await assert.rejects(renderer.mount(fragment), /ReferenceError: items is not defined/);

        // Add a placeholder for the array, but it's not array type.
        await renderer.set("items", null);
        await renderer.mount(fragment);

        assert.equal(renderer.get("item"), null);
        assert.equal(node.getAttribute(":for"), null);
        assert.notEqual(node.parentNode, parent);

        const children = Array.from(parent?.childNodes || []);
        assert.equal(children.length, 1);
        assert.equal((children[0] as HTMLElement).tagName, "TEMPLATE");
        assert.equal(children[0].firstChild, node);
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "template node with attributes and properties",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $myprop="item" :myattr="item" :for="item in items">{{ item }}</div>`;
        const fragment = renderer.parseHTML(html);

        await renderer.set("items", ["1", "2"]);
        await renderer.mount(fragment);

        // await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 4));
        const children12 = Array.from(fragment.childNodes).slice(1);
        assert.equal(children12.length, 2);
        assert.equal(children12[0].textContent?.trim(), "1");
        assert.equal(children12[1].textContent?.trim(), "2");
        assert.equal((children12[0] as any)["myprop"], "1");
        assert.equal((children12[1] as any)["myprop"], "2");
        assert.equal((children12[0] as HTMLElement).getAttribute("myattr"), "1");
        assert.equal((children12[1] as HTMLElement).getAttribute("myattr"), "2");

        await renderer.update({ items: ["a", "b"] });
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS * 3));
        const childrenAB = Array.from(fragment.childNodes).slice(1);
        assert.equal(childrenAB.length, 2);
        assert.equal(childrenAB[0].textContent?.trim(), "a");
        assert.equal(childrenAB[1].textContent?.trim(), "b");
        assert.equal((childrenAB[0] as any)["myprop"], "a", 'myprop should be "a"');
        assert.equal((childrenAB[1] as any)["myprop"], "b", 'myprop should be "b"');
        assert.equal((childrenAB[0] as HTMLElement).getAttribute("myattr"), "a");
        assert.equal((childrenAB[1] as HTMLElement).getAttribute("myattr"), "b");
      },
      [MockRenderer, NodeRenderer]
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
        const node = doc.body.firstElementChild as HTMLInputElement;

        const renderer = new ctor();
        await renderer.set("foo", "bar");
        await renderer.mount(doc.body);

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
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
        assert.equal(renderer.get("foo"), "qux");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "fails to bind a text input value with undefined variable",
      async (ctor) => {
        // Since we're dealing with events, we need to create a full document.
        const html = `<input :bind="foo" />`;
        const dom = new JSDOM(html, {});
        const doc = dom.window.document;
        console.log(doc.body.firstElementChild?.outerHTML);

        // Value does not exist in store before mount().
        const renderer = new ctor();
        assert.equal(renderer.has("foo"), false);
        await assert.rejects(renderer.mount(doc.body), /ReferenceError: foo is not defined/);
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "binds a text input value with custom events",
      async (ctor) => {
        // Since we're dealing with events, we need to create a full document.
        const html = `<input :bind="foo" :bind-events="my-custom-event" />`;
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const node = doc.body.firstElementChild as HTMLInputElement;

        const renderer = new ctor();
        await renderer.set("foo", "bar");
        await renderer.mount(doc.body);

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
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
        assert.equal(renderer.get("foo"), "baz");
        node.dispatchEvent(new dom.window.Event("my-custom-event"));
        await new Promise((resolve) => setTimeout(resolve, REACTIVE_DEBOUNCE_MILLIS));
        assert.equal(renderer.get("foo"), "qux");
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe(":show", () => {
    testRenderers(
      "shows then hides an element",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :show="foo" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;

        await renderer.set("foo", true);
        await renderer.mount(fragment);

        assert.ok(!node.hasAttribute(":show"));
        assert.notEqual((node as HTMLElement).style.display, "none");

        await renderer.set("foo", false);
        assert.equal((node as HTMLElement).style.display, "none");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "hides then shows an element",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :show="foo" style="display: bar" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;

        await renderer.set("foo", false);
        await renderer.mount(fragment);

        assert.ok(!node.hasAttribute(":show"));
        assert.equal((node as HTMLElement).style.display, "none");

        await renderer.set("foo", true);
        assert.equal((node as HTMLElement).style.display, "bar");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "hides an element based on data from the same element",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :data="{show: false}" :show="show" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;

        await renderer.mount(fragment);

        assert.ok(!node.hasAttribute(":show"));
        assert.equal((node as HTMLElement).style.display, "none");

        await renderer.set("show", true);
        assert.notEqual((node as HTMLElement).style.display, "none");
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe("$html", () => {
    testRenderers(
      "render simple HTML",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $html="foo" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;

        const inner = "<div>bar</div>";
        await renderer.set("foo", inner);
        await renderer.mount(fragment);
        assert.equal(node.innerHTML, inner);
        assert.equal(node.childElementCount, 1);
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "render contents of HTML",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $html="foo"></div>`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;

        const inner = "<div>{{ bar }}</div>";
        await renderer.set("foo", inner);
        await renderer.set("bar", "Hello World");
        await renderer.mount(fragment);
        assert.equal(node.firstChild?.textContent, "Hello World");

        // Modify content and observe changes.
        await renderer.set("bar", "Goodbye World");
        assert.equal(node.firstChild?.textContent, "Goodbye World");
      },
      [MockRenderer, NodeRenderer]
    );

    testRenderers(
      "render HTML within a :for",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div :for="item in items" $html="inner"></div>`;
        const fragment = renderer.parseHTML(html);

        await renderer.set("items", [{ text: "foo" }, { text: "bar" }]);
        await renderer.set("inner", `<span $text="item.text"></span>`);
        await renderer.mount(fragment);

        const children = Array.from(fragment.childNodes).slice(1);
        assert.equal(children.length, 2);
        assert.equal(children[0].firstChild?.textContent, "foo");
        assert.equal(children[1].firstChild?.textContent, "bar");
      },
      [MockRenderer, NodeRenderer]
    );
  });

  describe("shorthands", () => {
    testRenderers(
      "$text",
      async (ctor) => {
        const renderer = new ctor();
        const html = `<div $text="foo" />`;
        const fragment = renderer.parseHTML(html);
        const node = fragment.firstElementChild as HTMLElement;

        await renderer.set("foo", "bar");
        await renderer.mount(fragment);
        assert.equal(node.textContent, "bar");
      },
      [MockRenderer, NodeRenderer]
    );
  });
});
