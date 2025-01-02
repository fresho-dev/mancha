import { Renderer } from "./browser.js";
import { testSuite as pluginsTestSuite } from "./plugins.test.js";
import { testSuite as rendererTestSuite } from "./renderer.test.js";

describe("Browser", () => {
  // Plugins test suite.
  pluginsTestSuite(Renderer);

  // Apply the test suites to the `Renderer` class.
  rendererTestSuite(Renderer);
});
