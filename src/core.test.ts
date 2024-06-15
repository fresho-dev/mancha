import * as assert from "assert";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { IRenderer } from "./core.js";
import { ParserParams, RenderParams } from "./interfaces.js";

class MockRenderer extends IRenderer {
  parseHTML(content: string, params?: ParserParams): DocumentFragment {
    throw new Error("Not implemented.");
  }
  serializeHTML(fragment: DocumentFragment): string {
    throw new Error("Not implemented.");
  }
  preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }
}

describe("Core", () => {
  describe("clone", () => {
    // TOOD: Add clone tests.
  });

  describe("preprocess", () => {
    // TOOD: Add render tests.
  });

  describe("render", () => {
    // TOOD: Add render tests.
  });

  describe("mount", () => async () => {
    it("mounts a document fragment", async () => {
      const renderer = new MockRenderer();
      const fragment = JSDOM.fragment("<div></div>");
      await renderer.mount(fragment);
      assert.equal((fragment as any).renderer, renderer);
    });
  });
});
