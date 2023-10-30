/// <reference types="node" />
import * as tree from "parse5/dist/tree-adapters/default";
/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
export declare function encodeHtmlAttrib(value: string): string;
/** Inverse the operation of [encodeHtmlAttrib] */
export declare function decodeHtmlAttrib(value: string): string;
export declare function preprocess(content: string, vars: {
    [key: string]: string;
}): string;
export declare function renderContent(content: string, vars?: {
    [key: string]: string;
}, fsroot?: string, maxdepth?: number): Promise<string>;
export declare function renderDocument(document: tree.Document | tree.DocumentFragment, vars?: {
    [key: string]: string;
}, fsroot?: string, maxdepth?: number): Promise<string>;
export declare function renderLocalPath(fpath: string, vars?: {
    [key: string]: string;
}, encoding?: BufferEncoding): Promise<string>;
export declare function renderRemotePath(fpath: string, vars?: {
    [key: string]: string;
}): Promise<string>;
