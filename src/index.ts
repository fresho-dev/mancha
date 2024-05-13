import * as fs from "fs/promises";
import { RendererImpl as WorkerRendererImpl } from "./worker";
import { ParserParams, RenderParams } from "./interfaces";

/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
export class RendererImpl extends WorkerRendererImpl {
  async fetchLocal(fpath: string, params?: RenderParams & ParserParams): Promise<string> {
    return fs.readFile(fpath, { encoding: params?.encoding || "utf8" });
  }
}

// Export the renderer instance directly.
export const Mancha = new RendererImpl();
