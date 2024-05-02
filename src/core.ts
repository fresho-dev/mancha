import * as path from "path-browserify";

export function traverse(fragment: DocumentFragment): ChildNode[] {
  const explored: ChildNode[] = [];
  const frontier: ChildNode[] = Array.from(fragment.childNodes);

  while (frontier.length) {
    const node: ChildNode = frontier.pop() as ChildNode;
    explored.push(node);
    if (node.childNodes) {
      node.childNodes.forEach((node) => frontier.push(node));
    }
  }

  return explored;
}

function getElementAttribute(elem: Element, key: string): string | null {
  for (const attr of elem.attributes) {
    if (attr.name === key) return attr.value;
  }
  return null;
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
    content = content.replace(new RegExp(`{{\\s?${key}\\s?}}`, "g"), vars[key]);
  });
  return content;
}

export function datasetAttributes(attributes: NamedNodeMap): { [key: string]: string } {
  return Array.from(attributes)
    .filter((attr) => attr.name.startsWith("data-"))
    .reduce((dict: any, attr: any) => {
      dict[attr.name.substring("data-".length)] = attr.value;
      return dict;
    }, {});
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

export abstract class IRenderer {
  abstract parseDocumentFragment(content: string): DocumentFragment;
  abstract serializeDocumentFragment(fragment: DocumentFragment): string;
  abstract replaceNodeWith(node: Node, children: Node[]): void;

  preprocess(content: string, vars: { [key: string]: string }): string {
    // Replace all {{ variables }}.
    Object.keys(vars).forEach((key) => {
      content = content.replace(new RegExp(`{{\\s?${key}\\s?}}`, "g"), vars[key]);
    });
    return content;
  }

  renderLocalPath(
    fpath: string,
    vars: { [key: string]: string } = {},
    encoding: BufferEncoding = "utf8"
  ): Promise<DocumentFragment> {
    throw new Error("Not implemented.");
  }

  async renderRemotePath(
    fpath: string,
    vars: { [key: string]: string } = {},
    maxdepth: number = 10
  ): Promise<DocumentFragment> {
    const content = await fetch(fpath).then((res) => res.text());
    return this.renderString(content, vars, folderPath(fpath), maxdepth);
  }

  async renderString(
    content: string,
    vars: { [key: string]: string } = {},
    fsroot: string | null = null,
    maxdepth: number = 10
  ): Promise<DocumentFragment> {
    const preprocessed = preprocess(content, vars);
    const fragment = this.parseDocumentFragment(preprocessed);
    return this.renderDocument(fragment, vars, fsroot, maxdepth);
  }

  async renderDocument(
    fragment: DocumentFragment,
    vars: { [key: string]: string } = {},
    fsroot: string | null = null,
    maxdepth: number = 10
  ): Promise<DocumentFragment> {
    fsroot = fsroot || folderPath(self.location.href);
    const renderings = traverse(fragment)
      .map((node) => node as Element)
      .filter((node) => node.tagName?.toLocaleLowerCase() === "include")
      .map(async (node) => {
        const src = getElementAttribute(node, "src");
        const dataset = datasetAttributes(node.attributes as any as NamedNodeMap);

        // Add all the data-* attributes as properties to current vars.
        // NOTE: this will propagate to all subsequent render calls, including nested calls.
        Object.keys(dataset).forEach((key) => (vars[key] = decodeHtmlAttrib(dataset[key])));

        // Early exit: <include> tags must have a src attribute.
        if (!src) {
          throw new Error(`"src" attribute missing from ${node}.`);
        }

        // The included file will replace this tag.
        const handler = (fragment: DocumentFragment) => {
          this.replaceNodeWith(node, Array.from(fragment.childNodes));
        };

        // Case 1: Absolute remote path.
        if (src.indexOf("://") !== -1) {
          await this.renderRemotePath(src, vars, maxdepth - 1).then(handler);

          // Case 2: Relative remote path.
        } else if (fsroot?.indexOf("://") !== -1) {
          const relpath = `${fsroot}/${src}`;
          await this.renderRemotePath(relpath, vars, maxdepth - 1).then(handler);

          // Case 3: Local absolute path.
        } else if (src.charAt(0) === "/") {
          await this.renderLocalPath(src, vars).then(handler);

          // Case 4: Local relative path.
        } else {
          const relpath = path.join(fsroot, src);
          await this.renderLocalPath(relpath, vars).then(handler);
        }
      });

    // Wait for all the rendering operations to complete.
    await Promise.all(renderings);

    // Re-render until no changes are made.
    if (renderings.length === 0) {
      return fragment;
    } else if (maxdepth === 0) {
      throw new Error("Maximum recursion depth reached.");
    } else {
      return this.renderDocument(fragment, vars, fsroot, maxdepth--);
    }
  }
}
