/**
 * @param {HTMLCanvasElement} elem
 * @param {import("../../../src/renderer.js").IRenderer} renderer
 */
export default function (elem, renderer) {
	const ctx = elem.getContext("2d");
	if (!ctx) return;
	const width = elem.width;
	const height = elem.height;

	// Draw initial state.
	function draw() {
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);

		// Draw background.
		ctx.fillStyle = "#f0f0f0";
		ctx.fillRect(0, 0, width, height);

		// Draw border.
		ctx.strokeStyle = "#ccc";
		ctx.strokeRect(0, 0, width, height);

		// Draw text showing current count.
		ctx.fillStyle = "#333";
		ctx.font = "16px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(`Count: ${renderer.$.renderCount}`, width / 2, height / 2 + 6);
	}

	// Initial draw.
	draw();

	// Re-draw whenever renderCount changes.
	renderer.effect(function () {
		// Access the reactive variable to register dependency.
		void this.$.renderCount;
		draw();
	});
}
