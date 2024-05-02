import { IRenderer } from "./core";
declare class RendererImpl extends IRenderer {
    parseDocumentFragment(content: string): DocumentFragment;
    serializeDocumentFragment(fragment: DocumentFragment): string;
    replaceNodeWith(node: Node, children: Node[]): void;
}
declare const Mancha: RendererImpl;
export default Mancha;
