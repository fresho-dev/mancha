"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const File = require("vinyl");
const gulp = require("gulp");
const mancha_1 = require("../mancha");
/**
 * Helper function used to test a transformation after reading `fname` into a Buffer
 * @param fname file name to test
 */
function testBufferedTransform(fname, compare = "Hello World", vars = {}) {
    return new Promise((resolve, reject) => {
        const file = new File({ path: fname, contents: fs.readFileSync(fname) });
        (0, mancha_1.default)(vars)._transform(file, "utf8", (err, file) => {
            if (err) {
                reject(err);
            }
            else {
                const content = file.isBuffer()
                    ? file.contents.toString("utf8")
                    : null;
                assert.equal(content, compare, String(content));
                resolve();
            }
        });
    });
}
/**
 * Helper function used to test a transformation after reading `fname` into a ReadableStream
 * @param fname file name to test
 */
function testStreamedTransform(fname, compare = "Hello World", vars = {}) {
    return new Promise((resolve, reject) => {
        const file = new File({
            path: fname,
            contents: fs.createReadStream(fname),
        });
        (0, mancha_1.default)(vars)._transform(file, "utf8", (err, file) => {
            var _a;
            if (err) {
                reject(err);
            }
            else {
                let content = "";
                if (Buffer.isBuffer(file.contents)) {
                    content = file.contents.toString("utf8");
                    assert.equal(content, "Hello World", content);
                    resolve();
                }
                else {
                    (_a = file.contents) === null || _a === void 0 ? void 0 : _a.on("data", (chunk) => {
                        if (Buffer.isBuffer(chunk)) {
                            content += chunk.toString("utf8");
                        }
                        else {
                            content += chunk.toString();
                        }
                    }).on("end", () => {
                        assert.equal(content, compare, content);
                        resolve();
                    });
                }
            }
        });
    });
}
/**
 * Helper function used to test a transformation after reading `fname` into a ReadableStream
 * @param fname file name to test
 */
function testGulpedTransform(fname, compare = "Hello World", vars = {}) {
    return new Promise((resolve, reject) => {
        let content = null;
        gulp
            .src(fname)
            .pipe((0, mancha_1.default)(vars, "./dist/test/fixtures"))
            .on("data", (chunk) => {
            const file = chunk;
            content = file.isBuffer() ? file.contents.toString("utf8") : null;
        })
            .on("end", () => {
            assert.equal(content, compare, String(content));
            resolve();
        });
    });
}
describe("Mancha", () => {
    describe("include", () => {
        it("include with vars", (done) => {
            const name = "Vars";
            const hello_vars = `Hello ${name}`;
            const fname = path.join(__dirname, "fixtures", "hello-name.tpl.html");
            testBufferedTransform(fname, hello_vars, { name: name }).then(done);
        });
    });
    describe("render", () => {
        it("simple include (buffer)", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-simple.tpl.html");
            testBufferedTransform(fname).then(done);
        });
        it("simple include (stream)", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-simple.tpl.html");
            testStreamedTransform(fname).then(done);
        });
        it("simple include (gulp)", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-simple.tpl.html");
            testGulpedTransform(fname).then(done);
        });
        it("nested include", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-nested.tpl.html");
            testBufferedTransform(fname).then(done);
        });
        it("multiple include", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-multiple.tpl.html");
            testBufferedTransform(fname).then(done);
        });
        it("include with vars", (done) => {
            const name = "Vars";
            const hello_vars = `Hello ${name}`;
            const fname = path.join(__dirname, "fixtures", "render-include-vars.tpl.html");
            testBufferedTransform(fname, hello_vars, { name: name }).then(done);
        });
        it("include with vars override", (done) => {
            const name = "Vars";
            const hello_override = `Hello Override`;
            const fname = path.join(__dirname, "fixtures", "render-include-vars-override.tpl.html");
            testBufferedTransform(fname, hello_override, { name: name }).then(done);
        });
        it("include with comments", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-with-comments.tpl.html");
            testBufferedTransform(fname, "<!-- This is a comment node -->\nHello World").then(done);
        });
        it("include with root document", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-with-root.tpl.html");
            const expected = "<!DOCTYPE html><html><head></head><body>\nHello World\n</body></html>";
            testBufferedTransform(fname, expected).then(done);
        });
        it("subfolder include", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-subfolder.tpl.html");
            testBufferedTransform(fname).then(done);
        });
        it("pass through root var #1", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-root.tpl.html");
            let expected = ".";
            testGulpedTransform(fname, expected).then(done);
        });
        it("pass through root var #2", (done) => {
            const fname = path.join(__dirname, "fixtures", "subfolder/render-root.tpl.html");
            let expected = "..";
            testGulpedTransform(fname, expected).then(done);
        });
        it("pass through root var #3", (done) => {
            const fname = path.join(__dirname, "fixtures", "subfolder/subsubfolder/render-root.tpl.html");
            let expected = "../..";
            testGulpedTransform(fname, expected).then(done);
        });
        it("pass through root var #4", (done) => {
            const fname = path.join(__dirname, "fixtures", "render-include-subsubfolder.tpl.html");
            let expected = ".";
            testGulpedTransform(fname, expected).then(done);
        });
    });
});
