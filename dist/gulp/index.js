"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const stream = require("stream");
const through = require("through2");
const index_1 = require("../index");
/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('gulp-mancha')
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
        if (file.isNull()) {
            callback(null, file);
        }
        else {
            const fsroot = path.dirname(file.path);
            const relpath = path.relative(fsroot, wwwroot) || ".";
            if (file.isBuffer()) {
                const fragment = file.contents.toString(encoding);
                index_1.Mancha.renderContent(fragment, vars, fsroot, relpath)
                    .then((content) => {
                    file.contents = Buffer.from(content, encoding);
                    callback(null, file);
                })
                    .catch(catcher);
            }
            else if (file.isStream()) {
                let fragment = "";
                file.contents
                    .on("data", (chunk) => {
                    if (Buffer.isBuffer(chunk)) {
                        fragment += chunk.toString(encoding);
                    }
                    else {
                        fragment += chunk.toString();
                    }
                })
                    .on("end", () => {
                    index_1.Mancha.renderContent(fragment, vars, fsroot, relpath)
                        .then((content) => {
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
