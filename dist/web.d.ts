/// <reference types="node" />
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
export declare function datasetAttributes(attributes: NamedNodeMap): {
    [key: string]: string;
};
export declare function renderContent(content: string, vars?: {
    [key: string]: string;
}, fsroot?: string | null, maxdepth?: number, _renderLocalPathFunc?: typeof renderLocalPath): Promise<string>;
export declare function renderLocalPath(fpath: string, vars?: {
    [key: string]: string;
}, encoding?: BufferEncoding): Promise<string>;
export declare function renderRemotePath(fpath: string, vars?: {
    [key: string]: string;
}): Promise<string>;
export declare function folderPath(fpath: string): string;
export declare function resolvePath(fpath: string): string;
