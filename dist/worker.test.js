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
const mocha_1 = require("mocha");
const jsdom_1 = require("jsdom");
const worker_1 = require("./worker");
const core_1 = require("./core");
(0, mocha_1.describe)("Worker", () => {
    (0, mocha_1.describe)("parse and serialize", () => {
        (0, mocha_1.it)("simple string", () => {
            const renderer = new worker_1.RendererImpl();
            const content = "Hello World";
            const fragment = renderer.parseHTML(content);
            const serialized = renderer.serializeHTML(fragment);
            assert.equal(content, serialized);
        });
        (0, mocha_1.it)("single div element", () => {
            const renderer = new worker_1.RendererImpl();
            const content = "<div>Hello World</div>";
            const fragment = renderer.parseHTML(content);
            const serialized = renderer.serializeHTML(fragment);
            assert.equal(content, serialized);
        });
        (0, mocha_1.it)("multiple div elements", () => {
            const renderer = new worker_1.RendererImpl();
            const content = "<div>Hello World</div><div>Hello World</div>";
            const fragment = renderer.parseHTML(content);
            const serialized = renderer.serializeHTML(fragment);
            assert.equal(content, serialized);
        });
        (0, mocha_1.it)("root document with only body", () => {
            const renderer = new worker_1.RendererImpl();
            const content = "<body><div>Hello World</div></body>";
            const expected = "<html><head></head><body><div>Hello World</div></body></html>";
            const fragment = renderer.parseHTML(content, { root: true });
            const serialized = renderer.serializeHTML(fragment);
            assert.equal(expected, serialized);
        });
        (0, mocha_1.it)("root document with only head", () => {
            const renderer = new worker_1.RendererImpl();
            const content = "<head><title>Hello World</title></head>";
            const expected = "<html><head><title>Hello World</title></head><body></body></html>";
            const fragment = renderer.parseHTML(content, { root: true });
            const serialized = renderer.serializeHTML(fragment);
            assert.equal(expected, serialized);
        });
    });
    (0, mocha_1.describe)("{{ expressions }}", () => {
        (0, mocha_1.it)("set, update and get context string value", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new worker_1.RendererImpl({ name: null });
            const fragment = jsdom_1.JSDOM.fragment("<span>Hello {{ name }}</span>");
            const textNode = Array.from((0, core_1.traverse)(fragment)).filter((node) => node.nodeType === 3)[0];
            // Set the initial value and render node.
            yield renderer.set("name", "World");
            yield renderer.mount(fragment);
            assert.equal(textNode.nodeValue, "Hello World");
            // Update the value and observe the change.
            yield renderer.set("name", "Stranger");
            assert.equal(textNode.nodeValue, "Hello Stranger");
        }));
        (0, mocha_1.it)("sets object, gets object property", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new worker_1.RendererImpl();
            const fragment = jsdom_1.JSDOM.fragment("<span>Hello {{ user.name }}</span>");
            const textNode = Array.from((0, core_1.traverse)(fragment)).filter((node) => node.nodeType === 3)[0];
            // Set the initial value and render node.
            yield renderer.set("user", { name: "World" });
            yield renderer.mount(fragment);
            assert.equal(textNode.nodeValue, "Hello World");
            // Update the value and observe the change.
            yield renderer.set("user", { name: "Stranger" });
            assert.equal(textNode.nodeValue, "Hello Stranger");
        }));
    });
    (0, mocha_1.describe)("mount", () => {
        (0, mocha_1.it)("set, update and get context string value", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new worker_1.RendererImpl();
            const fragment = jsdom_1.JSDOM.fragment("<span>Hello {{ name }}</span>");
            const textNode = Array.from((0, core_1.traverse)(fragment)).filter((node) => node.nodeType === 3)[0];
            // Set the initial value and render node.
            yield renderer.set("name", "World");
            yield renderer.mount(fragment);
            assert.equal(textNode.nodeValue, "Hello World");
            // Update the value and observe the change.
            yield renderer.set("name", "Stranger");
            assert.equal(textNode.nodeValue, "Hello Stranger");
        }));
    });
    (0, mocha_1.describe)("watch", () => {
        (0, mocha_1.it)("watch a single value", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new worker_1.RendererImpl();
            const fragment = jsdom_1.JSDOM.fragment("<span>Hello {{ name }}</span>");
            const textNode = Array.from((0, core_1.traverse)(fragment)).filter((node) => node.nodeType === 3)[0];
            yield renderer.set("name", "World");
            yield renderer.mount(fragment);
            assert.equal(textNode.nodeValue, "Hello World");
            // Listen to the next update.
            const watched = new Promise((resolve) => renderer.watch(["name"], resolve));
            yield renderer.set("name", "Stranger");
            assert.equal(yield watched, "Stranger");
            assert.equal(renderer.get("name"), "Stranger");
        }));
        (0, mocha_1.it)("watch multiple values", () => __awaiter(void 0, void 0, void 0, function* () {
            const renderer = new worker_1.RendererImpl();
            const fragment = jsdom_1.JSDOM.fragment("<span>Hello {{ name }}, it's {{ weather }}</span>");
            const textNode = Array.from((0, core_1.traverse)(fragment)).filter((node) => node.nodeType === 3)[0];
            yield renderer.set("name", "World");
            yield renderer.set("weather", "sunny");
            yield renderer.mount(fragment);
            assert.equal(textNode.nodeValue, "Hello World, it's sunny");
            // Listen to the next update.
            const watched = new Promise((resolve) => renderer.watch(["name", "weather"], (...values) => resolve([...values])));
            yield renderer.set("name", "Stranger");
            const [currName, currWeather] = yield watched;
            assert.equal(currName, "Stranger");
            assert.equal(currWeather, "sunny");
        }));
    });
});
