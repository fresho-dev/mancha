import { ReactiveProxyStore } from "./reactive";
import { ParserParams, RenderParams } from "./interfaces";
export declare function traverse(root: Node | DocumentFragment | Document, skip?: Set<Node>): Generator<ChildNode>;
export declare function dirname(fpath: string): string;
export declare function isRelativePath(fpath: string): boolean;
export declare function safeEval(code: string, context: any, args?: {
    [key: string]: any;
}): Promise<any>;
export declare abstract class IRenderer extends ReactiveProxyStore {
    protected readonly dirpath: string;
    readonly skipNodes: Set<Node>;
    abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
    abstract serializeHTML(root: DocumentFragment | Node): string;
    fetchRemote(fpath: string, params?: RenderParams): Promise<string>;
    fetchLocal(fpath: string, params?: RenderParams): Promise<string>;
    preprocessString(content: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    preprocessRemote(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    clone(): IRenderer;
    log(params?: RenderParams, ...args: any[]): void;
    eval(expr: string, args?: {
        [key: string]: any;
    }, params?: RenderParams): Promise<any>;
    preprocessNode(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void>;
    renderNode(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void>;
    mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void>;
}
