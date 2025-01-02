import { IRenderer } from "./renderer.js";

export interface ParserParams {
  /** Whether the file parsed is a root document, or a document fragment. */
  rootDocument?: boolean;
  /** Encoding to use when processing local files. */
  encoding?: "ascii" | "utf8";
}

/** The RendererParams interface defines the parameters that can be passed to the renderer. */
export interface RenderParams {
  /** The current directory of the file being rendered. */
  dirpath?: string;
  /** Maximum level of recursion allowed when resolving includes. */
  maxdepth?: number;
  /** Cache policy used when resolving remote paths. */
  cache?: RequestCache | null;
  /** Whether the current node is the root used in Mancha.moun(...). */
  rootNode?: Node;
}

export type RendererPlugin = (
  this: IRenderer,
  node: ChildNode,
  params?: RenderParams
) => Promise<void>;
