import { Renderer } from "./browser.js";

export async function main() {
	const renderer = new Renderer();
	await renderer.mount(document.head);
	await renderer.mount(document.body);
}

await main();
