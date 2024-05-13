import { IRenderer } from "./core";
import { ParserParams } from "./interfaces";
export declare class RendererImpl extends IRenderer {
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment | Document): string;
}
export declare const Mancha: RendererImpl;
