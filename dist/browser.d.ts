import { IRenderer } from "./core";
declare class RendererImpl extends IRenderer {
    parseDocument(content: string): Document;
    serializeDocument(document: Document): string;
    replaceNodeWith(node: Node, children: Node[]): void;
}
declare const Mancha: RendererImpl;
export default Mancha;
