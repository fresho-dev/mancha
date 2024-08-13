import { ParserParams, RenderParams } from "./interfaces.js";
import { SignalStore } from "./store.js";
export type EvalListener = (result: any, dependencies: string[]) => any;
/**
 * Represents an abstract class for rendering and manipulating HTML content.
 * Extends the `ReactiveProxyStore` class.
 */
export declare abstract class IRenderer extends SignalStore {
    protected debugging: boolean;
    protected readonly dirpath: string;
    readonly _skipNodes: Set<Node>;
    readonly _customElements: Map<string, Node>;
    abstract parseHTML(content: string, params?: ParserParams): DocumentFragment;
    abstract serializeHTML(root: DocumentFragment | Node): string;
    /**
     * Sets the debugging flag for the current instance.
     *
     * @param flag - The flag indicating whether debugging is enabled or disabled.
     * @returns The current instance of the class.
     */
    debug(flag: boolean): this;
    /**
     * Fetches the remote file at the specified path and returns its content as a string.
     * @param fpath - The path of the remote file to fetch.
     * @param params - Optional parameters for the fetch operation.
     * @returns A promise that resolves to the content of the remote file as a string.
     */
    fetchRemote(fpath: string, params?: RenderParams): Promise<string>;
    /**
     * Fetches a local path and returns its content as a string.
     *
     * @param fpath - The file path of the resource.
     * @param params - Optional render parameters.
     * @returns A promise that resolves to the fetched resource as a string.
     */
    fetchLocal(fpath: string, params?: RenderParams): Promise<string>;
    /**
     * Preprocesses a string content with optional rendering and parsing parameters.
     *
     * @param content - The string content to preprocess.
     * @param params - Optional rendering and parsing parameters.
     * @returns A promise that resolves to a DocumentFragment representing the preprocessed content.
     */
    preprocessString(content: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    /**
     * Preprocesses a remote file by fetching its content and applying preprocessing steps.
     * @param fpath - The path to the remote file.
     * @param params - Optional parameters for rendering and parsing.
     * @returns A Promise that resolves to a DocumentFragment representing the preprocessed content.
     */
    preprocessRemote(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    /**
     * Preprocesses a local file by fetching its content and applying preprocessing steps.
     * @param fpath - The path to the local file.
     * @param params - Optional parameters for rendering and parsing.
     * @returns A promise that resolves to the preprocessed document fragment.
     */
    preprocessLocal(fpath: string, params?: RenderParams & ParserParams): Promise<DocumentFragment>;
    /**
     * Creates a deep copy of the current renderer instance.
     * @returns A new instance of the renderer with the same state as the original.
     */
    clone(): IRenderer;
    /**
     * Logs the provided arguments if debugging is enabled.
     * @param args - The arguments to be logged.
     */
    log(...args: any[]): void;
    /**
     * Preprocesses a node by applying all the registered preprocessing plugins.
     *
     * @template T - The type of the input node.
     * @param {T} root - The root node to preprocess.
     * @param {RenderParams} [params] - Optional parameters for preprocessing.
     * @returns {Promise<T>} - A promise that resolves to the preprocessed node.
     */
    preprocessNode<T extends Document | DocumentFragment | Node>(root: T, params?: RenderParams): Promise<T>;
    /**
     * Renders the node by applies all the registered rendering plugins.
     *
     * @template T - The type of the root node (Document, DocumentFragment, or Node).
     * @param {T} root - The root node to render.
     * @param {RenderParams} [params] - Optional parameters for rendering.
     * @returns {Promise<T>} - A promise that resolves to the fully rendered root node.
     */
    renderNode<T extends Document | DocumentFragment | Node>(root: T, params?: RenderParams): Promise<T>;
    /**
     * Mounts the Mancha application to a root element in the DOM.
     *
     * @param root - The root element to mount the application to.
     * @param params - Optional parameters for rendering the application.
     * @returns A promise that resolves when the mounting process is complete.
     */
    mount(root: Document | DocumentFragment | Node, params?: RenderParams): Promise<void>;
}
