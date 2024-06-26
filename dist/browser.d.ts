import { IRenderer } from "./core.js";
import { ParserParams, RenderParams } from "./interfaces.js";
declare class Renderer extends IRenderer {
    protected readonly dirpath: string;
    parseHTML(content: string, params?: ParserParams): DocumentFragment;
    serializeHTML(root: Node | DocumentFragment): string;
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
}
declare const Mancha: Renderer;
export default Mancha;
