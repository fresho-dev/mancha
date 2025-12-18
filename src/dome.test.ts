import {
	appendChild,
	attributeNameToCamelCase,
	cloneAttribute,
	getAttribute,
	getAttributeOrDataset,
	hasAttribute,
	hasAttributeOrDataset,
	insertBefore,
	replaceChildren,
	setAttributeOrDataset,
	traverse,
} from "./dome.js";
import { assert, setupGlobalTestEnvironment, isNode, createFragment } from "./test_utils.js";

type HtmlParser = (html: string) => DocumentFragment;

async function generateHtmlParsers() {
	const parsers: Record<string, HtmlParser> = {};
	if (isNode) {
		const jsdomName = "jsdom";
		const htmlparser2Name = "htmlparser2";

		const { JSDOM } = await import(jsdomName);
		const htmlparser2 = await import(htmlparser2Name);

		parsers.jsdom = (html: string) => JSDOM.fragment(html);
		parsers.htmlparser2 = (html: string) =>
			htmlparser2.parseDocument(html) as unknown as DocumentFragment;
	} else {
		// In browser, we only have native DOM via createFragment which behaves like JSDOM.fragment
		parsers.native = (html: string) => createFragment(html);
	}
	return parsers;
}

function testHtmlParsers(
	testName: string,
	htmlParsers: Record<string, HtmlParser>,
	testCode: (htmlParser: (html: string) => Document | DocumentFragment | Node) => Promise<void>,
) {
	for (const [parserName, parserMethod] of Object.entries(htmlParsers)) {
		describe(parserName, () => it(testName, () => testCode(parserMethod)));
	}
}

