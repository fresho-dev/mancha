/// <reference types="node" />
import { ReactiveProxy, ReactiveProxyStore } from "./reactive";
export declare function traverse(root: Node | DocumentFragment | Document, skip?: Set<Node>): Generator<ChildNode>;
export declare function folderPath(fpath: string): string;
export declare function resolvePath(fpath: string): string;
export declare function extractTextNodeKeys(content: string): [string, string, string[]][];
export declare function safeEval(code: string, context: any, args?: {
    [key: string]: any;
}): Promise<any>;
export interface ParserParams {
    isRoot?: boolean;
    encoding?: BufferEncoding;
}
export interface RendererParams {
    fsroot?: string;
    maxdepth?: number;
    cache?: RequestCache | null;
    debug?: boolean;
}
export declare abstract class IRenderer extends ReactiveProxyStore {
    protected readonly fsroot: string;
    protected readonly skipNodes: Set<Node>;
    abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
    abstract serializeHTML(root: DocumentFragment | Node): string;
    abstract renderLocalPath(fpath: string, params?: RendererParams & ParserParams): Promise<DocumentFragment>;
    clone(): IRenderer;
    log(params?: RendererParams, ...args: any[]): void;
    eval(expr: string, args?: {
        [key: string]: any;
    }, params?: RendererParams): Promise<any>;
    resolveIncludes(root: Document | DocumentFragment | Node, params?: RendererParams): Promise<IRenderer>;
    resolveTextNode(node: ChildNode, params?: RendererParams): ReactiveProxy<any>[];
    resolveDataAttribute(node: ChildNode, params?: RendererParams): Promise<void>;
    resolveWatchAttribute(node: ChildNode, params?: RendererParams): Promise<void>;
    resolvePropAttributes(node: ChildNode, params?: RendererParams): Promise<void>;
    resolveAttrAttributes(node: ChildNode, params?: RendererParams): Promise<void>;
    resolveEventAttributes(node: ChildNode, params?: RendererParams): Promise<void>;
    resolveForAttribute(node: ChildNode, params?: RendererParams): Promise<void>;
    resolveBindAttribute(node: ChildNode, params?: RendererParams): Promise<void>;
    resolveShowAttribute(node: ChildNode, params?: RendererParams): Promise<void>;
    mount(root: Document | DocumentFragment | Node, params?: RendererParams): Promise<IRenderer>;
    renderString(content: string, params?: RendererParams & ParserParams): Promise<DocumentFragment>;
    renderRemotePath(fpath: string, params?: RendererParams & ParserParams): Promise<DocumentFragment>;
}
