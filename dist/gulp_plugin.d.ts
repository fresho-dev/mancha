/// <reference types="node" />
import * as stream from "stream";
/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('mancha/dist/gulp')
 *     gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
 *
 * @param context <key, value> pairs of literal string replacements. `key` will become `{{ key }}`
 * before replacing it with `value` in the processed files.
 */
declare function mancha(context?: {
    [key: string]: string;
}): stream.Transform;
export default mancha;
