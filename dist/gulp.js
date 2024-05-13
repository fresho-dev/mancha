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
 * @param context <key, value> pairs of literal string replacements. `key` will become `{{ key }}`
 * before replacing it with `value` in the processed files.
 */
function mancha(context = {}, wwwroot = process.cwd()) {
    const renderer = new index_1.RendererImpl(context);
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
                    .preprocessString(chunk, { dirpath, root: !file.path.endsWith(".tpl.html") })
                    .then((fragment) => __awaiter(this, void 0, void 0, function* () {
                    yield renderer.renderNode(fragment);
                    const content = renderer.serializeHTML(fragment);
                    file.contents = Buffer.from(content, encoding);
                    callback(null, file);
                }))
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
                        .preprocessString(docstr, { dirpath, root: !file.path.endsWith(".tpl.html") })
                        .then((document) => __awaiter(this, void 0, void 0, function* () {
                        yield renderer.renderNode(document);
                        const content = renderer.serializeHTML(document);
                        const readable = new stream.Readable();
                        readable._read = function () { };
                        readable.push(content);
                        readable.push(null);
                        file.contents = readable;
                        callback(null, file);
                    }))
                        .catch(catcher);
                });
            }
        }
    });
}
exports.default = mancha;
