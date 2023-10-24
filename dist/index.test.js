"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const File = require("vinyl");
const gulp = require("gulp");
const index_1 = require("./index");
const index_2 = require("./gulp/index");
function testContentRender(fname, compare = "Hello World", vars = {}) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const content = fs.readFileSync(fname).toString("utf8");
        const fsroot = path.dirname(fname);
        const wwwroot = path.join(__dirname, "fixtures");
        const relpath = path.relative(fname, wwwroot) || ".";
        vars = Object.assign({ wwwroot: relpath }, vars);
        try {
            const result = yield index_1.Mancha.renderContent(content, vars, fsroot);
            resolve(assert.equal(result, compare, String(result)));
        }
        catch (exc) {
            console.error(exc);
            reject(exc);
        }
    }));
}
/**
 * Helper function used to test a transformation after reading `fname` into a Buffer.
 * @param fname file name to test
 */
function testBufferedTransform(fname, compare = "Hello World", vars = {}) {
    return new Promise((resolve, reject) => {
        const file = new File({ path: fname, contents: fs.readFileSync(fname) });
        (0, index_2.default)(vars, path.join(__dirname, "fixtures"))._transform(file, "utf8", (err, file) => {
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
    return new Promise((resolve, reject) => {
        const file = new File({
            path: fname,
            contents: fs.createReadStream(fname),
        });
        (0, index_2.default)(vars, path.join(__dirname, "fixtures"))._transform(file, "utf8", (err, file) => {
            var _a, _b;
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
                    (_b = (_a = file.contents) === null || _a === void 0 ? void 0 : _a.on("data", (chunk) => {
                        if (Buffer.isBuffer(chunk)) {
                            content += chunk.toString("utf8");
                        }
                        else {
                            content += chunk.toString();
                        }
                    })) === null || _b === void 0 ? void 0 : _b.on("end", () => {
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
    return new Promise((resolve, reject) => {
        let content = null;
        gulp
            .src(fname)
            .pipe((0, index_2.default)(vars, path.join(__dirname, "fixtures")))
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
    it("content render", () => __awaiter(this, void 0, void 0, function* () {
        yield testContentRender(fname, compare, vars);
    }));
    it("buffered transform", () => __awaiter(this, void 0, void 0, function* () {
        yield testBufferedTransform(fname, compare, vars);
    }));
    it("streamed transform", () => __awaiter(this, void 0, void 0, function* () {
        yield testStreamedTransform(fname, compare, vars);
    }));
    it("gulped transform", () => __awaiter(this, void 0, void 0, function* () {
        yield testGulpedTransform(fname, compare, vars);
    }));
}
describe("Mancha", () => {
    describe("vars", () => {
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
        describe("with vars override", () => {
            const name = "Vars";
            const hello_override = `Hello Override`;
            const fname = path.join(__dirname, "fixtures", "render-include-vars-override.tpl.html");
            testAllMethods(fname, hello_override, { name: name });
        });
        describe("with comments", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-with-comments.tpl.html");
            testAllMethods(fname, "<!-- This is a comment node -->\nHello World");
        });
        describe("with root document", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-with-root.tpl.html");
            const expected = "<!DOCTYPE html><html><head></head><body>\nHello World\n</body></html>";
            testAllMethods(fname, expected);
        });
        describe("subfolder", () => {
            const fname = path.join(__dirname, "fixtures", "render-include-subfolder.tpl.html");
            testAllMethods(fname);
        });
        describe("pass through root var #1", () => {
            const fsroot = path.join(__dirname, "fixtures");
            const fpath = path.join(fsroot, "render-root.tpl.html");
            const expected = path.relative(fpath, fsroot);
            testAllMethods(fpath, expected);
        });
        describe("pass through root var #2", () => {
            const fsroot = path.join(__dirname, "fixtures");
            const fpath = path.join(fsroot, "subfolder/render-root.tpl.html");
            const expected = path.relative(fpath, fsroot);
            testAllMethods(fpath, expected);
        });
        describe("pass through root var #3", () => {
            const fsroot = path.join(__dirname, "fixtures");
            const fpath = path.join(fsroot, "subfolder/subsubfolder/render-root.tpl.html");
            const expected = path.relative(fpath, fsroot);
            testAllMethods(fpath, expected);
        });
        describe("pass through root var #4", () => {
            const fsroot = path.join(__dirname, "fixtures");
            const fpath = path.join(fsroot, "render-include-subsubfolder.tpl.html");
            const expected = path.relative(fpath, fsroot);
            testAllMethods(fpath, expected);
        });
    });
});
