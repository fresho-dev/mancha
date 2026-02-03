import { beforeEach, describe, it } from "node:test";
import {
	_getInjectedRules,
	_resetForTesting,
	isSupported,
	parseCustomValueClass,
	processClassString,
} from "./css_custom.js";
import { assert } from "./test_utils.js";

describe("css_custom", () => {
	beforeEach(() => _resetForTesting());

	describe("parseCustomValueClass", () => {
		it("parses width", () => {
			const result = parseCustomValueClass("w-[133px]");
			assert.deepEqual(result, { property: "width", value: "133px" });
		});

		it("parses negative margin", () => {
			const result = parseCustomValueClass("-mt-[2rem]");
			assert.deepEqual(result, { property: "margin-top", value: "-2rem" });
		});

		it("parses max-width", () => {
			const result = parseCustomValueClass("max-w-[900px]");
			assert.deepEqual(result, { property: "max-width", value: "900px" });
		});

		it("parses background color", () => {
			const result = parseCustomValueClass("bg-[#ff5733]");
			assert.deepEqual(result, { property: "background-color", value: "#ff5733" });
		});

		it("parses rem values", () => {
			const result = parseCustomValueClass("p-[2.5rem]");
			assert.deepEqual(result, { property: "padding", value: "2.5rem" });
		});

		it("parses calc expressions", () => {
			const result = parseCustomValueClass("w-[calc(100%-2rem)]");
			assert.deepEqual(result, { property: "width", value: "calc(100%-2rem)" });
		});

		it("parses height", () => {
			const result = parseCustomValueClass("h-[50vh]");
			assert.deepEqual(result, { property: "height", value: "50vh" });
		});

		it("parses min-height", () => {
			const result = parseCustomValueClass("min-h-[100px]");
			assert.deepEqual(result, { property: "min-height", value: "100px" });
		});

		it("parses gap", () => {
			const result = parseCustomValueClass("gap-[1.5rem]");
			assert.deepEqual(result, { property: "gap", value: "1.5rem" });
		});

		it("parses gap-x", () => {
			const result = parseCustomValueClass("gap-x-[10px]");
			assert.deepEqual(result, { property: "column-gap", value: "10px" });
		});

		it("parses gap-y", () => {
			const result = parseCustomValueClass("gap-y-[20px]");
			assert.deepEqual(result, { property: "row-gap", value: "20px" });
		});

		it("parses z-index", () => {
			const result = parseCustomValueClass("z-[9999]");
			assert.deepEqual(result, { property: "z-index", value: "9999" });
		});

		it("parses font-size", () => {
			const result = parseCustomValueClass("text-[14px]");
			assert.deepEqual(result, { property: "font-size", value: "14px" });
		});

		it("parses border-color", () => {
			const result = parseCustomValueClass("border-[#ccc]");
			assert.deepEqual(result, { property: "border-color", value: "#ccc" });
		});

		it("parses margin-inline", () => {
			const result = parseCustomValueClass("mx-[auto]");
			assert.deepEqual(result, { property: "margin-inline", value: "auto" });
		});

		it("parses position properties", () => {
			assert.deepEqual(parseCustomValueClass("top-[10px]"), { property: "top", value: "10px" });
			assert.deepEqual(parseCustomValueClass("left-[50%]"), { property: "left", value: "50%" });
		});

		it("returns null for non-custom class", () => {
			assert.equal(parseCustomValueClass("w-4"), null);
		});

		it("returns null for unknown prefix", () => {
			assert.equal(parseCustomValueClass("foo-[bar]"), null);
		});

		it("returns null for empty brackets", () => {
			assert.equal(parseCustomValueClass("w-[]"), null);
		});
	});

	describe("processClassString", () => {
		it("skips strings without brackets", () => {
			processClassString("flex w-4 mt-8");
			assert.equal(_getInjectedRules().size, 0);
		});

		it("skips empty strings", () => {
			processClassString("");
			assert.equal(_getInjectedRules().size, 0);
		});

		it("skips null-like values", () => {
			processClassString(null as unknown as string);
			assert.equal(_getInjectedRules().size, 0);
		});
	});

	describe("isSupported", () => {
		it("returns boolean", () => {
			assert.equal(typeof isSupported(), "boolean");
		});
	});
});
