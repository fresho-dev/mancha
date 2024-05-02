import { IRenderer, ParserParams, RendererParams } from "./core";
export declare class RendererImpl extends IRenderer {
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment): string;
    renderLocalPath(fpath: string, params?: RendererParams & ParserParams): Promise<DocumentFragment>;
}
export { folderPath, resolvePath } from "./core";
export declare const Mancha: RendererImpl;
