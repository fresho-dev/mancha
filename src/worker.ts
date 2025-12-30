import { render as renderDOM } from "dom-serializer";
import { Comment, Element, Text } from "domhandler";
import * as htmlparser2 from "htmlparser2";
import { ParserParams } from "./interfaces.js";
import { IRenderer } from "./renderer.js";

export type { ParserParams, RendererPlugin, RenderParams } from "./interfaces.js";
export { IRenderer } from "./renderer.js";

export class Renderer extends IRenderer {
	readonly impl = "htmlparser2";
	parseHTML(
		content: string,
		_params: ParserParams = { rootDocument: false },
	): Document | DocumentFragment {
		return htmlparser2.parseDocument(content) as unknown as Document;
	}
	serializeHTML(root: Node | DocumentFragment | Document): string {
		return renderDOM(root as any);
	}
	createElement(tag: string, _owner?: Document | null): globalThis.Element {
		return new Element(tag, {}) as unknown as globalThis.Element;
	}
	createComment(content: string, _owner?: Document | null): Node {
		return new Comment(content) as unknown as Node;
	}
	textContent(node: Node, content: string): void {
		(node as any).children = [new Text(content)];
	}
}

// Export the renderer instance directly.
export const Mancha = new Renderer();
