import * as fs from "fs/promises";
import { folderPath, renderContent as webRenderContent } from "./web";

export async function renderLocalPath(
  fpath: string,
  vars: { [key: string]: string } = {},
  encoding: BufferEncoding = "utf8"
): Promise<string> {
  const content = await fs.readFile(fpath, { encoding: encoding });
  return renderContent(content, vars, folderPath(fpath));
}

export async function renderContent(
  content: string,
  vars: { [key: string]: string } = {},
  fsroot: string | null = null,
  maxdepth: number = 10
) {
  fsroot = fsroot || ".";
  return webRenderContent(content, vars, fsroot, maxdepth, renderLocalPath);
}

// Re-exports from web.
export {
  preprocess,
  folderPath,
  resolvePath,
  renderRemotePath,
  encodeHtmlAttrib,
  decodeHtmlAttrib,
} from "./web";
