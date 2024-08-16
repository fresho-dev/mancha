import { IRenderer } from "./core.js";
import { ParserParams } from "./interfaces.js";
export declare class Renderer extends IRenderer {
    parseHTML(content: string, params?: ParserParams): Document | DocumentFragment;
    serializeHTML(root: Node | DocumentFragment | Document): string;
    createElement(tag: string, owner?: Document | null): globalThis.Element;
    textContent(node: Node, content: string): void;
}
export declare const Mancha: Renderer;
