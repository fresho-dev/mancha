"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path-browserify");
const File = require("vinyl");
const gulp = require("gulp");
// @ts-ignore
const StaticServer = require("static-server");
const mocha_1 = require("mocha");
const index_1 = require("./index");
const gulp_1 = require("./gulp");
/**
 * Helper function used to test a transformation of string elements.
 * @param fname file name to test
 */
function testRenderString(fname, compare = "Hello World", vars = {}) {
    return new Promise(async (resolve, reject) => {
        const content = fs.readFileSync(fname).toString("utf8");
        const dirpath = path.dirname(fname);
        const wwwroot = path.join(__dirname, "fixtures");
        const relpath = path.relative(fname, wwwroot) || ".";
        const context = Object.assign({ wwwroot: relpath }, vars);
        try {
            const renderer = new index_1.RendererImpl(context);
            const fragment = await renderer.preprocessString(content, {
                dirpath,
                root: !fname.endsWith(".tpl.html"),
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
            const renderer = new index_1.RendererImpl(context);
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
            const renderer = new index_1.RendererImpl(context);
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
/**
 * Helper function used to test a transformation after reading `fname` into a Buffer.
 * @param fname file name to test
 */
function testBufferedTransform(fname, compare = "Hello World", vars = {}) {
    return new Promise((resolve, reject) => {
        const wwwroot = path.join(__dirname, "fixtures");
        const relpath = path.relative(fname, wwwroot) || ".";
        const context = Object.assign({ wwwroot: relpath }, vars);
        const file = new File({ path: fname, contents: fs.readFileSync(fname) });
        (0, gulp_1.default)(context, path.join(__dirname, "fixtures"))._transform(file, "utf8", (err, file) => {
            if (err) {
                reject(err);
            }
            else {
                const content = file.isBuffer() ? file.contents.toString("utf8") : null;
                try {
                    resolve(assert.equal(content, compare, String(content)));
                }
                catch (err) {
                    reject(err);
                }
            }
        });
    });
}
/**
 * Helper function used to test a transformation after reading `fname` into a ReadableStream.
 * @param fname file name to test
 */
function testStreamedTransform(fname, compare = "Hello World", vars = {}) {
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fname, wwwroot) || ".";
    const context = Object.assign({ wwwroot: relpath }, vars);
    return new Promise((resolve, reject) => {
        const file = new File({
            path: fname,
            contents: fs.createReadStream(fname),
        });
        (0, gulp_1.default)(context, path.join(__dirname, "fixtures"))._transform(file, "utf8", (err, file) => {
            if (err) {
                reject(err);
            }
            else {
                let content = "";
                if (Buffer.isBuffer(file.contents)) {
                    content = file.contents.toString("utf8");
                    try {
                        resolve(assert.equal(content, compare, content));
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                else {
                    file.contents
                        ?.on("data", (chunk) => {
                        if (Buffer.isBuffer(chunk)) {
                            content += chunk.toString("utf8");
                        }
                        else {
                            content += chunk.toString();
                        }
                    })
                        ?.on("end", () => {
                        try {
                            resolve(assert.equal(content, compare, content));
                        }
                        catch (err) {
                            reject(err);
                        }
                    });
                }
            }
        });
    });
}
/**
 * Helper function used to test a transformation after reading `fname` into a gulp src.
 * @param fname file name to test
 */
function testGulpedTransform(fname, compare = "Hello World", vars = {}) {
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fname, wwwroot) || ".";
    const context = Object.assign({ wwwroot: relpath }, vars);
    return new Promise((resolve, reject) => {
        let content = null;
        gulp
            .src(fname)
            .pipe((0, gulp_1.default)(context, path.join(__dirname, "fixtures")))
            .on("data", (chunk) => {
            content = chunk.isBuffer() ? chunk.contents.toString("utf8") : null;
        })
            .on("error", (err) => {
            reject(err);
        })
            .on("end", () => {
            try {
                resolve(assert.equal(content, compare, String(content)));
            }
            catch (exc) {
                reject(exc);
            }
        });
    });
}
function testAllMethods(fname, compare = "Hello World", vars = {}) {
    (0, mocha_1.it)("content render", async () => {
        await testRenderString(fname, compare, vars);
    });
    (0, mocha_1.it)("local path render", async () => {
        await testRenderLocal(fname, compare, vars);
    });
    (0, mocha_1.it)("remote path render", async () => {
        await testRenderRemote(fname, compare, vars);
    });
    (0, mocha_1.it)("buffered transform", async () => {
        await testBufferedTransform(fname, compare, vars);
    });
    (0, mocha_1.it)("streamed transform", async () => {
        await testStreamedTransform(fname, compare, vars);
    });
    (0, mocha_1.it)("gulped transform", async () => {
        await testGulpedTransform(fname, compare, vars);
    });
}
const port = Math.floor(1_024 + Math.random() * (Math.pow(2, 16) - 1_024));
const server = new StaticServer({
    port: port,
    host: "127.0.0.1",
    rootPath: path.join(__dirname, "fixtures"),
});
(0, mocha_1.describe)("Mancha index module", () => {
    before("start server", (done) => {
        server.start(done);
    });
    after("stop server", () => {
        server.stop();
    });
    (0, mocha_1.describe)("render", () => {
        (0, mocha_1.describe)("substitution", () => {
            const name = "Vars";
            const hello_vars = `Hello ${name}`;
            const fname = path.join(__dirname, "fixtures", "hello-name.tpl.html");
            testAllMethods(fname, hello_vars, { name: name });
        });
    });
    (0, mocha_1.describe)("include", () => {
        (0, mocha_1.describe)("simple", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-simple.tpl.html");
            testAllMethods(fname);
        });
        (0, mocha_1.describe)("nested", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-nested.tpl.html");
            testAllMethods(fname);
        });
        (0, mocha_1.describe)("multiple", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-multiple.tpl.html");
            testAllMethods(fname);
        });
        (0, mocha_1.describe)("with vars", () => {
            const name = "Vars";
            const hello_vars = `Hello ${name}`;
            const fname = path.join(__dirname, "fixtures", "render-include-vars.tpl.html");
            testAllMethods(fname, hello_vars, { name: name });
        });
        (0, mocha_1.describe)("with comments", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-with-comments.tpl.html");
            testAllMethods(fname, "<!-- This is a comment node -->\nHello World");
        });
        (0, mocha_1.describe)("with root document", () => {
            const fname = path.join(__dirname, "fixtures", "render-root-document.html");
            const expected = "<!DOCTYPE html><html><head></head><body>\nHello World\n</body></html>";
            testAllMethods(fname, expected);
        });
        (0, mocha_1.describe)("with node attributes", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-attributes.tpl.html");
            const expected = '<span x-attr:click="fn()"></span>';
            testAllMethods(fname, expected);
        });
        (0, mocha_1.describe)("subfolder", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-subfolder.tpl.html");
            testAllMethods(fname);
        });
        (0, mocha_1.describe)("pass through root var #1", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "render-wwwroot.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
        (0, mocha_1.describe)("pass through root var #2", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "subfolder/render-wwwroot.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
        (0, mocha_1.describe)("pass through root var #3", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "subfolder/subsubfolder/render-wwwroot.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
        (0, mocha_1.describe)("pass through root var #4", () => {
            const dirpath = path.join(__dirname, "fixtures");
            const fpath = path.join(dirpath, "render-include-subsubfolder.tpl.html");
            const expected = path.relative(fpath, dirpath);
            testAllMethods(fpath, expected);
        });
    });
});
