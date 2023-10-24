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
    }): string;
    function renderContent(content: string, vars?: {
        [key: string]: string;
    }, fsroot?: string): Promise<string>;
    function renderLocalPath(fpath: string, vars?: {
        [key: string]: string;
    }, encoding?: BufferEncoding): Promise<string>;
}
