import * as fs from "fs/promises";
import { ParserParams, RendererParams, folderPath } from "./core";
import { RendererImpl as WorkerRendererImpl } from "./worker";

/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
export class RendererImpl extends WorkerRendererImpl {
  async renderLocalPath(
    fpath: string,
    params: RendererParams & ParserParams = { encoding: "utf8" }
  ): Promise<DocumentFragment> {
    const content = await fs.readFile(fpath, { encoding: params.encoding });
    return this.renderString(content.toString(), {
      fsroot: folderPath(fpath),
      // Determine whether a root node is needed based on filename.
      isRoot: params.isRoot || !fpath.endsWith(".tpl.html"),
    });
  }
}

// Re-exports from core.
export { folderPath, resolvePath } from "./core";

// Export the renderer instance directly.
export const Mancha = new RendererImpl();
