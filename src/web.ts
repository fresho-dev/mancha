import * as parse5 from "parse5";
import * as path from "path-browserify";
import * as tree from "parse5/dist/tree-adapters/default";

function replaceNodeWith(original: tree.Node, replacement: tree.Node[]) {
  const elem = original as tree.Element;
  const parent = elem.parentNode as tree.ParentNode;
  const index = parent.childNodes.indexOf(elem);
  replacement.forEach((elem) => ((elem as tree.Element).parentNode = parent));
  parent.childNodes = ([] as tree.ChildNode[])
    .concat(parent.childNodes.slice(0, index))
    .concat(replacement as tree.ChildNode[])
    .concat(parent.childNodes.slice(index + 1));
}

function isDocument(content: string) {
  return /^[\n\r\s]*<(!doctype|html|head|body)\b/i.test(content);
}

function parseDocument(content: string): tree.Document | tree.DocumentFragment {
  return isDocument(content)
    ? (parse5.parse(content) as tree.Document)
    : (parse5.parseFragment(content) as tree.DocumentFragment);
}

function traverse(tree: tree.Element | tree.Element[]): tree.Node[] {
  const explored: tree.Node[] = [];
  const frontier: tree.Node[] = Array.isArray(tree) ? tree : [tree];

  while (frontier.length) {
    const node: tree.Element = frontier.pop() as tree.Element;
    explored.push(node);
    if (node.childNodes) {
      node.childNodes.forEach((node) => frontier.push(node));
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
  fsroot = fsroot || self.location.href.split("/").slice(0, -1).join("/") + "/";
  const preprocessed = preprocess(content, vars);
  const document = parseDocument(preprocessed);
  const renderings = traverse(document.childNodes.map((node) => node as tree.Element))
    .filter((node) => node.nodeName === "include")
    .map(async (node) => {
      const attribs = (node as tree.Element).attrs.reduce((dict: any, attr) => {
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
        const docfragment = parse5.parseFragment(content);
        replaceNodeWith(node, docfragment.childNodes);
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
  const result = parse5.serialize(document);

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
  return renderContent(content, vars, path.dirname(fpath));
}
