import { ReactiveProxyStore } from "./reactive.js";
import { ParserParams, RenderParams } from "./interfaces.js";
export type EvalListener = (result: any, dependencies: string[]) => any;
export declare function traverse(root: Node | DocumentFragment | Document, skip?: Set<Node>): Generator<ChildNode>;
export declare function dirname(fpath: string): string;
export declare function isRelativePath(fpath: string): boolean;
export declare function makeEvalFunction(code: string, args?: string[]): Function;
export declare abstract class IRenderer extends ReactiveProxyStore {
    protected debugging: boolean;
    protected readonly dirpath: string;
    protected readonly evalkeys: string[];
    protected readonly expressionCache: Map<string, Function>;
    protected readonly evalCallbacks: Map<string, EvalListener[]>;
    readonly _skipNodes: Set<Node>;
    readonly _customElements: Map<string, Node>;
    abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
    abstract serializeHTML(root: DocumentFragment | Node): string;
    debug(flag: boolean): this;
    fetchRemote(fpath: string, params?: RenderParams): Promise<string>;
    fetchLocal(fpath: string, params?: RenderParams): Promise<string>;
    preprocessString(content: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    preprocessRemote(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    clone(): IRenderer;
    log(...args: any[]): void;
    private cachedExpressionFunction;
    eval(expr: string, args?: {
        [key: string]: any;
    }): Promise<[any, string[]]>;
    watchExpr(expr: string, args: {
        [key: string]: any;
    }, callback: EvalListener): Promise<void>;
    preprocessNode(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void>;
    renderNode(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<Document | DocumentFragment | Node>;
    mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void>;
}
