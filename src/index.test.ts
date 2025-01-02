import { Renderer } from "./index.js";
import { testSuite as pluginsTestSuite } from "./plugins.test.js";
import { testSuite as ssrTestSuite } from "./ssr.test.js";

describe("jsdom", () => {
  // Plugins test suite.
  pluginsTestSuite(Renderer);

  // Server-side rendering test suite.
  ssrTestSuite(Renderer);
});
