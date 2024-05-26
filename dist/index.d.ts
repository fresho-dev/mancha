import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
export declare class Renderer extends IRenderer {
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment | Document): string;
    fetchLocal(fpath: string, params?: RenderParams & ParserParams): Promise<string>;
}
export declare const Mancha: Renderer;
