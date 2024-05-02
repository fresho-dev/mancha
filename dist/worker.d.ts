/// <reference types="node" />
import { IRenderer } from "./core";
export declare class RendererImpl extends IRenderer {
    parseDocumentFragment(content: string): DocumentFragment;
    serializeDocumentFragment(document: DocumentFragment): string;
    replaceNodeWith(original: Node, replacement: Node[]): void;
    renderLocalPath(fpath: string, vars?: {
        [key: string]: string;
    }, encoding?: BufferEncoding): Promise<DocumentFragment>;
}
export { preprocess, folderPath, resolvePath, encodeHtmlAttrib, decodeHtmlAttrib } from "./core";
export declare const Mancha: RendererImpl;
