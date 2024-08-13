import * as assert from "assert";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { IRenderer } from "./core.js";
class MockRenderer extends IRenderer {
    parseHTML(content, params) {
        throw new Error("Not implemented.");
    }
    serializeHTML(fragment) {
        throw new Error("Not implemented.");
    }
    preprocessLocal(fpath, params) {
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
    describe("mount", () => {
        it("mounts a document fragment", async () => {
            const renderer = new MockRenderer();
            const fragment = JSDOM.fragment("<div></div>");
            await renderer.mount(fragment);
            assert.equal(fragment.renderer, renderer);
        });
    });
});
