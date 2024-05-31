import * as assert from "assert";
import { describe, it } from "mocha";
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
    // TOOD: Add preprocess tests.
  });
  describe("render", () => {
    // TOOD: Add render tests.
  });
});
