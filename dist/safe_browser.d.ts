import { Renderer as BrowserRenderer } from "./browser.js";
import { ParserParams } from "./interfaces.js";
export declare class Renderer extends BrowserRenderer {
    protected readonly dirpath: string;
    parseHTML(content: string, params?: ParserParams): Document | DocumentFragment;
}
export declare const Mancha: Renderer;
