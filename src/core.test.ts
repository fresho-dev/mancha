import * as assert from "assert";
import { JSDOM } from "jsdom";
import {
  IRenderer,
  ParserParams,
  RendererParams,
  extractTextNodeKeys,
  safeEval,
  traverse,
} from "./core";

class MockRenderer extends IRenderer {
  parseHTML(content: string, params?: ParserParams): DocumentFragment {
    throw new Error("Not implemented.");
  }
  serializeHTML(fragment: DocumentFragment): string {
    throw new Error("Not implemented.");
  }
  renderLocalPath(
    fpath: string,
    params?: RendererParams & ParserParams
  ): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

describe("Mancha core module", () => {
  describe("traverse", () => {
    it("empty document", () => {
      const fragment = JSDOM.fragment("");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 0);
    });

    it("single element", () => {
      const fragment = JSDOM.fragment("<div></div>");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 1);
    });

    it("multiple elements", () => {
      const num = 10;
      const html = new Array(num).fill("<div></div>").join("");
      const fragment = JSDOM.fragment(html);
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, num);
    });

    it("nested elements", () => {
      const fragment = JSDOM.fragment("<div><div></div></div>");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 2);
    });

    it("single text node", () => {
      const fragment = JSDOM.fragment("text");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].nodeType, 3);
      assert.equal(nodes[0].nodeValue, "text");
      assert.equal(nodes[0].textContent, "text");
    });

    it("sibling text node", () => {
      const fragment = JSDOM.fragment("<span></span>world");
      const nodes = Array.from(traverse(fragment)).slice(1);
      assert.equal(nodes.length, 2);
    });
  });

  describe("extractNodeTextVariables", () => {
    it("single variable", () => {
      const content = "Hello {{ name }}";
      const variables = extractTextNodeKeys(content);
      assert.equal(variables.length, 1);
      assert.equal(variables[0][0], "{{ name }}");
      assert.equal(variables[0][1], "name");
      assert.equal(variables[0][2].length, 0);
    });

    it("multiple variables", () => {
      const content = "Hello {{ name }}, today is {{ weather }}";
      const variables = extractTextNodeKeys(content);
      assert.equal(variables.length, 2);

      assert.equal(variables[0][0], "{{ name }}");
      assert.equal(variables[0][1], "name");
      assert.equal(variables[0][2].length, 0);

      assert.equal(variables[1][0], "{{ weather }}");
      assert.equal(variables[1][1], "weather");
      assert.equal(variables[1][2].length, 0);
    });

    it("variable with single property", () => {
      const content = "Hello {{ user.name }}";
      const variables = extractTextNodeKeys(content);
      assert.equal(variables.length, 1);
      assert.equal(variables[0][0], "{{ user.name }}");
      assert.equal(variables[0][1], "user");
      assert.equal(variables[0][2].length, 1);
      assert.equal(variables[0][2][0], "name");
    });

    it("variable with nested properties", () => {
      const content = "Hello {{ user.name.first }}";
      const variables = extractTextNodeKeys(content);
      assert.equal(variables.length, 1);
      assert.equal(variables[0][0], "{{ user.name.first }}");
      assert.equal(variables[0][1], "user");
      assert.equal(variables[0][2].length, 2);
      assert.equal(variables[0][2][0], "name");
      assert.equal(variables[0][2][1], "first");
    });
  });

  describe("resolveTextNode", () => {
    it("resolves single variable", () => {
      const content = "Hello {{ name }}";
      const renderer = new MockRenderer({ name: "World" });
      const fragment = JSDOM.fragment(content);
      const textNode = fragment.childNodes[0] as Text;
      assert.equal(textNode.textContent, "Hello {{ name }}");

      const proxies = renderer.resolveTextNode(textNode);
      assert.equal(textNode.textContent, "Hello World");

      proxies[0].set("Stranger");
      assert.equal(textNode.textContent, "Hello Stranger");

      renderer.set("name", "John");
      assert.equal(textNode.textContent, "Hello John");
    });
  });

  describe("safeEval", () => {
    it("simple sum", async () => {
      const fn = "a + b";
      const result = await safeEval(fn, null, { a: 1, b: 2 });
      assert.equal(result, 3);
    });

    it("sum with nested properties", async () => {
      const fn = "x.a + x.b";
      const result = await safeEval(fn, null, { x: { a: 1, b: 2 } });
      assert.equal(result, 3);
    });

    it("modifies variables", async () => {
      const object = { x: { a: 1 } };
      const fn = "x.a++";
      await safeEval(fn, null, object);
      assert.equal(object.x.a, 2);
    });

    it('passing "this" to function', async () => {
      const object = { x: { a: 1 } };
      const fn = "this.x.a++";
      await safeEval(fn, object);
      assert.equal(object.x.a, 2);
    });

    it("async call within function", async () => {
      const fn = "await Promise.resolve(1)";
      const result = await safeEval(fn, null);
      assert.equal(result, 1);
    });
  });

  describe("eval", () => {
    it("using implicit `this` in function", async () => {
      const renderer = new MockRenderer({ a: 1 });
      const fn = "++a";
      const result = await renderer.eval(fn);
      assert.equal(result, 2);
      assert.equal(renderer.get("a"), 2);
    });

    it("using implicit `this` and nested values", async () => {
      const renderer = new MockRenderer({ x: { a: 1 } });
      const fn = "++x.a";
      const result = await renderer.eval(fn);
      assert.equal(result, 2);
      assert.equal(renderer.get("x", "a"), 2);
    });

    it("tracing works as expected", async () => {
      const renderer = new MockRenderer({ a: 1, b: 2, c: 3 });
      const fn = () => renderer.eval("a + b");
      const [result, dependencies] = await renderer.trace(fn);
      assert.equal(result, 3);
      assert.deepEqual(dependencies, ["a", "b"]);
    });
  });

  describe(":data", () => {
    it("initializes unseen value", async () => {
      const html = `<div :data="{foo: 'bar'}"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as Element;
      const renderer = new MockRenderer();
      await renderer.mount(fragment);
      assert.equal(node.getAttribute(":data"), null);
      assert.equal(renderer.get("foo"), "bar");
    });

    it("initializes an array of values", async () => {
      const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as Element;
      const renderer = new MockRenderer();
      await renderer.mount(fragment);
      assert.equal(node.getAttribute(":data"), null);
      assert.deepEqual(renderer.get("arr"), [1, 2, 3]);
    });

    it("initializes an array of objects", async () => {
      const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as Element;
      const renderer = new MockRenderer();
      await renderer.mount(fragment);
      assert.equal(node.getAttribute(":data"), null);
      assert.deepEqual(renderer.get("arr"), [{ n: 1 }, { n: 2 }, { n: 3 }]);
    });
  });

  describe("@watch", () => {
    it("simple watch", async () => {
      const html = `<div @watch="foobar = foo + bar"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as Element;
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
  });

  describe(":attribute", () => {
    it("class", async () => {
      const html = `<div :class="foo"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const renderer = new MockRenderer({ foo: "bar" });
      await renderer.mount(fragment);
      assert.equal(node.getAttribute(":class"), null);
      assert.equal(renderer.get("foo"), "bar");
      assert.equal(node.className, "bar");
    });
  });

  describe("$attribute", () => {
    it("inner-text", async () => {
      const html = `<div $inner-text="foo"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const renderer = new MockRenderer({ foo: "bar" });
      await renderer.mount(fragment);
      assert.equal(node.getAttribute("$inner-text"), null);
      assert.equal(renderer.get("foo"), "bar");
      assert.equal(node.innerText, "bar");
    });
  });

  describe("@attribute", () => {
    it("click", async () => {
      const html = `<div @click="counter++"></div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const renderer = new MockRenderer({ counter: 0 });
      await renderer.mount(fragment);
      assert.equal(renderer.get("counter"), 0);

      node.click?.();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(renderer.get("counter"), 1);
    });
  });

  describe(":for", () => {
    [0, 1, 10].forEach((n) => {
      it(`container with ${n} items`, async () => {
        const html = `<div :for="item in items">{{ item }}</div>`;
        const fragment = JSDOM.fragment(html);
        const node = fragment.firstElementChild as HTMLElement;
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
          assert.equal(children[i]!!.textContent, container[i]);
        }
      });
    });

    it("container that updates items", async () => {
      const html = `<div :for="item in items">{{ item }}</div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const parent = node.parentNode;
      assert.notEqual(parent, null);

      // Create array with no elements.
      // const container: string[] = [];
      const renderer = new MockRenderer({ items: [] });
      await renderer.mount(fragment);

      // Confirm that there are no children except for the template element.
      const children0 = Array.from(parent?.childNodes || []);
      assert.equal(children0.length, 1);
      assert.equal((children0[0] as HTMLElement).tagName, "TEMPLATE");
      assert.equal(children0[0].firstChild, node);

      // Add a single item.
      renderer.get("items").push("foo");
      // renderer.get("items").push("foo");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const children1 = Array.from(parent?.childNodes || []);
      assert.equal(children1.length, renderer.get("items").length + 1);
      assert.equal((children1[1] as HTMLElement).textContent, "foo");

      // Add multiple items.
      renderer.get("items").push("bar", "baz");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const children2 = Array.from(parent?.childNodes || []);
      assert.equal(children2.length, renderer.get("items").length + 1);
      assert.equal((children2[1] as HTMLElement).textContent, "foo");
      assert.equal((children2[2] as HTMLElement).textContent, "bar");
      assert.equal((children2[3] as HTMLElement).textContent, "baz");

      // Remove one item.
      renderer.get("items").pop();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const children3 = Array.from(parent?.childNodes || []);
      assert.equal(children3.length, renderer.get("items").length + 1);
      assert.equal((children3[1] as HTMLElement).textContent, "foo");
      assert.equal((children3[2] as HTMLElement).textContent, "bar");
    });

    it("container does not resolve initially", async () => {
      const html = `<div :for="item in items">{{ item }}</div>`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const parent = node.parentNode;
      assert.notEqual(parent, null);

      // Create array with no elements.
      const renderer = new MockRenderer();
      await renderer.mount(fragment);

      assert.equal(renderer.get("item"), null);
      assert.equal(node.getAttribute(":for"), null);
      assert.notEqual(node.parentNode, parent);

      const children = Array.from(parent?.childNodes || []);
      assert.equal(children.length, 1);
      assert.equal((children[0] as HTMLElement).tagName, "TEMPLATE");
      assert.equal(children[0].firstChild, node);
    });

    it("template node with attributes and properties", async () => {
      const html = `
        <div $myprop="item" :myattr="item" :for="item in items">
          {{ item }}
        </div>`.trim();
      const fragment = JSDOM.fragment(html);

      const renderer = new MockRenderer({ items: ["1", "2"] });
      await renderer.mount(fragment);

      const children12 = Array.from(fragment.childNodes).slice(1);
      assert.equal(children12.length, 2);
      assert.equal(children12[0].textContent?.trim(), "1");
      assert.equal(children12[1].textContent?.trim(), "2");
      assert.equal((children12[0] as any)["myprop"], "1");
      assert.equal((children12[1] as any)["myprop"], "2");
      assert.equal((children12[0] as HTMLElement).getAttribute("myattr"), "1");
      assert.equal((children12[1] as HTMLElement).getAttribute("myattr"), "2");

      await renderer.update({ items: ["a", "b"] });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const childrenAB = Array.from(fragment.childNodes).slice(1);
      assert.equal(childrenAB.length, 2);
      assert.equal(childrenAB[0].textContent?.trim(), "a");
      assert.equal(childrenAB[1].textContent?.trim(), "b");
      assert.equal((childrenAB[0] as any)["myprop"], "a", 'myprop should be "a"');
      assert.equal((childrenAB[1] as any)["myprop"], "b", 'myprop should be "b"');
      assert.equal((childrenAB[0] as HTMLElement).getAttribute("myattr"), "a");
      assert.equal((childrenAB[1] as HTMLElement).getAttribute("myattr"), "b");
    });
  });

  describe(":bind", () => {
    it("binds a text input value with existing store key", async () => {
      // Since we're dealing with events, we need to create a full document.
      const html = `<input :bind="foo" />`;
      const dom = new JSDOM(html);
      const node = dom.window.document.body.firstElementChild as HTMLInputElement;

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
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(renderer.get("foo"), "qux");
    });

    it("binds a text input value with new store key", async () => {
      // Since we're dealing with events, we need to create a full document.
      const html = `<input :bind="foo" value="bar" />`;
      const dom = new JSDOM(html);
      const node = dom.window.document.body.firstElementChild as HTMLInputElement;

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
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(renderer.get("foo"), "qux");
    });

    it("binds a text input value with custom events", async () => {
      // Since we're dealing with events, we need to create a full document.
      const html = `<input :bind="foo" :bind-events="my-custom-event" />`;
      const dom = new JSDOM(html);
      const node = dom.window.document.body.firstElementChild as HTMLInputElement;

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
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(renderer.get("foo"), "baz");
      node.dispatchEvent(new dom.window.Event("my-custom-event"));
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(renderer.get("foo"), "qux");
    });
  });

  describe(":show", () => {
    it("shows then hides an element", async () => {
      const html = `<div :show="foo" />`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const parent = node.parentNode;

      const renderer = new MockRenderer({ foo: true });
      await renderer.mount(fragment);

      assert.ok(node.parentNode === parent);
      assert.ok(node.parentNode?.firstElementChild === node);
      assert.ok(!node.hasAttribute(":show"));

      await renderer.set("foo", false);
      assert.ok(node.parentNode !== parent);
      assert.ok(!Array.from(node.parentNode?.childNodes || []).includes(node));
    });

    it("hides then shows an element", async () => {
      const html = `<div :show="foo" />`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;
      const parent = node.parentNode;

      const renderer = new MockRenderer({ foo: false });
      await renderer.mount(fragment);

      assert.ok(node.parentNode !== parent);
      assert.ok(!Array.from(node.parentNode?.childNodes || []).includes(node));
      assert.ok(!node.hasAttribute(":show"));

      await renderer.set("foo", true);
      assert.ok(node.parentNode === parent);
      assert.ok(node.parentNode?.firstElementChild === node);
    });
  });

  describe("shorthands", () => {
    it("$text", async () => {
      const html = `<div $text="foo" />`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;

      const renderer = new MockRenderer({ foo: "bar" });
      await renderer.mount(fragment);
      assert.equal(node.textContent, "bar");
    });

    it("$html", async () => {
      const html = `<div $html="foo" />`;
      const fragment = JSDOM.fragment(html);
      const node = fragment.firstElementChild as HTMLElement;

      const inner = "<div>bar</div>";
      const renderer = new MockRenderer({ foo: inner });
      await renderer.mount(fragment);
      assert.equal(node.innerHTML, inner);
      assert.equal(node.childElementCount, 1);
    });
  });
});
