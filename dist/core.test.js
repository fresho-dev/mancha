"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const jsdom_1 = require("jsdom");
const core_1 = require("./core");
class MockRenderer extends core_1.IRenderer {
    parseHTML(content, params) {
        throw new Error("Not implemented.");
    }
    serializeHTML(fragment) {
        throw new Error("Not implemented.");
    }
    renderLocalPath(fpath, params) {
        throw new Error("Not implemented.");
    }
}
describe("Mancha core module", () => {
    describe("traverse", () => {
        it("empty document", () => {
            const fragment = jsdom_1.JSDOM.fragment("");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 0);
        });
        it("single element", () => {
            const fragment = jsdom_1.JSDOM.fragment("<div></div>");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 1);
        });
        it("multiple elements", () => {
            const num = 10;
            const html = new Array(num).fill("<div></div>").join("");
            const fragment = jsdom_1.JSDOM.fragment(html);
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, num);
        });
        it("nested elements", () => {
            const fragment = jsdom_1.JSDOM.fragment("<div><div></div></div>");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 2);
        });
        it("single text node", () => {
            const fragment = jsdom_1.JSDOM.fragment("text");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 1);
            assert.equal(nodes[0].nodeType, 3);
            assert.equal(nodes[0].nodeValue, "text");
            assert.equal(nodes[0].textContent, "text");
        });
        it("sibling text node", () => {
            const fragment = jsdom_1.JSDOM.fragment("<span></span>world");
            const nodes = Array.from((0, core_1.traverse)(fragment)).slice(1);
            assert.equal(nodes.length, 2);
        });
    });
    describe("extractNodeTextVariables", () => {
        it("single variable", () => {
            const content = "Hello {{ name }}";
            const variables = (0, core_1.extractTextNodeKeys)(content);
            assert.equal(variables.length, 1);
            assert.equal(variables[0][0], "{{ name }}");
            assert.equal(variables[0][1], "name");
            assert.equal(variables[0][2].length, 0);
        });
        it("multiple variables", () => {
            const content = "Hello {{ name }}, today is {{ weather }}";
            const variables = (0, core_1.extractTextNodeKeys)(content);
            assert.equal(variables.length, 2);
            assert.equal(variables[0][0], "{{ name }}");
            assert.equal(variables[0][1], "name");
            assert.equal(variables[0][2].length, 0);
            assert.equal(variables[1][0], "{{ weather }}");
            assert.equal(variables[1][1], "weather");
            assert.equal(variables[1][2].length, 0);
        });
        it("variable with single property", () => {
            const content = "Hello {{ user.name }}";
            const variables = (0, core_1.extractTextNodeKeys)(content);
            assert.equal(variables.length, 1);
            assert.equal(variables[0][0], "{{ user.name }}");
            assert.equal(variables[0][1], "user");
            assert.equal(variables[0][2].length, 1);
            assert.equal(variables[0][2][0], "name");
        });
        it("variable with nested properties", () => {
            const content = "Hello {{ user.name.first }}";
            const variables = (0, core_1.extractTextNodeKeys)(content);
            assert.equal(variables.length, 1);
            assert.equal(variables[0][0], "{{ user.name.first }}");
            assert.equal(variables[0][1], "user");
            assert.equal(variables[0][2].length, 2);
            assert.equal(variables[0][2][0], "name");
            assert.equal(variables[0][2][1], "first");
        });
    });
    describe("resolveTextNode", () => {
        it("resolves single variable", () => {
            const content = "Hello {{ name }}";
            const renderer = new MockRenderer({ name: "World" });
            const fragment = jsdom_1.JSDOM.fragment(content);
            const textNode = fragment.childNodes[0];
            assert.equal(textNode.textContent, "Hello {{ name }}");
            const proxies = renderer.resolveTextNode(textNode);
            assert.equal(textNode.textContent, "Hello World");
            proxies[0].set("Stranger");
            assert.equal(textNode.textContent, "Hello Stranger");
            renderer.set("name", "John");
            assert.equal(textNode.textContent, "Hello John");
        });
    });
    describe("safeEval", () => {
        it("simple sum", () => __awaiter(void 0, void 0, void 0, function* () {
            const fn = "a + b";
            const result = yield (0, core_1.safeEval)(fn, null, { a: 1, b: 2 });
            assert.equal(result, 3);
        }));
        it("sum with nested properties", () => __awaiter(void 0, void 0, void 0, function* () {
            const fn = "x.a + x.b";
            const result = yield (0, core_1.safeEval)(fn, null, { x: { a: 1, b: 2 } });
            assert.equal(result, 3);
        }));
        it("modifies variables", () => __awaiter(void 0, void 0, void 0, function* () {
            const object = { x: { a: 1 } };
            const fn = "x.a++";
            yield (0, core_1.safeEval)(fn, null, object);
            assert.equal(object.x.a, 2);
        }));
        it('passing "this" to function', () => __awaiter(void 0, void 0, void 0, function* () {
            const object = { x: { a: 1 } };
            const fn = "this.x.a++";
            yield (0, core_1.safeEval)(fn, object);
            assert.equal(object.x.a, 2);
        }));
        it("async call within function", () => __awaiter(void 0, void 0, void 0, function* () {
            const fn = "await Promise.resolve(1)";
            const result = yield (0, core_1.safeEval)(fn, null);
            assert.equal(result, 1);
        }));
    });
    describe("eval", () => {
        it("using implicit `this` in function", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: 1 });
            const fn = "++a";
            const result = yield renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("a"), 2);
        }));
        it("using implicit `this` and nested values", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ x: { a: 1 } });
            const fn = "++x.a";
            const result = yield renderer.eval(fn);
            assert.equal(result, 2);
            assert.equal(renderer.get("x", "a"), 2);
        }));
        it("tracing works as expected", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new MockRenderer({ a: 1, b: 2, c: 3 });
            const fn = () => renderer.eval("a + b");
            const [result, dependencies] = yield renderer.trace(fn);
            assert.equal(result, 3);
            assert.deepEqual(dependencies, ["a", "b"]);
        }));
    });
    describe(":data", () => {
        it("initializes unseen value", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div :data="{foo: 'bar'}"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            yield renderer.mount(fragment);
            assert.equal(node.getAttribute(":data"), null);
            assert.equal(renderer.get("foo"), "bar");
        }));
        it("initializes an array of values", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div :data="{arr: [1, 2, 3]}"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            yield renderer.mount(fragment);
            assert.equal(node.getAttribute(":data"), null);
            assert.deepEqual(renderer.get("arr"), [1, 2, 3]);
        }));
        it("initializes an array of objects", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div :data="{arr: [{n: 1}, {n: 2}, {n: 3}]}"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer();
            yield renderer.mount(fragment);
            assert.equal(node.getAttribute(":data"), null);
            assert.deepEqual(renderer.get("arr"), [{ n: 1 }, { n: 2 }, { n: 3 }]);
        }));
    });
    describe("@watch", () => {
        it("simple watch", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div @watch="foobar = foo + bar"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "foo", bar: "bar", foobar: null });
            yield renderer.mount(fragment);
            assert.equal(node.getAttribute("@watch"), null);
            assert.equal(renderer.get("foobar"), "foobar");
            // Change one of the dependencies and observe result.
            yield renderer.set("foo", "baz");
            assert.equal(renderer.get("foobar"), "bazbar");
            // Change the other dependency and observe result.
            yield renderer.set("bar", "qux");
            assert.equal(renderer.get("foobar"), "bazqux");
        }));
    });
    describe(":attribute", () => {
        it("class", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div :class="foo"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            yield renderer.mount(fragment);
            assert.equal(node.getAttribute(":class"), null);
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.className, "bar");
        }));
    });
    describe("$attribute", () => {
        it("inner-text", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div $inner-text="foo"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            yield renderer.mount(fragment);
            assert.equal(node.getAttribute("$inner-text"), null);
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.innerText, "bar");
        }));
    });
    describe("@attribute", () => {
        it("click", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const html = `<div @click="counter++"></div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ counter: 0 });
            yield renderer.mount(fragment);
            assert.equal(renderer.get("counter"), 0);
            (_a = node.click) === null || _a === void 0 ? void 0 : _a.call(node);
            yield new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(renderer.get("counter"), 1);
        }));
    });
    describe(":for", () => {
        [0, 1, 10].forEach((n) => {
            it(`container with ${n} items`, () => __awaiter(void 0, void 0, void 0, function* () {
                const html = `<div :for="item in items">{{ item }}</div>`;
                const fragment = jsdom_1.JSDOM.fragment(html);
                const node = fragment.firstElementChild;
                const parent = node.parentNode;
                assert.notEqual(parent, null);
                // Create array with 0..n elements.
                const container = Array.from({ length: n }, (_, x) => String(x));
                const renderer = new MockRenderer({ items: container });
                yield renderer.mount(fragment);
                assert.equal(node.getAttribute(":for"), null);
                assert.notEqual(node.parentNode, parent);
                assert.notEqual(renderer.get("item"), "foo");
                const children = Array.from((parent === null || parent === void 0 ? void 0 : parent.childNodes) || []).slice(1);
                assert.equal(children.length, container.length);
                for (let i = 0; i < container.length; i++) {
                    assert.equal(children[i].textContent, container[i]);
                }
            }));
        });
        it("container that updates items", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div :for="item in items">{{ item }}</div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            assert.notEqual(parent, null);
            // Create array with no elements.
            // const container: string[] = [];
            const renderer = new MockRenderer({ items: [] });
            yield renderer.mount(fragment);
            // Confirm that there are no children except for the template element.
            const children0 = Array.from((parent === null || parent === void 0 ? void 0 : parent.childNodes) || []);
            assert.equal(children0.length, 1);
            assert.equal(children0[0].tagName, "TEMPLATE");
            assert.equal(children0[0].firstChild, node);
            // Add a single item.
            renderer.get("items").push("foo");
            // renderer.get("items").push("foo");
            yield new Promise((resolve) => setTimeout(resolve, 10));
            const children1 = Array.from((parent === null || parent === void 0 ? void 0 : parent.childNodes) || []);
            assert.equal(children1.length, renderer.get("items").length + 1);
            assert.equal(children1[1].textContent, "foo");
            // Add multiple items.
            renderer.get("items").push("bar", "baz");
            yield new Promise((resolve) => setTimeout(resolve, 10));
            const children2 = Array.from((parent === null || parent === void 0 ? void 0 : parent.childNodes) || []);
            assert.equal(children2.length, renderer.get("items").length + 1);
            assert.equal(children2[1].textContent, "foo");
            assert.equal(children2[2].textContent, "bar");
            assert.equal(children2[3].textContent, "baz");
            // Remove one item.
            renderer.get("items").pop();
            yield new Promise((resolve) => setTimeout(resolve, 10));
            const children3 = Array.from((parent === null || parent === void 0 ? void 0 : parent.childNodes) || []);
            assert.equal(children3.length, renderer.get("items").length + 1);
            assert.equal(children3[1].textContent, "foo");
            assert.equal(children3[2].textContent, "bar");
        }));
        it("container does not resolve initially", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div :for="item in items">{{ item }}</div>`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            assert.notEqual(parent, null);
            // Create array with no elements.
            const renderer = new MockRenderer();
            yield renderer.mount(fragment);
            assert.equal(renderer.get("item"), null);
            assert.equal(node.getAttribute(":for"), null);
            assert.notEqual(node.parentNode, parent);
            const children = Array.from((parent === null || parent === void 0 ? void 0 : parent.childNodes) || []);
            assert.equal(children.length, 1);
            assert.equal(children[0].tagName, "TEMPLATE");
            assert.equal(children[0].firstChild, node);
        }));
        it("template node with attributes and properties", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const html = `
        <div $myprop="item" :myattr="item" :for="item in items">
          {{ item }}
        </div>`.trim();
            const fragment = jsdom_1.JSDOM.fragment(html);
            const renderer = new MockRenderer({ items: ["1", "2"] });
            yield renderer.mount(fragment);
            const children12 = Array.from(fragment.childNodes).slice(1);
            assert.equal(children12.length, 2);
            assert.equal((_a = children12[0].textContent) === null || _a === void 0 ? void 0 : _a.trim(), "1");
            assert.equal((_b = children12[1].textContent) === null || _b === void 0 ? void 0 : _b.trim(), "2");
            assert.equal(children12[0]["myprop"], "1");
            assert.equal(children12[1]["myprop"], "2");
            assert.equal(children12[0].getAttribute("myattr"), "1");
            assert.equal(children12[1].getAttribute("myattr"), "2");
            yield renderer.update({ items: ["a", "b"] });
            yield new Promise((resolve) => setTimeout(resolve, 10));
            const childrenAB = Array.from(fragment.childNodes).slice(1);
            assert.equal(childrenAB.length, 2);
            assert.equal((_c = childrenAB[0].textContent) === null || _c === void 0 ? void 0 : _c.trim(), "a");
            assert.equal((_d = childrenAB[1].textContent) === null || _d === void 0 ? void 0 : _d.trim(), "b");
            assert.equal(childrenAB[0]["myprop"], "a", 'myprop should be "a"');
            assert.equal(childrenAB[1]["myprop"], "b", 'myprop should be "b"');
            assert.equal(childrenAB[0].getAttribute("myattr"), "a");
            assert.equal(childrenAB[1].getAttribute("myattr"), "b");
        }));
    });
    describe(":bind", () => {
        it("binds a text input value with existing store key", () => __awaiter(void 0, void 0, void 0, function* () {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" />`;
            const dom = new jsdom_1.JSDOM(html);
            const node = dom.window.document.body.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            yield renderer.mount(dom.window.document.body);
            // Processed attributes are removed.
            assert.equal(node.getAttribute(":bind"), null);
            // Initial value is set.
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.value, "bar");
            // Update the store value, and watch the node value react.
            yield renderer.set("foo", "baz");
            assert.equal(node.value, "baz");
            // Update the node value, and watch the store value react.
            node.value = "qux";
            node.dispatchEvent(new dom.window.Event("change"));
            yield new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(renderer.get("foo"), "qux");
        }));
        it("binds a text input value with new store key", () => __awaiter(void 0, void 0, void 0, function* () {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" value="bar" />`;
            const dom = new jsdom_1.JSDOM(html);
            const node = dom.window.document.body.firstElementChild;
            // Value does not exist in store before mount().
            const renderer = new MockRenderer();
            assert.equal(renderer.get("foo"), null);
            yield renderer.mount(dom.window.document.body);
            // Processed attributes are removed.
            assert.equal(node.getAttribute(":bind"), null);
            // Initial value is set.
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.value, "bar");
            // Update the store value, and watch the node value react.
            yield renderer.set("foo", "baz");
            assert.equal(node.value, "baz");
            // Update the node value, and watch the store value react.
            node.value = "qux";
            node.dispatchEvent(new dom.window.Event("change"));
            yield new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(renderer.get("foo"), "qux");
        }));
        it("binds a text input value with custom events", () => __awaiter(void 0, void 0, void 0, function* () {
            // Since we're dealing with events, we need to create a full document.
            const html = `<input :bind="foo" :bind-events="my-custom-event" />`;
            const dom = new jsdom_1.JSDOM(html);
            const node = dom.window.document.body.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            yield renderer.mount(dom.window.document.body);
            // Processed attributes are removed.
            assert.equal(node.getAttribute(":bind"), null);
            // Initial value is set.
            assert.equal(renderer.get("foo"), "bar");
            assert.equal(node.value, "bar");
            // Update the store value, and watch the node value react.
            yield renderer.set("foo", "baz");
            assert.equal(node.value, "baz");
            // Update the node value, and watch the store value react only to the right event.
            node.value = "qux";
            node.dispatchEvent(new dom.window.Event("change"));
            yield new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(renderer.get("foo"), "baz");
            node.dispatchEvent(new dom.window.Event("my-custom-event"));
            yield new Promise((resolve) => setTimeout(resolve, 10));
            assert.equal(renderer.get("foo"), "qux");
        }));
    });
    describe(":show", () => {
        it("shows then hides an element", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const html = `<div :show="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            const renderer = new MockRenderer({ foo: true });
            yield renderer.mount(fragment);
            assert.ok(node.parentNode === parent);
            assert.ok(((_a = node.parentNode) === null || _a === void 0 ? void 0 : _a.firstElementChild) === node);
            assert.ok(!node.hasAttribute(":show"));
            yield renderer.set("foo", false);
            assert.ok(node.parentNode !== parent);
            assert.ok(!Array.from(((_b = node.parentNode) === null || _b === void 0 ? void 0 : _b.childNodes) || []).includes(node));
        }));
        it("hides then shows an element", () => __awaiter(void 0, void 0, void 0, function* () {
            var _c, _d;
            const html = `<div :show="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            const renderer = new MockRenderer({ foo: false });
            yield renderer.mount(fragment);
            assert.ok(node.parentNode !== parent);
            assert.ok(!Array.from(((_c = node.parentNode) === null || _c === void 0 ? void 0 : _c.childNodes) || []).includes(node));
            assert.ok(!node.hasAttribute(":show"));
            yield renderer.set("foo", true);
            assert.ok(node.parentNode === parent);
            assert.ok(((_d = node.parentNode) === null || _d === void 0 ? void 0 : _d.firstElementChild) === node);
        }));
        it("hides an element based on data from the same element", () => __awaiter(void 0, void 0, void 0, function* () {
            var _e;
            const html = `<div :data="{show: false}" :show="show" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const parent = node.parentNode;
            const renderer = new MockRenderer();
            yield renderer.mount(fragment);
            assert.ok(!node.hasAttribute(":show"));
            assert.equal(parent === null || parent === void 0 ? void 0 : parent.childNodes.length, 0);
            assert.notEqual(node.parentNode, parent);
            yield renderer.set("show", true);
            assert.equal(node.parentNode, parent);
            assert.equal((_e = node.parentNode) === null || _e === void 0 ? void 0 : _e.firstElementChild, node);
        }));
    });
    describe("shorthands", () => {
        it("$text", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div $text="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const renderer = new MockRenderer({ foo: "bar" });
            yield renderer.mount(fragment);
            assert.equal(node.textContent, "bar");
        }));
        it("$html", () => __awaiter(void 0, void 0, void 0, function* () {
            const html = `<div $html="foo" />`;
            const fragment = jsdom_1.JSDOM.fragment(html);
            const node = fragment.firstElementChild;
            const inner = "<div>bar</div>";
            const renderer = new MockRenderer({ foo: inner });
            yield renderer.mount(fragment);
            assert.equal(node.innerHTML, inner);
            assert.equal(node.childElementCount, 1);
        }));
    });
});
