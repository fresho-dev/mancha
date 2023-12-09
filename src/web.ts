import { render as renderDOM } from "dom-serializer";
import * as htmlparser2 from "htmlparser2";
import { ChildNode, Document, Element, Node, ParentNode } from "domhandler";
import * as path from "path-browserify";

function replaceNodeWith(original: Node, replacement: Node[]) {
  const elem = original as Element;
  const parent = elem.parentNode as ParentNode;
  const index = parent.childNodes.indexOf(elem);
  replacement.forEach((elem) => ((elem as Element).parentNode = parent));
  parent.childNodes = ([] as ChildNode[])
    .concat(parent.childNodes.slice(0, index))
    .concat(replacement as ChildNode[])
    .concat(parent.childNodes.slice(index + 1));
}

function parseDocument(content: string): Document {
  return htmlparser2.parseDocument(content);
}

function traverse(tree: Element | Element[]): Element[] {
  const explored: Element[] = [];
  const frontier: Element[] = Array.isArray(tree) ? tree : [tree];

  while (frontier.length) {
    const node: Element = frontier.pop() as Element;
    explored.push(node);
    if (node.childNodes) {
      node.childNodes.forEach((node) => frontier.push(node as Node as Element));
    }
  }

  return explored;
}

/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
export function encodeHtmlAttrib(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n/g, "&#13;")
    .replace(/[\r\n]/g, "&#13;");
}

/** Inverse the operation of [encodeHtmlAttrib] */
export function decodeHtmlAttrib(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#13;/g, "\n");
}

export function preprocess(content: string, vars: { [key: string]: string }): string {
  // Replace all {{variables}}.
  Object.keys(vars).forEach((key) => {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), vars[key]);
  });
  return content;
}

export async function renderContent(
  content: string,
  vars: { [key: string]: string } = {},
  fsroot: string | null = null,
  maxdepth: number = 10,
  _renderLocalPathFunc = renderLocalPath
): Promise<string> {
  fsroot = fsroot || folderPath(self.location.href);
  const preprocessed = preprocess(content, vars);
  const document = parseDocument(preprocessed);
  const childNodes = Array.from(document.childNodes);
  const renderings = traverse(childNodes.map((node) => node as Node as Element))
    .filter((node) => node.name === "include")
    .map(async (node) => {
      const attribs = Array.from(node.attributes).reduce((dict: any, attr: any) => {
        dict[attr.name] = attr.value;
        return dict;
      }, {}) as { [key: string]: string };

      // If the node has a vars attribute, it overrides our current vars.
      // NOTE: this will propagate to all subsequent render calls, including nested calls.
      if (attribs.hasOwnProperty("data-vars")) {
        vars = Object.assign({}, vars, JSON.parse(decodeHtmlAttrib(attribs["data-vars"])));
      }

      // Early exit: <include> tags must have a src attribute.
      if (!attribs["src"]) {
        throw new Error(`"src" attribute missing from ${JSON.stringify(node)}`);
      }

      // The included file will replace this tag.
      const handler = (content: string) => {
        replaceNodeWith(node, parseDocument(content).childNodes);
      };

      // Case 1: Absolute remote path.
      if (attribs["src"].indexOf("://") !== -1) {
        await renderRemotePath(attribs["src"], vars).then(handler);

        // Case 2: Relative remote path.
      } else if (fsroot?.indexOf("://") !== -1) {
        const relpath = `${fsroot}/${attribs["src"]}`;
        await renderRemotePath(relpath, vars).then(handler);

        // Case 3: Local absolute path.
      } else if (attribs["src"].charAt(0) === "/") {
        await _renderLocalPathFunc(attribs["src"], vars).then(handler);

        // Case 4: Local relative path.
      } else {
        const relpath = path.join(fsroot, attribs["src"]);
        await _renderLocalPathFunc(relpath, vars).then(handler);
      }
    });

  // Wait for all the rendering operations to complete.
  await Promise.all(renderings);

  // The document has now been modified and can be re-serialized.
  const result = renderDOM(document as any);

  // Re-render until no changes are made.
  if (renderings.length === 0) {
    return result;
  } else if (maxdepth === 0) {
    throw new Error("Maximum recursion depth reached.");
  } else {
    return renderContent(result, vars, fsroot, maxdepth--);
  }
}

export async function renderLocalPath(
  fpath: string,
  vars: { [key: string]: string } = {},
  encoding: BufferEncoding = "utf8"
): Promise<string> {
  throw new Error("renderLocalPath() not supported on web.");
}

export async function renderRemotePath(fpath: string, vars: { [key: string]: string } = {}) {
  const content = await fetch(fpath).then((res) => res.text());
  return renderContent(content, vars, folderPath(fpath));
}

export function folderPath(fpath: string): string {
  if (fpath.endsWith("/")) {
    return fpath.slice(0, -1);
  } else {
    return path.dirname(fpath);
  }
}

export function resolvePath(fpath: string): string {
  if (fpath.includes("://")) {
    const [scheme, remotePath] = fpath.split("://", 2);
    return `${scheme}://${resolvePath("/" + remotePath).substring(1)}`;
  } else {
    return path.resolve(fpath);
  }
}