describe("Dome", async () => {
	const htmlParsers = await generateHtmlParsers();

	before(async () => {
		await setupGlobalTestEnvironment();
	});

	describe("traverse", () => {
		it("empty document", () => {
			const fragment = createFragment("");
			const nodes = Array.from(traverse(fragment)).slice(1);
			assert.equal(nodes.length, 0);
		});

		it("single element", () => {
			const fragment = createFragment("<div></div>");
			const nodes = Array.from(traverse(fragment)).slice(1);
			assert.equal(nodes.length, 1);
		});

		it("multiple elements", () => {
			const num = 10;
			const html = new Array(num).fill("<div></div>").join("");
			const fragment = createFragment(html);
			const nodes = Array.from(traverse(fragment)).slice(1);
			assert.equal(nodes.length, num);
		});

		it("nested elements", () => {
			const fragment = createFragment("<div><div></div></div>");
			const nodes = Array.from(traverse(fragment)).slice(1);
			assert.equal(nodes.length, 2);
		});

		it("single text node", () => {
			const fragment = createFragment("text");
			const nodes = Array.from(traverse(fragment)).slice(1);
			assert.equal(nodes.length, 1);
			assert.equal(nodes[0].nodeType, 3);
			assert.equal(nodes[0].nodeValue, "text");
			assert.equal(nodes[0].textContent, "text");
		});

		it("sibling text node", () => {
			const fragment = createFragment("<span></span>world");
			const nodes = Array.from(traverse(fragment)).slice(1);
			assert.equal(nodes.length, 2);
		});
	});

	describe("getAttribute", () => {
		testHtmlParsers("get case insensitive", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser('<div attr1="1" ATTR2="2" aTtR3="3"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(getAttribute(node, "attr1"), "1");
			assert.equal(getAttribute(node, "attr2"), "2");
			assert.equal(getAttribute(node, "attr3"), "3");
		});

		it("converts to camel case", () => {
			assert.equal(attributeNameToCamelCase("foo-bar"), "fooBar");
		});

		it('gets attribute ":foo-baz"', () => {
			const fragment = createFragment('<div :foo-baz="bar"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(getAttributeOrDataset(node, "foo-baz", ":"), "bar");
		});

		it('gets dataset attribute "foo"', () => {
			const fragment = createFragment('<div data-foo-baz="bar"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(getAttributeOrDataset(node, "foo-baz", ":"), "bar");
		});
	});

	describe("hasAttribute", () => {
		testHtmlParsers("check case insensitive", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser('<div attr1="1" ATTR2="2" aTtR3="3"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttribute(node, "attr1"), true);
			assert.equal(hasAttribute(node, "attr2"), true);
			assert.equal(hasAttribute(node, "attr3"), true);
			assert.equal(hasAttribute(node, "nonexistent"), false);
		});

		it('checks attribute ":foo-baz"', () => {
			const fragment = createFragment('<div :foo-baz="bar"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttribute(node, ":foo-baz"), true);
			assert.equal(hasAttribute(node, ":nonexistent"), false);
		});

		it('checks dataset attribute "data-foo"', () => {
			const fragment = createFragment('<div data-foo-baz="bar"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttribute(node, "data-foo-baz"), true);
			assert.equal(hasAttribute(node, "data-nonexistent"), false);
		});
	});

	describe("hasAttributeOrDataset", () => {
		it('checks attribute ":foo-baz"', () => {
			const fragment = createFragment('<div :foo-baz="bar"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttributeOrDataset(node, "foo-baz", ":"), true);
			assert.equal(hasAttributeOrDataset(node, "nonexistent", ":"), false);
		});

		it('checks dataset attribute "foo"', () => {
			const fragment = createFragment('<div data-foo-baz="bar"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttributeOrDataset(node, "foo-baz", ":"), true);
			assert.equal(hasAttributeOrDataset(node, "nonexistent", ":"), false);
		});

		it("prioritizes attribute over dataset", () => {
			const fragment = createFragment('<div :foo="attribute" data-foo="dataset"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttributeOrDataset(node, "foo", ":"), true);
			// Should find the attribute even if dataset also exists
			assert.equal(getAttributeOrDataset(node, "foo", ":"), "attribute");
		});

		it("falls back to dataset when attribute doesn't exist", () => {
			const fragment = createFragment('<div data-foo-bar="dataset"></div>');
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttributeOrDataset(node, "foo-bar", ":"), true);
			assert.equal(getAttributeOrDataset(node, "foo-bar", ":"), "dataset");
		});

		it("returns false when neither attribute nor dataset exist", () => {
			const fragment = createFragment("<div></div>");
			const node = fragment.childNodes[0] as Element;
			assert.equal(hasAttributeOrDataset(node, "nonexistent", ":"), false);
		});
	});

	describe("setAttributeOrDataset", () => {
		it("updates prefixed attribute when it exists", () => {
			const fragment = createFragment('<div :render="old.js"></div>');
			const node = fragment.childNodes[0] as Element;
			setAttributeOrDataset(node, "render", "new.js", ":");
			assert.equal(getAttribute(node, ":render"), "new.js");
			assert.equal(getAttribute(node, "data-render"), null);
		});

		it("updates data- attribute when it exists", () => {
			const fragment = createFragment('<div data-render="old.js"></div>');
			const node = fragment.childNodes[0] as Element;
			setAttributeOrDataset(node, "render", "new.js", ":");
			assert.equal(getAttribute(node, "data-render"), "new.js");
			assert.equal(getAttribute(node, ":render"), null);
		});

		it("prefers prefixed attribute when both exist", () => {
			const fragment = createFragment('<div :render="prefix.js" data-render="data.js"></div>');
			const node = fragment.childNodes[0] as Element;
			setAttributeOrDataset(node, "render", "updated.js", ":");
			assert.equal(getAttribute(node, ":render"), "updated.js");
			assert.equal(getAttribute(node, "data-render"), "data.js");
		});

		it("defaults to prefixed attribute when neither exists", () => {
			const fragment = createFragment("<div></div>");
			const node = fragment.childNodes[0] as Element;
			setAttributeOrDataset(node, "render", "new.js", ":");
			assert.equal(getAttribute(node, ":render"), "new.js");
			assert.equal(getAttribute(node, "data-render"), null);
		});

		testHtmlParsers("updates attribute for each parser", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser('<div :render="old.js"></div>');
			const node = fragment.childNodes[0] as Element;
			setAttributeOrDataset(node, "render", "new.js", ":");
			assert.equal(getAttributeOrDataset(node, "render", ":"), "new.js");
		});

		testHtmlParsers("updates data- attribute for each parser", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser('<div data-render="old.js"></div>');
			const node = fragment.childNodes[0] as Element;
			setAttributeOrDataset(node, "render", "new.js", ":");
			assert.equal(getAttributeOrDataset(node, "render", ":"), "new.js");
		});
	});

	describe("clone attribute", () => {
		it('clones ":foo" attribute', () => {
			const fragment = createFragment('<div :foo="bar"></div><div></div>');
			const node = fragment.childNodes[0] as Element;
			const clone = fragment.childNodes[1] as Element;
			cloneAttribute(node, clone, ":foo");
			assert.equal(getAttribute(clone, ":foo"), "bar");
		});

		it('clones "data-foo" attribute', () => {
			const fragment = createFragment('<div data-foo="bar"></div><div></div>');
			const node = fragment.childNodes[0] as Element;
			const clone = fragment.childNodes[1] as Element;
			cloneAttribute(node, clone, "data-foo");
			assert.equal(getAttribute(clone, "data-foo"), "bar");
		});

		it('fails to clone unsafe "foo" attribute', () => {
			const fragment = createFragment('<div foo="bar"></div><div></div>');
			const node = fragment.childNodes[0] as Element;
			const clone = fragment.childNodes[1] as Element;
			assert.throws(() => cloneAttribute(node, clone, "foo"));
		});
	});

	describe("get and set node value", () => {
		testHtmlParsers("get and set node value", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser("Hello World");
			const node = fragment.childNodes[0] as Text;
			assert.equal(node.nodeValue, "Hello World");

			const text = "Hello Universe";
			node.nodeValue = text;
			// setNodeValue(node, text);
			assert.equal(node.nodeValue, text);
		});
	});

	describe("create element", () => {
		testHtmlParsers("create element", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser("<div></div>");
			const node = fragment.childNodes[0] as Element;
			const elem = htmlParser("<span></span>").childNodes[0] as Element;
			appendChild(node, elem);
			assert.equal(elem.parentNode, node);
			assert.equal(node.firstChild, elem);
			assert.equal(node.lastChild, elem);
			assert.equal(node.children.length, 1);
		});
	});

	describe("insert before", () => {
		testHtmlParsers("insert before first element", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser("<div><span></span><span></span></div>");
			const node = fragment.childNodes[0] as Element;
			const elem = htmlParser("<span></span>").childNodes[0] as Element;
			const reference = node.children[0];
			insertBefore(node, elem, reference);
			assert.equal(node.children[0], elem);
			assert.equal(node.children[1], reference);
			assert.equal(node.children.length, 3);
		});
	});

	describe("replace children", () => {
		testHtmlParsers("replace children", htmlParsers, async (htmlParser) => {
			const fragment = htmlParser("<div><span></span><span></span></div>");
			const node = fragment.childNodes[0] as Element;
			const elem1 = htmlParser("<span></span>").childNodes[0] as Element;
			const elem2 = htmlParser("<span></span>").childNodes[0] as Element;
			const elem3 = htmlParser("<span></span>").childNodes[0] as Element;
			replaceChildren(node, elem1, elem2, elem3);
			assert.equal(node.children[0], elem1);
			assert.equal(node.children[1], elem2);
			assert.equal(node.children[2], elem3);
			assert.equal(node.children.length, 3);
		});
	});
});
