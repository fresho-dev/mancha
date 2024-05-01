import * as fs from "fs/promises";
import { folderPath } from "./core";
import { RendererImpl as WorkerRendererImpl } from "./worker";

/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
class RendererImpl extends WorkerRendererImpl {
  async renderLocalPath(
    fpath: string,
    vars: { [key: string]: string } = {},
    encoding: BufferEncoding = "utf8"
  ): Promise<string> {
    const content = await fs.readFile(fpath, { encoding: encoding });
    return this.renderContent(content, vars, folderPath(fpath));
  }
}

// Re-exports from core.
export { preprocess, folderPath, resolvePath, encodeHtmlAttrib, decodeHtmlAttrib } from "./core";

// Export the renderer instance directly.
export const Mancha = new RendererImpl();
