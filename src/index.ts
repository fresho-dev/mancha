// import * as fs from "fs";
import * as parse5 from "parse5";
import * as path from "path";
import {
  ChildNode,
  Document,
  DocumentFragment,
  Element,
  Node,
  ParentNode,
} from "parse5/dist/tree-adapters/default";
import axios from "axios";

export module Mancha {
  function replaceNodeWith(original: Node, replacement: Node[]) {
    const elem = <Element>original;
    const parent = <ParentNode>elem.parentNode;
    const index = parent.childNodes.indexOf(elem);
    replacement.forEach((elem) => ((<Element>elem).parentNode = parent));
    parent.childNodes = (<ChildNode[]>[])
      .concat(parent.childNodes.slice(0, index))
      .concat(replacement as ChildNode[])
      .concat(parent.childNodes.slice(index + 1));
  }

  function isDocument(content: string) {
    return /^[\n\r\s]*<(!doctype|html|head|body)\b/i.test(content);
  }

  function isBrowser() {
    return typeof window !== "undefined";
  }

  function parseDocument(content: string): Document | DocumentFragment {
    return isDocument(content)
      ? (parse5.parse(content) as Document)
      : (parse5.parseFragment(content) as DocumentFragment);
  }

  function traverse(tree: Element | Element[]): Node[] {
    const explored: Node[] = [];
    const frontier: Node[] = Array.isArray(tree) ? tree : [tree];

    while (frontier.length) {
      const node: Element = <Element>frontier.pop();
      explored.push(node);
      if (node.childNodes) {
        node.childNodes.forEach((node) => frontier.push(node));
      }
    }

    return explored;
  }

  async function readFromPath(fpath: string) {
    fpath = fpath.startsWith("://") ? "https" + fpath : fpath;
    if (isBrowser() || fpath.startsWith("http://") || fpath.startsWith("https://")) {
      return await axios.get(fpath, { responseType: "text" }).then((res) => res.data);
    } else {
      // Runtime import
      const fs = require("fs/promises");
    }
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
    // Replace all {{variables}}
    Object.keys(vars).forEach((key) => {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), vars[key]);
    });
    return content;
  }

  export async function renderContent(
    content: string,
    vars: { [key: string]: string } = {},
    fsroot: string = "."
  ): Promise<string> {
    const preprocessed = preprocess(content, vars);
    const document = parseDocument(preprocessed);
    const renderings = traverse(document.childNodes.map((node) => node as Element))
      .filter((node) => node.nodeName === "include")
      .map(async (node) => {
        const attribs = (node as Element).attrs.reduce((dict: any, attr) => {
          dict[attr.name] = attr.value;
          return dict;
        }, {}) as { [key: string]: string };

        // If the node has a vars attribute, it overrides our current vars
        // NOTE: this will propagate to all subsequent render calls, including nested calls.
        if (attribs.hasOwnProperty("data-vars")) {
          vars = Object.assign({}, vars, JSON.parse(decodeHtmlAttrib(attribs["data-vars"])));
        }

        // Early exit: <include> tags must have a src attribute.
        if (!attribs["src"]) {
          throw new Error(`"src" attribute missing from ${JSON.stringify(node)}`);
        }

        // The new root will be the included file's directory.
        // const newroot = path.dirname(attribs["src"]);

        // The included file will replace this tag.
        const handler = (content: string) => {
          const docfragment = parse5.parseFragment(content);
          replaceNodeWith(node, docfragment.childNodes);
        };

        // Case 1: Absolute remote path.
        if (attribs["src"].indexOf("://") !== -1) {
          // await renderRemotePath(attribs["src"], vars, newroot).then(handler);
          // Case 2: Relative remote path.
        } else if (fsroot.indexOf("://") !== -1) {
          const relpath = path.join(fsroot, attribs["src"]);
          // await renderRemotePath(relpath, vars, newroot).then(handler);

          // Case 3: Local absolute path.
        } else if (attribs["src"].charAt(0) === "/") {
          await renderLocalPath(attribs["src"], vars).then(handler);

          // Case 4: Local relative path.
        } else {
          // const fname = path.basename(attribs["src"]);
          const relpath = path.join(fsroot, attribs["src"]);
          await renderLocalPath(relpath, vars).then(handler);
        }
      });

    // Wait for all the rendering operations to complete.
    await Promise.all(renderings);

    // The document has now been modified and can be re-serialized.
    const result = parse5.serialize(document);

    // Re-render until no changes are made.
    if (renderings.length === 0) {
      return result;
    } else {
      return renderContent(result, vars, fsroot);
    }
  }

  export async function renderLocalPath(
    fpath: string,
    vars: { [key: string]: string } = {},
    encoding: BufferEncoding = "utf8"
  ): Promise<string> {
    const fs = require("fs/promises");
    const content = await fs.readFile(fpath, { encoding: encoding });
    return renderContent(content, vars, path.dirname(fpath));
  }
}
