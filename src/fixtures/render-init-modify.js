// This module modifies renderer state when :render executes.
// Used to test that :render can interact with the renderer's store.
export default function (elem, renderer) {
  // Read existing value and increment it.
  const currentCount = renderer.$.count ?? 0;
  renderer.set("count", currentCount + 1);

  // Store the modified value on the element for verification.
  elem._modifiedCount = currentCount + 1;
}
