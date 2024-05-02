/// <reference types="node" />
export declare function traverse(fragment: DocumentFragment): ChildNode[];
/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
export declare function encodeHtmlAttrib(value: string): string;
/** Inverse the operation of [encodeHtmlAttrib] */
export declare function decodeHtmlAttrib(value: string): string;
export declare function preprocess(content: string, vars: {
    [key: string]: string;
}): string;
export declare function datasetAttributes(attributes: NamedNodeMap): {
    [key: string]: string;
};
export declare function folderPath(fpath: string): string;
export declare function resolvePath(fpath: string): string;
export declare abstract class IRenderer {
    abstract parseDocumentFragment(content: string): DocumentFragment;
    abstract serializeDocumentFragment(fragment: DocumentFragment): string;
    abstract replaceNodeWith(node: Node, children: Node[]): void;
    preprocess(content: string, vars: {
        [key: string]: string;
    }): string;
    renderLocalPath(fpath: string, vars?: {
        [key: string]: string;
    }, encoding?: BufferEncoding): Promise<DocumentFragment>;
    renderRemotePath(fpath: string, vars?: {
        [key: string]: string;
    }, maxdepth?: number): Promise<DocumentFragment>;
    renderString(content: string, vars?: {
        [key: string]: string;
    }, fsroot?: string | null, maxdepth?: number): Promise<DocumentFragment>;
    renderDocument(fragment: DocumentFragment, vars?: {
        [key: string]: string;
    }, fsroot?: string | null, maxdepth?: number): Promise<DocumentFragment>;
}
