import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as File from "vinyl";
import * as gulp from "gulp";

import { Mancha } from "./index";
import mancha from "./gulp/index";

function testContentRender(
  fname: string,
  compare = "Hello World",
  vars: any = {}
) {
  return new Promise<void>(async (resolve, reject) => {
    const content = fs.readFileSync(fname).toString("utf8");

    const fsroot = path.dirname(fname);
    const wwwroot = path.join(__dirname, "fixtures");
    const relpath = path.relative(fsroot, wwwroot) || ".";
    const result = await Mancha.renderContent(content, vars, fsroot, relpath);
    try {
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
function testBufferedTransform(
  fname: string,
  compare = "Hello World",
  vars: any = {}
) {
  return new Promise<void>((resolve, reject) => {
    const file = new File({ path: fname, contents: fs.readFileSync(fname) });
    mancha(vars, path.join(__dirname, "fixtures"))._transform(
      file,
      "utf8",
      (err: Error | null | undefined, file: File) => {
        if (err) {
          reject(err);
        } else {
          const content = file.isBuffer()
            ? file.contents.toString("utf8")
            : null;
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
  return new Promise<void>((resolve, reject) => {
    const file = new File({
      path: fname,
      contents: fs.createReadStream(fname),
    });
    mancha(vars, path.join(__dirname, "fixtures"))._transform(
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
  return new Promise<void>((resolve, reject) => {
    let content: string | null = null;
    gulp
      .src(fname)
      .pipe(mancha(vars, path.join(__dirname, "fixtures")))
      .on("data", (chunk: any) => {
        const file = <File>chunk;
        content = file.isBuffer() ? file.contents.toString("utf8") : null;
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

function testAllMethods(
  fname: string,
  compare = "Hello World",
  vars: any = {}
): void {
  it("content render", async () => {
    await testContentRender(fname, compare, vars);
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
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-simple.tpl.html"
      );
      testAllMethods(fname);
    });

    describe("nested", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-nested.tpl.html"
      );
      testAllMethods(fname);
    });

    describe("multiple", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-multiple.tpl.html"
      );
      testAllMethods(fname);
    });

    describe("with vars", () => {
      const name = "Vars";
      const hello_vars = `Hello ${name}`;
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-vars.tpl.html"
      );
      testAllMethods(fname, hello_vars, { name: name });
    });

    describe("with vars override", () => {
      const name = "Vars";
      const hello_override = `Hello Override`;
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-vars-override.tpl.html"
      );
      testAllMethods(fname, hello_override, { name: name });
    });

    describe("with comments", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-with-comments.tpl.html"
      );
      testAllMethods(fname, "<!-- This is a comment node -->\nHello World");
    });

    describe("with root document", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-with-root.tpl.html"
      );
      const expected =
        "<!DOCTYPE html><html><head></head><body>\nHello World\n</body></html>";
      testAllMethods(fname, expected);
    });

    describe("subfolder", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-subfolder.tpl.html"
      );
      testAllMethods(fname);
    });

    describe("pass through root var #1", () => {
      const fname = path.join(__dirname, "fixtures", "render-root.tpl.html");
      let expected = ".";
      testAllMethods(fname, expected);
    });

    describe("pass through root var #2", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "subfolder/render-root.tpl.html"
      );
      let expected = "..";
      testAllMethods(fname, expected);
    });

    describe("pass through root var #3", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "subfolder/subsubfolder/render-root.tpl.html"
      );
      let expected = "../..";
      testAllMethods(fname, expected);
    });

    describe("pass through root var #4", () => {
      const fname = path.join(
        __dirname,
        "fixtures",
        "render-include-subsubfolder.tpl.html"
      );
      let expected = ".";
      testAllMethods(fname, expected);
    });
  });
});
