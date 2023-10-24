import * as path from "path";
import * as stream from "stream";
import * as through from "through2";
import * as File from "vinyl";

import { Mancha } from "../index";

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
      const fsroot = path.dirname(file.path);
      const relpath = path.relative(fsroot, wwwroot) || ".";

      if (file.isBuffer()) {
        const fragment = file.contents.toString(encoding);
        Mancha.renderContent(fragment, vars, fsroot, relpath)
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
            Mancha.renderContent(fragment, vars, fsroot, relpath)
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

export default mancha;
