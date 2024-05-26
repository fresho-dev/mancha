import { RendererImpl as WorkerRendererImpl } from "./worker.js";
import { ParserParams, RenderParams } from "./interfaces.js";
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
export declare class RendererImpl extends WorkerRendererImpl {
    fetchLocal(fpath: string, params?: RenderParams & ParserParams): Promise<string>;
}
export declare const Mancha: RendererImpl;
