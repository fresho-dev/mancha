import { assert } from "./test_utils.js";
import { SignalStore } from "./store.js";

describe("Arrow Function Syntax", () => {
  it("should return null for arrow function without parentheses", () => {
    const store = new SignalStore();
    // Unparenthesized arrow function parameters are not supported.
    // store.eval logs the error and returns null on parse failure.
    const result = store.eval("((x => x + 1))(1)");
    assert.equal(result, null);
  });
});
