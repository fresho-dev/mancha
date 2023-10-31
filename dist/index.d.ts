/// <reference types="node" />
export declare function renderLocalPath(fpath: string, vars?: {
    [key: string]: string;
}, encoding?: BufferEncoding): Promise<string>;
export declare function renderContent(content: string, vars?: {
    [key: string]: string;
}, fsroot?: string | null, maxdepth?: number): Promise<string>;
export { preprocess, renderRemotePath, encodeHtmlAttrib, decodeHtmlAttrib } from "./web";
