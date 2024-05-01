/// <reference types="node" />
import { IRenderer } from "./core";
export declare class RendererImpl extends IRenderer {
    parseDocument(content: string): Document;
    serializeDocument(document: Document): string;
    replaceNodeWith(original: Node, replacement: Node[]): void;
    renderLocalPath(fpath: string, vars?: {
        [key: string]: string;
    }, encoding?: BufferEncoding): Promise<string>;
}
export { preprocess, folderPath, resolvePath, encodeHtmlAttrib, decodeHtmlAttrib } from "./core";
export declare const Mancha: RendererImpl;
