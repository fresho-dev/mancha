/// <reference types="node" />
import { RendererImpl as WorkerRendererImpl } from "./worker";
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
declare class RendererImpl extends WorkerRendererImpl {
    renderLocalPath(fpath: string, vars?: {
        [key: string]: string;
    }, encoding?: BufferEncoding): Promise<DocumentFragment>;
}
export { preprocess, folderPath, resolvePath, encodeHtmlAttrib, decodeHtmlAttrib } from "./core";
export declare const Mancha: RendererImpl;
