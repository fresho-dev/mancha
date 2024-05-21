import * as assert from "assert";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { RendererImpl } from "./worker";
import { traverse } from "./core";

describe("Worker", () => {
  describe("parse and serialize", () => {
    it("simple string", () => {
      const renderer = new RendererImpl();
      const content = "Hello World";
      const fragment = renderer.parseHTML(content);
      const serialized = renderer.serializeHTML(fragment);
      assert.equal(content, serialized);
    });

    it("single div element", () => {
      const renderer = new RendererImpl();
      const content = "<div>Hello World</div>";
      const fragment = renderer.parseHTML(content);
      const serialized = renderer.serializeHTML(fragment);
      assert.equal(content, serialized);
    });

    it("multiple div elements", () => {
      const renderer = new RendererImpl();
      const content = "<div>Hello World</div><div>Hello World</div>";
      const fragment = renderer.parseHTML(content);
      const serialized = renderer.serializeHTML(fragment);
      assert.equal(content, serialized);
    });

    it("root document with only body", () => {
      const renderer = new RendererImpl();
      const content = "<body><div>Hello World</div></body>";
      const expected = "<html><head></head><body><div>Hello World</div></body></html>";
      const fragment = renderer.parseHTML(content, { root: true });
      const serialized = renderer.serializeHTML(fragment);
      assert.equal(expected, serialized);
    });

    it("root document with only head", () => {
      const renderer = new RendererImpl();
      const content = "<head><title>Hello World</title></head>";
      const expected = "<html><head><title>Hello World</title></head><body></body></html>";
      const fragment = renderer.parseHTML(content, { root: true });
      const serialized = renderer.serializeHTML(fragment);
      assert.equal(expected, serialized);
    });
  });

  describe("{{ expressions }}", () => {
    it("set, update and get context string value", async () => {
      const renderer = new RendererImpl({ name: null });
      const fragment = JSDOM.fragment("<span>Hello {{ name }}</span>");
      const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

      // Set the initial value and render node.
      await renderer.set("name", "World");
      await renderer.mount(fragment);
      assert.equal(textNode.nodeValue, "Hello World");

      // Update the value and observe the change.
      await renderer.set("name", "Stranger");
      assert.equal(textNode.nodeValue, "Hello Stranger");
    });

    it("sets object, gets object property", async () => {
      const renderer = new RendererImpl();
      const fragment = JSDOM.fragment("<span>Hello {{ user.name }}</span>");
      const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

      // Set the initial value and render node.
      await renderer.set("user", { name: "World" });
      await renderer.mount(fragment);
      assert.equal(textNode.nodeValue, "Hello World");

      // Update the value and observe the change.
      await renderer.set("user", { name: "Stranger" });
      assert.equal(textNode.nodeValue, "Hello Stranger");
    });
  });

  describe("mount", () => {
    it("set, update and get context string value", async () => {
      const renderer = new RendererImpl();
      const fragment = JSDOM.fragment("<span>Hello {{ name }}</span>");
      const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

      // Set the initial value and render node.
      await renderer.set("name", "World");
      await renderer.mount(fragment);
      assert.equal(textNode.nodeValue, "Hello World");

      // Update the value and observe the change.
      await renderer.set("name", "Stranger");
      assert.equal(textNode.nodeValue, "Hello Stranger");
    });
  });

  describe("watch", () => {
    it("watch a single value", async () => {
      const renderer = new RendererImpl();
      const fragment = JSDOM.fragment("<span>Hello {{ name }}</span>");
      const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

      await renderer.set("name", "World");
      await renderer.mount(fragment);
      assert.equal(textNode.nodeValue, "Hello World");

      // Listen to the next update.
      const watched = new Promise((resolve) => renderer.watch(["name"], resolve));
      await renderer.set("name", "Stranger");
      assert.equal(await watched, "Stranger");
      assert.equal(renderer.get("name"), "Stranger");
    });

    it("watch multiple values", async () => {
      const renderer = new RendererImpl();
      const fragment = JSDOM.fragment("<span>Hello {{ name }}, it's {{ weather }}</span>");
      const textNode = Array.from(traverse(fragment)).filter((node) => node.nodeType === 3)[0];

      await renderer.set("name", "World");
      await renderer.set("weather", "sunny");
      await renderer.mount(fragment);
      assert.equal(textNode.nodeValue, "Hello World, it's sunny");

      // Listen to the next update.
      const watched = new Promise<string[]>((resolve) =>
        renderer.watch(["name", "weather"], (...values) => resolve([...values]))
      );
      await renderer.set("name", "Stranger");
      const [currName, currWeather] = await watched;
      assert.equal(currName, "Stranger");
      assert.equal(currWeather, "sunny");
    });
  });
});