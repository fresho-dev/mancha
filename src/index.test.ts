import * as assert from "assert";
import * as fs from "fs";
import * as path from "path-browserify";
import * as File from "vinyl";
import * as gulp from "gulp";
// @ts-ignore
import * as StaticServer from "static-server";
import { describe, it } from "mocha";

import { RendererImpl } from "./index";
import gulpMancha from "./gulp";

/**
 * Helper function used to test a transformation of string elements.
 * @param fname file name to test
 */
function testRenderString(fname: string, compare = "Hello World", vars: any = {}) {
  return new Promise<void>(async (resolve, reject) => {
    const content = fs.readFileSync(fname).toString("utf8");

    const dirpath = path.dirname(fname);
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fname, wwwroot) || ".";
    const context = Object.assign({ wwwroot: relpath }, vars);

    try {
      const renderer = new RendererImpl(context);
      const fragment = await renderer.preprocessString(content, {
        dirpath,
        root: !fname.endsWith(".tpl.html"),
      });
      await renderer.renderNode(fragment);
      const result = renderer.serializeHTML(fragment);
      resolve(assert.equal(result, compare, String(result)));
    } catch (exc) {
      console.error(exc);
      reject(exc);
    }
  });
}

/**
 * Helper function used to test a transformation of local file paths.
 * @param fname file name to test
 */
function testRenderLocal(fname: string, compare = "Hello World", vars: any = {}) {
  return new Promise<void>(async (resolve, reject) => {
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fname, wwwroot) || ".";
    const context = Object.assign({ wwwroot: relpath }, vars);
    try {
      const renderer = new RendererImpl(context);
      const fragment = await renderer.preprocessLocal(fname);
      await renderer.renderNode(fragment);
      const result = renderer.serializeHTML(fragment);
      resolve(assert.equal(result, compare, String(result)));
    } catch (exc) {
      console.error(exc);
      reject(exc);
    }
  });
}

/**
 * Helper function used to test a transformation of local file paths.
 * @param fname file name to test
 */
function testRenderRemote(fname: string, compare = "Hello World", vars: any = {}) {
  return new Promise<void>(async (resolve, reject) => {
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fname, wwwroot) || ".";
    const remotePath = `http://127.0.0.1:${port}/${path.relative(wwwroot, fname)}`;
    const context = Object.assign({ wwwroot: relpath }, vars);
    try {
      const renderer = new RendererImpl(context);
      const fragment = await renderer.preprocessRemote(remotePath);
      await renderer.renderNode(fragment);
      const result = renderer.serializeHTML(fragment);
      resolve(assert.equal(result, compare, String(result)));
    } catch (exc) {
      console.error(exc);
      reject(exc);
    }
  });
}

/**
 * Helper function used to test a transformation after reading `fname` into a Buffer.
 * @param fname file name to test
 */
function testBufferedTransform(fname: string, compare = "Hello World", vars: any = {}) {
  return new Promise<void>((resolve, reject) => {
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fname, wwwroot) || ".";
    const context = Object.assign({ wwwroot: relpath }, vars);

    const file = new File({ path: fname, contents: fs.readFileSync(fname) });
    gulpMancha(context, path.join(__dirname, "fixtures"))._transform(
      file,
      "utf8",
      (err: Error | null | undefined, file: File) => {
        if (err) {
          reject(err);
        } else {
          const content = file.isBuffer() ? file.contents.toString("utf8") : null;
          try {
            resolve(assert.equal(content, compare, String(content)));
          } catch (err) {
            reject(err);
          }
        }
      }
    );
  });
}

/**
 * Helper function used to test a transformation after reading `fname` into a ReadableStream.
 * @param fname file name to test
 */
function testStreamedTransform(
  fname: string,
  compare = "Hello World",
  vars: any = {}
): Promise<void> {
  const wwwroot = path.join(__dirname, "fixtures");
  const relpath = path.relative(fname, wwwroot) || ".";
  const context = Object.assign({ wwwroot: relpath }, vars);

  return new Promise<void>((resolve, reject) => {
    const file = new File({
      path: fname,
      contents: fs.createReadStream(fname),
    });
    gulpMancha(context, path.join(__dirname, "fixtures"))._transform(
      file,
      "utf8",
      (err: Error | null | undefined, file: File) => {
        if (err) {
          reject(err);
        } else {
          let content: string = "";
          if (Buffer.isBuffer(file.contents)) {
            content = file.contents.toString("utf8");
            try {
              resolve(assert.equal(content, compare, content));
            } catch (err) {
              reject(err);
            }
          } else {
            file.contents
              ?.on("data", (chunk) => {
                if (Buffer.isBuffer(chunk)) {
                  content += chunk.toString("utf8");
                } else {
                  content += chunk.toString();
                }
              })
              ?.on("end", () => {
                try {
                  resolve(assert.equal(content, compare, content));
                } catch (err) {
                  reject(err);
                }
              });
          }
        }
      }
    );
  });
}

/**
 * Helper function used to test a transformation after reading `fname` into a gulp src.
 * @param fname file name to test
 */
function testGulpedTransform(
  fname: string,
  compare = "Hello World",
  vars: any = {}
): Promise<void> {
  const wwwroot = path.join(__dirname, "fixtures");
  const relpath = path.relative(fname, wwwroot) || ".";
  const context = Object.assign({ wwwroot: relpath }, vars);

  return new Promise<void>((resolve, reject) => {
    let content: string | null = null;
    gulp
      .src(fname)
      .pipe(gulpMancha(context, path.join(__dirname, "fixtures")))
      .on("data", (chunk: File) => {
        content = chunk.isBuffer() ? chunk.contents.toString("utf8") : null;
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        try {
          resolve(assert.equal(content, compare, String(content)));
        } catch (exc) {
          reject(exc);
        }
      });
  });
}

function testAllMethods(fname: string, compare = "Hello World", vars: any = {}): void {
  it("content render", async () => {
    await testRenderString(fname, compare, vars);
  });
  it("local path render", async () => {
    await testRenderLocal(fname, compare, vars);
  });
  it("remote path render", async () => {
    await testRenderRemote(fname, compare, vars);
  });
  it("buffered transform", async () => {
    await testBufferedTransform(fname, compare, vars);
  });
  it("streamed transform", async () => {
    await testStreamedTransform(fname, compare, vars);
  });
  it("gulped transform", async () => {
    await testGulpedTransform(fname, compare, vars);
  });
}

const port = Math.floor(1_024 + Math.random() * (Math.pow(2, 16) - 1_024));
const server = new StaticServer({
  port: port,
  host: "127.0.0.1",
  rootPath: path.join(__dirname, "fixtures"),
});

describe("Mancha index module", () => {
  before("start server", (done) => {
    server.start(done);
  });

  after("stop server", () => {
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
