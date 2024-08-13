import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore
import * as StaticServer from "static-server";
import { fileURLToPath } from "url";
import { after, before, describe, it } from "node:test";
import { Renderer } from "./index.js";
// Fix `__filename` and `__dirname`: https://stackoverflow.com/a/64383997.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Helper function used to test a transformation of string elements.
 * @param fname file name to test
 */
function testRenderString(fname, compare = "Hello World", vars = {}) {
    return new Promise(async (resolve, reject) => {
        const content = fs.readFileSync(fname);
        const dirpath = path.dirname(fname);
        const wwwroot = path.join(__dirname, "fixtures");
        const relpath = path.relative(fname, wwwroot) || ".";
        const context = Object.assign({ wwwroot: relpath }, vars);
        try {
            const renderer = new Renderer(context);
            const fragment = await renderer.preprocessString(content.toString("utf8"), {
                dirpath,
                rootDocument: !fname.endsWith(".tpl.html"),
            });
            await renderer.renderNode(fragment);
            const result = renderer.serializeHTML(fragment);
            resolve(assert.equal(result, compare, String(result)));
        }
        catch (exc) {
            console.error(exc);
            reject(exc);
        }
    });
}
/**
 * Helper function used to test a transformation of local file paths.
 * @param fname file name to test
 */
function testRenderLocal(fname, compare = "Hello World", vars = {}) {
    return new Promise(async (resolve, reject) => {
        const wwwroot = path.join(__dirname, "fixtures");
        const relpath = path.relative(fname, wwwroot) || ".";
        const context = Object.assign({ wwwroot: relpath }, vars);
        try {
            const renderer = new Renderer(context);
            const fragment = await renderer.preprocessLocal(fname);
            await renderer.renderNode(fragment);
            const result = renderer.serializeHTML(fragment);
            resolve(assert.equal(result, compare, String(result)));
        }
        catch (exc) {
            console.error(exc);
            reject(exc);
        }
    });
}
/**
 * Helper function used to test a transformation of local file paths.
 * @param fname file name to test
 */
function testRenderRemote(fname, compare = "Hello World", vars = {}) {
    return new Promise(async (resolve, reject) => {
        const wwwroot = path.join(__dirname, "fixtures");
        const relpath = path.relative(fname, wwwroot) || ".";
        const remotePath = `http://127.0.0.1:${port}/${path.relative(wwwroot, fname)}`;
        const context = Object.assign({ wwwroot: relpath }, vars);
        try {
            const renderer = new Renderer(context);
            const fragment = await renderer.preprocessRemote(remotePath);
            await renderer.renderNode(fragment);
            const result = renderer.serializeHTML(fragment);
            resolve(assert.equal(result, compare, String(result)));
        }
        catch (exc) {
            console.error(exc);
            reject(exc);
        }
    });
}
function testAllMethods(fname, compare = "Hello World", vars = {}) {
    it("content render", async () => {
        await testRenderString(fname, compare, vars);
    });
    it("local path render", async () => {
        await testRenderLocal(fname, compare, vars);
    });
    it("remote path render", async () => {
        await testRenderRemote(fname, compare, vars);
    });
}
const port = Math.floor(1_024 + Math.random() * (Math.pow(2, 16) - 1_024));
const server = new StaticServer.default({
    port: port,
    host: "127.0.0.1",
    rootPath: path.join(__dirname, "fixtures"),
});
describe("Mancha index module", () => {
    before(async () => {
        return new Promise((done) => server.start(done));
    });
    after(() => {
        server.stop();
    });
    describe("render", () => {
        describe("substitution", () => {
            const name = "Vars";
            const hello_vars = `Hello ${name}`;
            const fname = path.join(__dirname, "fixtures", "hello-name.tpl.html");
            testAllMethods(fname, hello_vars, { name: name });
        });
    });
    describe("include", () => {
        describe("simple", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-simple.tpl.html");
            testAllMethods(fname);
        });
        describe("nested", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-nested.tpl.html");
            testAllMethods(fname);
        });
        describe("multiple", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-multiple.tpl.html");
            testAllMethods(fname);
        });
        describe("with vars", () => {
            const name = "Vars";
            const hello_vars = `Hello ${name}`;
            const fname = path.join(__dirname, "fixtures", "render-include-vars.tpl.html");
            testAllMethods(fname, hello_vars, { name: name });
        });
        describe("with comments", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-with-comments.tpl.html");
            testAllMethods(fname, "<!-- This is a comment node -->\nHello World");
        });
        describe("with root document", () => {
            const fname = path.join(__dirname, "fixtures", "render-root-document.html");
            const expected = "<!DOCTYPE html><html><head></head><body>\nHello World\n</body></html>";
            testAllMethods(fname, expected);
        });
        describe("with node attributes", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-attributes.tpl.html");
            const expected = '<span x-attr:click="fn()"></span>';
            testAllMethods(fname, expected);
        });
        describe("subfolder", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-subfolder.tpl.html");
            testAllMethods(fname);
        });
        describe("pass through root var #1", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "render-wwwroot.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
        describe("pass through root var #2", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "subfolder/render-wwwroot.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
        describe("pass through root var #3", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "subfolder/subsubfolder/render-wwwroot.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
        describe("pass through root var #4", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "render-include-subsubfolder.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
    });
});
