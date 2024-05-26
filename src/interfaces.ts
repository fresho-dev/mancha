import { IRenderer } from "./core.js";

export interface ParserParams {
  /** Whether the file parsed is a root document, or a document fragment. */
  root?: boolean;
  /** Encoding to use when processing local files. */
  encoding?: BufferEncoding;
}

/** The RendererParams interface defines the parameters that can be passed to the renderer. */
export interface RenderParams {
  /** The current directory of the file being rendered. */
  dirpath?: string;
  /** Maximum level of recursion allowed when resolving includes. */
  maxdepth?: number;
  /** Cache policy used when resolving remote paths. */
  cache?: RequestCache | null;
}

export type RendererPlugin = (
  this: IRenderer,
  node: ChildNode,
  params?: RenderParams
) => Promise<void>;
