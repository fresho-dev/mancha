import { IRenderer } from "./core.js";
import { ParserParams, RenderParams } from "./interfaces.js";
export declare class Renderer extends IRenderer {
    protected readonly dirpath: string;
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment): string;
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    createElement(tag: string, owner?: Document | null): Element;
    textContent(node: Node, content: string): void;
}
export declare const Mancha: Renderer;
