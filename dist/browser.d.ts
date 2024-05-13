import { IRenderer } from "./core";
import { ParserParams, RenderParams } from "./interfaces";
declare class RendererImpl extends IRenderer {
    protected readonly dirpath: string;
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment): string;
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
}
declare const Mancha: RendererImpl;
export default Mancha;
