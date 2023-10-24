/// <reference types="node" />
/// <reference types="node" />
import * as stream from "stream";
declare namespace Mancha {
    /**
     * Helper function used to escape HTML attribute values.
     * See: https://stackoverflow.com/a/9756789
     */
    function encodeHtmlAttrib(value: string): string;
    /** Inverse the operation of [encodeHtmlAttrib] */
    function decodeHtmlAttrib(value: string): string;
    function preprocess(content: string, vars: {
        [key: string]: string;
    }, wwwroot: string): string;
    function render(content: string, vars?: {
        [key: string]: string;
    }, root?: string, wwwroot?: string, encoding?: BufferEncoding): Promise<string>;
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
declare function mancha(vars?: {
    [key: string]: string;
}, wwwroot?: string): stream.Transform;
declare namespace mancha {
    var encodeHtmlAttrib: typeof Mancha.encodeHtmlAttrib;
    var decodeHtmlAttrib: typeof Mancha.decodeHtmlAttrib;
}
export default mancha;
