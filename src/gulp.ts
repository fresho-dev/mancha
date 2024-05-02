import * as path from "path";
import * as stream from "stream";
import * as through from "through2";
import * as File from "vinyl";

import { Mancha } from "./index";

/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('mancha/dist/gulp')
 *     gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
 *
 * @param vars <key, value> pairs of literal string replacements. `key` will become `{{key}}` before
 * replacing it with `value` in the processed files.
 */
function mancha(
  vars: { [key: string]: string } = {},
  wwwroot: string = process.cwd()
): stream.Transform {
  return through.obj(function (file: File, encoding: BufferEncoding, callback: Function) {
    const catcher = (err: Error) => {
      console.log(err);
      callback(err, file);
    };

    const fsroot = path.dirname(file.path);
    const relpath = path.relative(file.path, wwwroot) || ".";
    const newvars = Object.assign(vars, { wwwroot: relpath });

    if (file.isNull()) {
      callback(null, file);
    } else {
      if (file.isBuffer()) {
        const chunk = file.contents.toString(encoding);
        Mancha.renderString(chunk, newvars, fsroot)
          .then((fragment) => {
            const content = Mancha.serializeDocumentFragment(fragment);
            file.contents = Buffer.from(content, encoding);
            callback(null, file);
          })
          .catch(catcher);
      } else if (file.isStream()) {
        let docstr: string = "";
        file.contents
          .on("data", (chunk) => {
            if (Buffer.isBuffer(chunk)) {
              docstr += chunk.toString(encoding);
            } else {
              docstr += chunk.toString();
            }
          })
          .on("end", () => {
            Mancha.renderString(docstr, newvars, fsroot)
              .then((document) => {
                const content = Mancha.serializeDocumentFragment(document);
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

export default mancha;
