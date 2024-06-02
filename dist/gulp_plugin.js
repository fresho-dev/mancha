import * as path from "path";
import * as stream from "stream";
import * as through from "through2";
import { Renderer } from "./index.js";
/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('mancha/dist/gulp')
 *     gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
 *
 * @param context <key, value> pairs of literal string replacements. `key` will become `{{ key }}`
 * before replacing it with `value` in the processed files.
 */
function mancha(context = {}) {
    const renderer = new Renderer(context);
    return through.obj(function (file, encoding, callback) {
        const catcher = (err) => {
            console.log(err);
            callback(err, file);
        };
        const dirpath = path.dirname(file.path);
        if (file.isNull()) {
            callback(null, file);
        }
        else {
            if (file.isBuffer()) {
                const chunk = file.contents.toString(encoding);
                renderer
                    .preprocessString(chunk, { dirpath, rootDocument: !file.path.endsWith(".tpl.html") })
                    .then(async (fragment) => {
                    await renderer.renderNode(fragment);
                    const content = renderer.serializeHTML(fragment);
                    file.contents = Buffer.from(content, encoding);
                    callback(null, file);
                })
                    .catch(catcher);
            }
            else if (file.isStream()) {
                let docstr = "";
                file.contents
                    .on("data", (chunk) => {
                    if (Buffer.isBuffer(chunk)) {
                        docstr += chunk.toString(encoding);
                    }
                    else {
                        docstr += chunk.toString();
                    }
                })
                    .on("end", () => {
                    renderer
                        .preprocessString(docstr, { dirpath, rootDocument: !file.path.endsWith(".tpl.html") })
                        .then(async (document) => {
                        await renderer.renderNode(document);
                        const content = renderer.serializeHTML(document);
                        const readable = new stream.Readable();
                        readable._read = function () { };
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
