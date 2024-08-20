import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";
export declare class Renderer extends IRenderer {
    protected readonly dirpath: string;
    parseHTML(content: string, params?: ParserParams): Document | DocumentFragment;
    serializeHTML(root: Node | DocumentFragment): string;
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<Document | DocumentFragment>;
    createElement(tag: string, owner?: Document | null): Element;
    textContent(node: Node, content: string): void;
}
export declare const Mancha: Renderer;
