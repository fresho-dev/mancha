import { assert, setupGlobalTestEnvironment } from "./test_utils.js";
import { Renderer } from "./browser.js";
import { setupQueryParamBindings } from "./query.js";

const START_HREF = 'http://localhost/';

describe("Query Parameter Bindings", () => {
  // Set up the global test environment before running tests.
  before(() => setupGlobalTestEnvironment());

  beforeEach(() => {
    // Reset the URL to a clean state before each test.
    window.history.replaceState(null, "", START_HREF);
  })

  // This will run after each test in this block
  afterEach(() => {
    // Reset the URL to a clean state.
    window.history.replaceState(null, "", START_HREF);
  });

  it("should initialize store from URL query parameters", async () => {
    window.history.replaceState(null, "", "/?foo=bar&baz=qux");
    const renderer = new Renderer();
    await setupQueryParamBindings(renderer);

    assert.equal(renderer.get("$$foo"), "bar");
    assert.equal(renderer.get("$$baz"), "qux");
  });

  it("should update URL when a $$ key is set in the store", async () => {
    window.history.replaceState(null, "", "/");
    const renderer = new Renderer();
    await setupQueryParamBindings(renderer);

    await renderer.set("$$name", "test");
    assert.equal(window.location.search, "?name=test");

    await renderer.set("$$age", 30);
    assert.equal(window.location.search, "?name=test&age=30");
  });

  it("should remove parameter from URL when a $$ key is set to undefined, null, or empty string", async () => {
    window.history.replaceState(null, "", "/?foo=bar&baz=qux&bar=val");
    const renderer = new Renderer();
    await setupQueryParamBindings(renderer);

    await renderer.set("$$foo", undefined);
    assert.equal(window.location.search, "?baz=qux&bar=val");

    await renderer.set("$$baz", null);
    assert.equal(window.location.search, "?bar=val");

    await renderer.set("$$bar", "");
    assert.equal(window.location.search, "");
  });

  it("should remove parameter from URL when a $$ key is set to a falsy value", async () => {
    window.history.replaceState(null, "", "/?foo=bar&baz=qux");
    const renderer = new Renderer();
    await setupQueryParamBindings(renderer);

    await renderer.set("$$foo", 0);
    assert.equal(window.location.search, "?baz=qux");

    await renderer.set("$$baz", false);
    assert.equal(window.location.search, "");
  });

  it("should update store when URL changes on popstate", async () => {
    const renderer = new Renderer();
    await setupQueryParamBindings(renderer);

    assert.equal(renderer.get("$$page"), undefined);

    // Simulate URL change and dispatch event
    window.history.replaceState(null, "", "/?page=2");
    window.dispatchEvent(new PopStateEvent("popstate"));

    assert.equal(renderer.get("$$page"), "2");
  });

  it("should remove keys from store that are no longer in URL on popstate", async () => {
    window.history.replaceState(null, "", "/?a=1&b=2");
    const renderer = new Renderer();
    await setupQueryParamBindings(renderer);

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
    await setupQueryParamBindings(renderer);

    const originalUrl = window.location.href;
    await renderer.set("$$foo", "bar");

    assert.equal(window.location.href, originalUrl);
  });

  it("should update URL from store default on initial load", async () => {
    window.history.replaceState(null, "", "/");
    const renderer = new Renderer();
    // Simulate a default value being present in the store before bindings are set up.
    await renderer.set("$$tab", "home");

    await setupQueryParamBindings(renderer);

    assert.equal(window.location.search, "?tab=home");
    assert.equal(renderer.get("$$tab"), "home");
  });

  it("should let URL parameter override store default on initial load", async () => {
    window.history.replaceState(null, "", "/?tab=about");
    const renderer = new Renderer();
    // Simulate a default value being present in the store.
    await renderer.set("$$tab", "home");

    await setupQueryParamBindings(renderer);

    // The URL should not change, and the store should be updated from the URL.
    assert.equal(window.location.search, "?tab=about");
    assert.equal(renderer.get("$$tab"), "about");
  });

  it("should merge URL parameters and store defaults on initial load", async () => {
    window.history.replaceState(null, "", "/?page=2");
    const renderer = new Renderer();
    // Simulate multiple defaults.
    await renderer.set("$$tab", "home");
    await renderer.set("$$sort", "asc");

    await setupQueryParamBindings(renderer);

    const params = new URLSearchParams(window.location.search);
    assert.equal(params.get("page"), "2");
    assert.equal(params.get("tab"), "home");
    assert.equal(params.get("sort"), "asc");

    assert.equal(renderer.get("$$page"), "2");
    assert.equal(renderer.get("$$tab"), "home");
    assert.equal(renderer.get("$$sort"), "asc");
  });
});
