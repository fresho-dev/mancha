import { ParserParams, RendererParams } from "./core";
import { RendererImpl as WorkerRendererImpl } from "./worker";
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
export declare class RendererImpl extends WorkerRendererImpl {
    renderLocalPath(fpath: string, params?: RendererParams & ParserParams): Promise<DocumentFragment>;
}
export { folderPath, resolvePath } from "./core";
export declare const Mancha: RendererImpl;
