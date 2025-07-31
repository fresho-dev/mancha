import { assert } from "./test_utils.js";
import { Renderer } from "./browser.js";
import { setupQueryParamBindings } from "./query.js";

describe("Query Parameter Bindings", () => {
  const originalHref = window.location.href;

  // This will run after each test in this block
  afterEach(() => {
    // Reset the URL to a clean state.
    window.history.replaceState(null, "", originalHref);
  });

  it("should initialize store from URL query parameters", () => {
    window.history.replaceState(null, "", "/?foo=bar&baz=qux");
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    assert.equal(renderer.get("$$foo"), "bar");
    assert.equal(renderer.get("$$baz"), "qux");
  });

  it("should update URL when a $$ key is set in the store", async () => {
    window.history.replaceState(null, "", "/");
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    await renderer.set("$$name", "test");
    assert.equal(window.location.search, "?name=test");

    await renderer.set("$$age", 30);
    assert.equal(window.location.search, "?name=test&age=30");
  });

  it("should remove parameter from URL when a $$ key is set to undefined, null, or empty string", async () => {
    window.history.replaceState(null, "", "/?foo=bar&baz=qux");
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    await renderer.set("$$foo", undefined);
    assert.equal(window.location.search, "?baz=qux");

    await renderer.set("$$baz", null);
    assert.equal(window.location.search, "");

    window.history.replaceState(null, "", "/?a=1&b=2");
    // The existing renderer's store is now out of sync with the URL.
    // The popstate listener would fix it, but we are not triggering it.
    // For this test, it's cleaner to create a new renderer.
    const renderer2 = new Renderer();
    setupQueryParamBindings(renderer2);
    await renderer2.set("$$a", "");
    assert.equal(window.location.search, "?b=2");
  });

  it("should remove parameter from URL when a $$ key is set to a falsy value", async () => {
    window.history.replaceState(null, "", "/?foo=bar&baz=qux");
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    await renderer.set("$$foo", 0);
    assert.equal(window.location.search, "?baz=qux");

    await renderer.set("$$baz", false);
    assert.equal(window.location.search, "");
  });

  it("should update store when URL changes on popstate", () => {
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    assert.equal(renderer.get("$$page"), null);

    // Simulate URL change and dispatch event
    window.history.replaceState(null, "", "/?page=2");
    window.dispatchEvent(new PopStateEvent("popstate"));

    assert.equal(renderer.get("$$page"), "2");
  });

  it("should remove keys from store that are no longer in URL on popstate", () => {
    window.history.replaceState(null, "", "/?a=1&b=2");
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    assert.equal(renderer.get("$$a"), "1");
    assert.equal(renderer.get("$$b"), "2");

    // Simulate URL change and dispatch event
    window.history.replaceState(null, "", "/?a=1");
    window.dispatchEvent(new PopStateEvent("popstate"));

    assert.equal(renderer.get("$$a"), "1");
    assert.equal(renderer.get("$$b"), null);
  });

  it("should not change URL if value is the same", async () => {
    window.history.replaceState(null, "", "/?foo=bar");
    const renderer = new Renderer();
    setupQueryParamBindings(renderer);

    const originalUrl = window.location.href;
    await renderer.set("$$foo", "bar");

    assert.equal(window.location.href, originalUrl);
  });
});
