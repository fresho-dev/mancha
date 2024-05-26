import { IRenderer } from "./core.js";
import { ParserParams } from "./interfaces.js";
export declare class RendererImpl extends IRenderer {
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment | Document): string;
}
export declare const Mancha: RendererImpl;
