// This module captures the element's rendered state when :render executes.
// Used to verify that :render runs after all other plugins.
export default function (elem, renderer) {
	elem._renderedState = {
		// Text content (after :text is applied).
		textContent: elem.textContent?.trim() || "",
		// Class list (after :class is applied).
		className: elem.className || "",
		// Visibility (after :show is applied).
		displayStyle: elem.style?.display ?? null,
		// Custom attributes (after :attr:* is applied).
		customAttr: elem.getAttribute?.("data-custom") || null,
		// Input value (after :bind is applied).
		inputValue: elem.value ?? null,
		// Store variables accessible at render time.
		storeSnapshot: { ...renderer.$ },
	};
}
