import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error
import * as StaticServer from "static-server";
import { IRenderer } from "./renderer.js";
import { assert } from "./test_utils.js";

// Use a fixed, random port for each test run.
const PORT = Math.floor(1_024 + Math.random() * (2 ** 16 - 1_024));

// Fix `__filename` and `__dirname`: https://stackoverflow.com/a/64383997.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function used to test a transformation of string elements.
 */
function testRenderString(
	ctor: new (...args: any[]) => IRenderer,
	fname: string,
	expected: string,
	vars: any = {},
) {
	return new Promise<void>((resolve, reject) => {
		(async () => {
			const content = fs.readFileSync(fname);
			try {
				const renderer = new ctor(vars);
				const fragment = await renderer.preprocessString(content.toString("utf8"), {
					rootDocument: !fname.endsWith(".tpl.html"),
				});
				await renderer.renderNode(fragment);
				const result = renderer.serializeHTML(fragment).replaceAll("\n", "");
				resolve(assert.equal(result, expected.replaceAll("\n", ""), String(result)));
			} catch (exc) {
				console.error(exc);
				reject(exc);
			}
		})();
	});
}

/**
 * Helper function used to test a transformation of local file paths.
 */
function testRenderLocal(
	ctor: new (...args: any[]) => IRenderer,
	fname: string,
	expected: string,
	vars: any = {},
) {
	return new Promise<void>((resolve, reject) => {
		(async () => {
			const wwwroot = path.join(__dirname, "fixtures");
			const relpath = path.relative(fname, wwwroot) || ".";
			const context = Object.assign({ wwwroot: relpath }, vars);
			try {
				const renderer = new ctor(context);
				const fragment = await renderer.preprocessLocal(fname);
				await renderer.renderNode(fragment);
				const result = renderer.serializeHTML(fragment).replaceAll("\n", "");
				resolve(assert.equal(result, expected.replaceAll("\n", ""), String(result)));
			} catch (exc) {
				console.error(exc);
				reject(exc);
			}
		})();
	});
}

/**
 * Helper function used to test a transformation of local file paths.
 */
function testRenderRemote(
	ctor: new (...args: any[]) => IRenderer,
	fname: string,
	expected: string,
	vars: any = {},
) {
	return new Promise<void>((resolve, reject) => {
		(async () => {
			const wwwroot = path.join(__dirname, "fixtures");
			const relpath = path.relative(fname, wwwroot) || ".";
			const remotePath = `http://127.0.0.1:${PORT}/${path.relative(wwwroot, fname)}`;
			const context = Object.assign({ wwwroot: relpath }, vars);
			try {
				const renderer = new ctor(context);
				const fragment = await renderer.preprocessRemote(remotePath);
				await renderer.renderNode(fragment);
				const result = renderer.serializeHTML(fragment).replaceAll("\n", "");
				resolve(assert.equal(result, expected.replaceAll("\n", ""), String(result)));
			} catch (exc) {
				console.error(exc);
				reject(exc);
			}
		})();
	});
}

function testAllMethods(
	ctor: new (...args: any[]) => IRenderer,
	fname: string,
	expected = "Hello World",
	vars: any = {},
	requiresFs = false,
): void {
	it("simple string render", async function () {
		// Simple string rendering is not tested if file reading is required.
		if (requiresFs) this.skip();
		await testRenderString(ctor, fname, expected, vars);
	});
	it("local path render", async function () {
		// Skip if the renderer does not support local path rendering.
		if (["htmlparser2"].includes(new ctor().impl)) this.skip();
		await testRenderLocal(ctor, fname, expected, vars);
	});
	it("remote path render", async () => {
		await testRenderRemote(ctor, fname, expected, vars);
	});
}

export function testSuite(ctor: new (...args: any[]) => IRenderer): void {
	const server = new StaticServer.default({
		port: PORT,
		host: "127.0.0.1",
		rootPath: path.join(__dirname, "fixtures"),
	});

	describe("Server Side Rendering Test Suite", () => {
		before(async () => {
			return new Promise<void>((done) => server.start(done));
		});

		after(() => {
			server.stop();
		});

		describe("render", () => {
			describe("substitution", () => {
				const name = "Vars";
				const hello_vars = `Hello ${name}`;
				const fname = path.join(__dirname, "fixtures", "hello-name.tpl.html");
				testAllMethods(ctor, fname, hello_vars, { name: name });
			});
		});

		describe("include", () => {
			describe("simple", () => {
				const expected = "Hello World";
				const fpath = path.join(__dirname, "fixtures", "render-include-simple.tpl.html");
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("nested", () => {
				const expected = "Hello World";
				const fpath = path.join(__dirname, "fixtures", "render-include-nested.tpl.html");
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("multiple", () => {
				const expected = "Hello World";
				const fpath = path.join(__dirname, "fixtures", "render-include-multiple.tpl.html");
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("with vars", () => {
				const name = "Vars";
				const hello_vars = `Hello ${name}`;
				const fpath = path.join(__dirname, "fixtures", "render-include-vars.tpl.html");
				testAllMethods(ctor, fpath, hello_vars, { name: name }, true);
			});

			describe("with comments", () => {
				const fpath = path.join(__dirname, "fixtures", "render-include-with-comments.tpl.html");
				testAllMethods(ctor, fpath, "<!-- This is a comment node -->Hello World", {}, true);
			});

			describe("with root document", () => {
				const fpath = path.join(__dirname, "fixtures", "render-root-document.html");
				const expected = "<!DOCTYPE html><html><head></head><body>Hello World</body></html>";
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("with <head> and <body> tags", () => {
				const fpath = path.join(__dirname, "fixtures", "render-include-head-body.html");
				const expected = "<html><head><title>Test</title></head><body>Hello World</body></html>";
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("with node attributes", () => {
				const fpath = path.join(__dirname, "fixtures", "render-include-attributes.tpl.html");
				const expected = '<span x-attr:click="fn()"></span>';
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("subfolder", () => {
				const expected = "Hello World";
				const fpath = path.join(__dirname, "fixtures", "render-include-subfolder.tpl.html");
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("pass through root var #1", () => {
				const dirpath = path.join(__dirname, "fixtures");
				const fpath = path.join(dirpath, "render-wwwroot.tpl.html");
				const expected = path.relative(fpath, dirpath);
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("pass through root var #2", () => {
				const dirpath = path.join(__dirname, "fixtures");
				const fpath = path.join(dirpath, "subfolder/render-wwwroot.tpl.html");
				const expected = path.relative(fpath, dirpath);
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("pass through root var #3", () => {
				const dirpath = path.join(__dirname, "fixtures");
				const fpath = path.join(dirpath, "subfolder/subsubfolder/render-wwwroot.tpl.html");
				const expected = path.relative(fpath, dirpath);
				testAllMethods(ctor, fpath, expected, {}, true);
			});

			describe("pass through root var #4", () => {
				const dirpath = path.join(__dirname, "fixtures");
				const fpath = path.join(dirpath, "render-include-subsubfolder.tpl.html");
				const expected = path.relative(fpath, dirpath);
				testAllMethods(ctor, fpath, expected, {}, true);
			});
		});
	});
}
