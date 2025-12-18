import type { IRenderer } from "../renderer.js";

// This module modifies renderer state when :render executes.
// Used to test that :render can interact with the renderer's store.
export default function (elem: any, renderer: IRenderer) {
	// Read existing value and increment it.
	const currentCount = (renderer.$ as any).count ?? 0;
	renderer.set("count", currentCount + 1);

	// Store the modified value on the element for verification.
	elem._modifiedCount = currentCount + 1;
}
