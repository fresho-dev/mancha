import { IRenderer, ParserParams, RendererParams } from "./core";
declare class RendererImpl extends IRenderer {
    protected readonly fsroot: string;
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment): string;
    renderLocalPath(fpath: string, params?: RendererParams & ParserParams): Promise<DocumentFragment>;
}
declare const Mancha: RendererImpl;
export default Mancha;
