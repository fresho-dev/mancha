import * as fs from "fs";
import * as path from "path";
import * as parse5 from "parse5";
import {
  ChildNode,
  Document,
  DocumentFragment,
  Element,
  Node,
  ParentNode,
} from "parse5/dist/tree-adapters/default";
import * as stream from "stream";
import * as through from "through2";
import * as File from "vinyl";

module Mancha {
  function replaceNodeWith(original: Node, replacement: Node[]) {
    const elem = <Element>original;
    const parent = <ParentNode>elem.parentNode;
    const index = parent.childNodes.indexOf(elem);
    replacement.forEach((elem) => ((<Element>elem).parentNode = parent));
    parent.childNodes = (<ChildNode[]>[])
      .concat(parent.childNodes.slice(0, index))
      .concat(replacement as ChildNode[])
      .concat(parent.childNodes.slice(index + 1));
  }

  function isDocument(content: string) {
    return /^[\n\r\s]*<(!doctype|html|head|body)\b/i.test(content);
  }

  function smartParse(content: string): Document | DocumentFragment {
    return isDocument(content)
      ? (parse5.parse(content) as Document)
      : (parse5.parseFragment(content) as DocumentFragment);
  }

  function traverse(tree: Element | Element[]): Promise<Node[]> {
    return new Promise<Node[]>((resolve) => {
      const explored: Node[] = [];
      const frontier: Node[] = Array.isArray(tree) ? tree : [tree];

      while (frontier.length) {
        const node: Element = <Element>frontier.pop();
        explored.push(node);
        if (node.childNodes) {
          node.childNodes.forEach((node) => frontier.push(node));
        }
      }

      resolve(explored);
    });
  }

  /**
   * Helper function used to escape HTML attribute values.
   * See: https://stackoverflow.com/a/9756789
   */
  export function encodeHtmlAttrib(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&apos;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r\n/g, "&#13;")
      .replace(/[\r\n]/g, "&#13;");
  }

  /** Inverse the operation of [encodeHtmlAttrib] */
  export function decodeHtmlAttrib(value: string) {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#13;/g, "\n");
  }

  export function preprocess(
    content: string,
    vars: { [key: string]: string },
    wwwroot: string
  ): string {
    // Add the root relative to this file as a variable
    const newvars = Object.assign({ wwwroot: wwwroot }, vars);

    // Replace all {{variables}}
    Object.keys(newvars).forEach((key) => {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), newvars[key]);
    });
    return content;
  }

  export function render(
    content: string,
    vars: { [key: string]: string } = {},
    root: string = ".",
    wwwroot: string = ".",
    encoding: BufferEncoding = "utf8"
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const preprocessed = preprocess(content, vars, wwwroot);
      const document = smartParse(preprocessed);
      traverse(document.childNodes.map((node) => node as Element))
        .then((nodes) => {
          const promises = nodes.map((node) => {
            return new Promise<void>((resolve, reject) => {
              if (node.nodeName === "include") {
                const attribs = (node as Element).attrs.reduce(
                  (dict: any, attr) => {
                    dict[attr.name] = attr.value;
                    return dict;
                  },
                  {}
                );

                // If the node has a vars attribute, it overrides our current vars
                // NOTE: this will propagate to all subsequent calls to render,
                //  including nested calls
                if (attribs.hasOwnProperty("data-vars")) {
                  vars = Object.assign(
                    {},
                    vars,
                    JSON.parse(decodeHtmlAttrib(attribs["data-vars"]))
                  );
                }

                // Case 1: we render the fragment by including another file
                if (attribs["src"]) {
                  const fname = path.join(root, attribs["src"]);
                  const newroot = path.dirname(fname);
                  const contents = fs.readFileSync(fname, encoding);
                  render(contents, vars, newroot, wwwroot, encoding)
                    .then((content) => {
                      const docfragment = parse5.parseFragment(
                        content
                      ) as DocumentFragment;
                      replaceNodeWith(node, docfragment.childNodes);
                      resolve();
                    })
                    .catch((err) => reject(err));
                } else {
                  reject(
                    new Error(
                      `"src" attribute missing from ${JSON.stringify(node)}`
                    )
                  );
                }
              } else {
                resolve();
              }
            });
          });

          return Promise.all(promises);
        })
        .then(() => {
          const result = parse5.serialize(document);

          // Render until there are no changes
          if (result === preprocessed) {
            resolve(parse5.serialize(document));
          } else {
            render(result, vars, root, wwwroot, encoding)
              .then(resolve)
              .catch(reject);
          }
        })
        .catch(reject);
    });
  }
}

/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('gulp-mancha')
 *     gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
 *
 * @param vars <key, value> pairs of literal string replacements. `key` will become `{{key}}` before
 * replacing it with `value` in the processed files.
 */
function mancha(
  vars: { [key: string]: string } = {},
  wwwroot: string = process.cwd()
): stream.Transform {
  return through.obj(function (
    file: File,
    encoding: BufferEncoding,
    callback: Function
  ) {
    const catcher = (err: Error) => {
      console.log(err);
      callback(err, file);
    };

    if (file.isNull()) {
      callback(null, file);
    } else {
      const root = path.dirname(file.path);
      const relpath = path.relative(root, wwwroot) || ".";

      if (file.isBuffer()) {
        const fragment = file.contents.toString(encoding);
        Mancha.render(fragment, vars, root, relpath)
          .then((content) => {
            file.contents = Buffer.from(content, encoding);
            callback(null, file);
          })
          .catch(catcher);
      } else if (file.isStream()) {
        let fragment: string = "";
        file.contents
          .on("data", (chunk) => {
            if (Buffer.isBuffer(chunk)) {
              fragment += chunk.toString(encoding);
            } else {
              fragment += chunk.toString();
            }
          })
          .on("end", () => {
            Mancha.render(fragment, vars, root, relpath)
              .then((content) => {
                const readable = new stream.Readable();
                readable._read = function () {};
                readable.push(content);
                readable.push(null);
                file.contents = readable;
                callback(null, file);
              })
              .catch(catcher);
          });
      }
    }
  });
}

// Add exported functions as properties of the main export
mancha.encodeHtmlAttrib = Mancha.encodeHtmlAttrib;
mancha.decodeHtmlAttrib = Mancha.decodeHtmlAttrib;

export default mancha;
