import { ParserParams, RenderParams } from "./interfaces.js";
import { IRenderer } from "./core.js";
export declare class Renderer extends IRenderer {
    parseHTML(content: string, params?: ParserParams): Document | DocumentFragment;
    serializeHTML(root: Node | DocumentFragment | Document): string;
    createElement(tag: string, owner?: Document | null): Element;
    textContent(node: Node, content: string): void;
    fetchLocal(fpath: string, params?: RenderParams & ParserParams): Promise<string>;
}
export declare const Mancha: Renderer;
