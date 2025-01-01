import { Renderer } from "./safe_browser.js";
import { assert } from "./test_utils.js";
(typeof window === "undefined" ? xdescribe : describe)("Browser", () => {
    describe("parseHTML", () => {
        it("parses root document", () => {
            const renderer = new Renderer();
            const html = "<html><head></head><body></body></html>";
            const doc = renderer.parseHTML(html, { rootDocument: true });
            assert.ok(doc instanceof Document);
        });
        it("parses document fragment", () => {
            const renderer = new Renderer();
            const html = "<div></div>";
            const doc = renderer.parseHTML(html);
            assert.ok(doc instanceof DocumentFragment);
        });
        it("parses simple DIV element", () => {
            const renderer = new Renderer();
            const html = "<div></div>";
            const fragment = renderer.parseHTML(html);
            assert.equal(fragment.children.length, 1);
        });
    });
});
