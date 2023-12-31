/// <reference types="node" />
import * as stream from "stream";
/**
 * Main entrypoint to be used in Gulp. Usage:
 *
 *     var mancha = require('gulp-mancha')
 *     gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
 *
 * @param vars <key, value> pairs of literal string replacements. `key` will become `{{key}}` before
 * replacing it with `value` in the processed files.
 */
declare function mancha(vars?: {
    [key: string]: string;
}, wwwroot?: string): stream.Transform;
export default mancha;
