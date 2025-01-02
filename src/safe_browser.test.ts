import { testSuite as pluginsTestSuite } from "./plugins.test.js";
import { testSuite as rendererTestSuite } from "./renderer.test.js";
import { Renderer } from "./safe_browser.js";
import { assert } from "./test_utils.js";

describe("SafeBrowser", () => {
  // Plugins test suite.
  //   pluginsTestSuite(Renderer);

  // Apply the test suites to the `Renderer` class.
  rendererTestSuite(Renderer);

  it("safe renderer sanitizes script tag", () => {
    const renderer = new Renderer();
    const html = "<script>alert('hello');</script>";
    const doc = renderer.parseHTML(html);
    const serialized = renderer.serializeHTML(doc);
    assert.equal(serialized, "");
  });
});
