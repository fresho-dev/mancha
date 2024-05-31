import { describe } from "mocha";
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
        // TOOD: Add preprocess tests.
    });
    describe("render", () => {
        // TOOD: Add render tests.
    });
});
