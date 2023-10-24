/// <reference types="node" />
export declare namespace Mancha {
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
    function renderContent(content: string, vars?: {
        [key: string]: string;
    }, root?: string, wwwroot?: string, encoding?: BufferEncoding): Promise<string>;
}
