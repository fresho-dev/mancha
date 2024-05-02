"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const stream = require("stream");
const through = require("through2");
const index_1 = require("./index");
/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('mancha/dist/gulp')
 *     gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
 *
 * @param vars <key, value> pairs of literal string replacements. `key` will become `{{key}}` before
 * replacing it with `value` in the processed files.
 */
function mancha(vars = {}, wwwroot = process.cwd()) {
    return through.obj(function (file, encoding, callback) {
        const catcher = (err) => {
            console.log(err);
            callback(err, file);
        };
        const fsroot = path.dirname(file.path);
        const relpath = path.relative(file.path, wwwroot) || ".";
        const newvars = Object.assign(vars, { wwwroot: relpath });
        if (file.isNull()) {
            callback(null, file);
        }
        else {
            if (file.isBuffer()) {
                const chunk = file.contents.toString(encoding);
                index_1.Mancha.renderString(chunk, newvars, fsroot)
                    .then((fragment) => {
                    const content = index_1.Mancha.serializeDocumentFragment(fragment);
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
                    index_1.Mancha.renderString(docstr, newvars, fsroot)
                        .then((document) => {
                        const content = index_1.Mancha.serializeDocumentFragment(document);
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
exports.default = mancha;
