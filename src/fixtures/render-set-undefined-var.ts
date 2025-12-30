import type { IRenderer } from "../renderer.js";

// This module sets a variable that was undefined when the template was parsed.
// Used to test auto-initialization of undefined variables.
export default async function (elem: HTMLElement & Record<string, unknown>, renderer: IRenderer) {
	// Set variables that are referenced in the HTML but not pre-defined.
	// Must await since set() is async and we need the value to be set before returning.
	await renderer.set("dynamicMessage", "Hello from render callback!");
	await renderer.set("dynamicNumber", 42);
	await renderer.set("dynamicArray", ["a", "b", "c"]);
	await renderer.set("dynamicObject", { key: "value", nested: { prop: "deep" } });

	// Store reference for test verification.
	elem._renderExecuted = true;
}
