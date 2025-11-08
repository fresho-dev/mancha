import { typeCheck } from "./type_checker.js";
import { assert, setupGlobalTestEnvironment } from "./test_utils.js";
import * as ts from "typescript";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs/promises";
import * as os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("typeCheck", function () {
  // Type checking can be slow due to TypeScript compilation
  // Apply timeout to all tests in this suite and nested suites
  this.timeout(15000);

  before(() => setupGlobalTestEnvironment());

  // Helper: filePath for tests that import types from ./test_types/
  const testFilePath = path.join(__dirname, "test.html");

  const findDiagnostic = (diagnostics: ts.Diagnostic[], messagePart: string) => {
    return diagnostics.find((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, "\n").includes(messagePart)
    );
  };

  it("should find no errors in a valid template", async function () {
    const html = `<div :types='{"name": "string"}'><span>{{ name.toUpperCase() }}</span></div>`;
    const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
    assert.equal(diagnostics.length, 0, "Should have no diagnostics");
  });

  it("should report a type error for incorrect method usage", async function () {
    const html = `<div :types='{"name": "string"}'><span>{{ name.toFixed(2) }}</span></div>`;
    const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
    assert.ok(diagnostics.length > 0, "Should have diagnostics");
    assert.ok(
      findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"),
      "Should find specific error"
    );
  });

  it("should handle various mancha attributes", async function () {
    const html = `
      <div :types='{"myClass": "string", "showDiv": "boolean", "textValue": "string", "items": "string[]"}'>
        <div :class="myClass.length > 0 ? myClass : ''"></div>
        <div :show="showDiv"></div>
        <div :text="textValue.trim()"></div>
        <ul>
          <li :for="item in items">{{ item.toUpperCase() }}</li>
        </ul>
      </div>
    `;
    const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
    assert.equal(diagnostics.length, 0, "Should have no diagnostics for various attributes");
  });

  it("should report errors in various mancha attributes", async function () {
    const html = `
      <div :types='{"myClass": "number", "showDiv": "string", "textValue": "boolean", "items": "object[]"}'>
        <div :class="myClass.toUpperCase()"></div>
        <div :show="showDiv.isBoolean()"></div>
        <div :text="textValue.trim()"></div>
        <ul>
          <li :for="item in items">{{ item.toUpperCase() }}</li>
        </ul>
      </div>
    `;
    const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
    assert.ok(diagnostics.length > 0);
    assert.ok(
      findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
    );
    assert.ok(findDiagnostic(diagnostics, "Property 'isBoolean' does not exist on type 'string'"));
    assert.ok(findDiagnostic(diagnostics, "Property 'trim' does not exist on type 'boolean'"));
    assert.ok(
      findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'object'")
    );
  });

  it("should handle complex object types", async function () {
    const html = `
      <div :types='{"user": "{ name: string, address: { city: string } }"}'>
        <span>{{ user.name }}</span>
        <span>{{ user.address.city.toUpperCase() }}</span>
      </div>
    `;
    const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
    assert.equal(diagnostics.length, 0, "Should handle complex objects");
  });

  it("should report errors on complex object types", async function () {
    const html = `
      <div :types='{"user": "{ name: string, address: { city: string } }"}'>
        <span>{{ user.name.toFixed(2) }}</span>
        <span>{{ user.address.city.isNumber() }}</span>
      </div>
    `;
    const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
    assert.equal(diagnostics.length, 2);
    assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
    assert.ok(findDiagnostic(diagnostics, "Property 'isNumber' does not exist on type 'string'"));
  });

  it("should enforce strict mode", async function () {
    const html = `
      <div :types='{"definedVar": "string"}'>
        <span>{{ undefinedVar }}</span>
      </div>
    `;
    const diagnostics = await typeCheck(html, { strict: true });
    assert.ok(diagnostics.length > 0);
    assert.ok(findDiagnostic(diagnostics, "Cannot find name 'undefinedVar'"));
  });

  describe("error location reporting", () => {
    it("should report correct location for type error in text interpolation", async function () {
      const html = `<div :types='{"name": "string"}'><span>{{ name.toFixed(2) }}</span></div>`;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const diagnostic = findDiagnostic(
        diagnostics,
        "Property 'toFixed' does not exist on type 'string'"
      );
      assert.ok(diagnostic, "Should find the diagnostic");
      if (diagnostic && diagnostic.file) {
        assert.equal(diagnostic.file.fileName, testFilePath, "Should point to the HTML file");
        assert.equal(diagnostic.start, 47, "Start of expression should be correct");
        assert.equal(diagnostic.length, 7, "Length of expression should be correct");
      }
    });

    it("should report correct location for type error in attribute", async function () {
      const html = `<div :types='{"show": "boolean"}' :show="show.toUpperCase()"></div>`;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const diagnostic = findDiagnostic(
        diagnostics,
        "Property 'toUpperCase' does not exist on type 'boolean'"
      );
      assert.ok(diagnostic, "Should find the diagnostic");
      if (diagnostic && diagnostic.file) {
        assert.equal(diagnostic.file.fileName, testFilePath, "Should point to the HTML file");
        assert.equal(diagnostic.start, 46, "Start of expression should be correct");
        assert.equal(diagnostic.length, 11, "Length of expression should be correct");
      }
    });

    it("should report correct location for :for items expression", async function () {
      const html = `<div :types='{"items": "number"}'><ul><li :for="item in items.length"></li></ul></div>`;
      const diagnostics = await typeCheck(html, { strict: true, filePath: testFilePath });
      const diagnostic = findDiagnostic(
        diagnostics,
        "Property 'length' does not exist on type 'number'"
      );
      assert.ok(diagnostic, "Should find the diagnostic");
      if (diagnostic && diagnostic.file) {
        assert.equal(diagnostic.file.fileName, testFilePath, "Should point to the HTML file");
        assert.equal(diagnostic.start, 62, "Start of expression should be correct");
        assert.equal(diagnostic.length, 6, "Length of expression should be correct");
      }
    });

    it("should report correct location for error in :for loop body", async function () {
      const html = `<div :types='{"items": "string[]"}'><ul><li :for="item in items">{{ item.toFixed(2) }}</li></ul></div>`;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const diagnostic = findDiagnostic(
        diagnostics,
        "Property 'toFixed' does not exist on type 'string'"
      );
      assert.ok(diagnostic, "Should find the diagnostic");
      if (diagnostic && diagnostic.file) {
        assert.equal(diagnostic.file.fileName, testFilePath, "Should point to the HTML file");
        assert.equal(diagnostic.start, 73, "Start of expression should be correct");
        assert.equal(diagnostic.length, 7, "Length of expression should be correct");
      }
    });

    it("should report correct location for jexpr error", async function () {
      const html = `<div :types='{"a": "number"}'><span>{{ a?.b }}</span></div>`;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const diagnostic = findDiagnostic(diagnostics, "Unsupported expression for jexpr");
      assert.ok(diagnostic, "Should find the diagnostic");
      if (diagnostic && diagnostic.file) {
        assert.equal(diagnostic.file.fileName, testFilePath, "Should point to the HTML file");
        assert.equal(diagnostic.start, 39, "Start of expression should be correct");
        assert.equal(diagnostic.length, 4, "Length of expression should be correct");
      }
    });

    it("should report correct location for :types parsing error", async function () {
      const html = `<div :types='{"a": not_a_string}'></div>`;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const diagnostic = findDiagnostic(diagnostics, "Failed to evaluate :types");
      assert.ok(diagnostic, "Should find the diagnostic");
      if (diagnostic && diagnostic.file) {
        assert.equal(diagnostic.file.fileName, testFilePath, "Should point to the HTML file");
        assert.equal(diagnostic.start, 13, "Start of expression should be correct");
        assert.equal(diagnostic.length, 19, "Length of expression should be correct");
      }
    });
  });

  describe("global expression validation", () => {
    it("should validate expressions outside :types scopes", async function () {
      const html = `
        <div>
          <span>{{ value?.prop }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const jexprDiagnostic = findDiagnostic(diagnostics, "Unsupported expression for jexpr");
      assert.ok(jexprDiagnostic, "Should flag invalid jexpr expression even without :types");
    });
  });

  describe("jexpr compatibility", () => {
    it("should inherit types from outer scope", async function () {
      const html = `
        <div :types='{"name": "string", "age": "number"}'>
          <span>{{ name.toUpperCase() }}</span>
          <div :types='{"city": "string"}'>
            <span>{{ name.toLowerCase() }}</span>
            <span>{{ city.toUpperCase() }}</span>
            <span>{{ age.toFixed(0) }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should inherit types from outer scope");
    });

    it("should allow inner scope to override outer types", async function () {
      const html = `
        <div :types='{"value": "string"}'>
          <span>{{ value.toUpperCase() }}</span>
          <div :types='{"value": "number"}'>
            <span>{{ value.toFixed(2) }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should allow override");
    });

    it("should detect type errors in nested scopes with inheritance", async function () {
      const html = `
        <div :types='{"name": "string"}'>
          <div :types='{"age": "number"}'>
            <span>{{ name.toFixed(2) }}</span>
            <span>{{ age.toUpperCase() }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 2);
      assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
    });

    it("should handle three levels of nesting", async function () {
      const html = `
        <div :types='{"a": "string"}'>
          <span>{{ a.toUpperCase() }}</span>
          <div :types='{"b": "number"}'>
            <span>{{ a.toLowerCase() }}</span>
            <span>{{ b.toFixed(1) }}</span>
            <div :types='{"c": "boolean"}'>
              <span>{{ a.trim() }}</span>
              <span>{{ b.toFixed(2) }}</span>
              <span :show="c"></span>
            </div>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle three levels");
    });

    it("should handle nested scopes with :for loops", async function () {
      const html = `
        <div :types='{"users": "{ name: string, scores: number[] }[]"}'>
          <ul :for="user in users">
            <li>{{ user.name.toUpperCase() }}</li>
            <div :types='{"prefix": "string"}'>
              <span>{{ prefix.toUpperCase() }} {{ user.name }}</span>
              <ul :for="score in user.scores">
                <li>{{ score.toFixed(1) }}</li>
                <li>{{ prefix.toLowerCase() }}</li>
              </ul>
            </div>
          </ul>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle nested scopes with for loops");
    });

    it("should detect errors in nested scopes with :for loops", async function () {
      const html = `
        <div :types='{"items": "string[]"}'>
          <div :types='{"count": "number"}'>
            <ul :for="item in items">
              <li>{{ item.toFixed(2) }}</li>
              <li>{{ count.toUpperCase() }}</li>
            </ul>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 2);
      assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
    });

    it("should handle override in nested scope not affecting outer scope", async function () {
      const html = `
        <div :types='{"value": "string"}'>
          <span>{{ value.toUpperCase() }}</span>
          <div :types='{"value": "number"}'>
            <span>{{ value.toFixed(2) }}</span>
          </div>
          <span>{{ value.toLowerCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Override should not affect outer scope");
    });

    it("should handle sibling nested scopes independently", async function () {
      const html = `
        <div :types='{"shared": "string"}'>
          <div :types='{"a": "number"}'>
            <span>{{ shared.toUpperCase() }}</span>
            <span>{{ a.toFixed(2) }}</span>
          </div>
          <div :types='{"b": "boolean"}'>
            <span>{{ shared.toLowerCase() }}</span>
            <span :show="b"></span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Sibling scopes should be independent");
    });

    it("should detect when sibling scope tries to access other sibling's types", async function () {
      const html = `
        <div :types='{"shared": "string"}'>
          <div :types='{"a": "number"}'>
            <span>{{ a.toFixed(2) }}</span>
          </div>
          <div :types='{"b": "boolean"}'>
            <span>{{ a.toFixed(2) }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0);
      assert.ok(findDiagnostic(diagnostics, "Cannot find name 'a'"));
    });
  });

  describe("import types", () => {
    it("should handle single imported type", async function () {
      const html = `
        <div :types='{"user": "@import:./test_types/user.ts:User"}'>
          <span>{{ user.name.toUpperCase() }}</span>
          <span>{{ user.age.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle imported type");
    });

    it("should detect errors on imported types", async function () {
      const html = `
        <div :types='{"user": "@import:./test_types/user.ts:User"}'>
          <span>{{ user.name.toFixed(2) }}</span>
          <span>{{ user.age.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 2);
      assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
    });

    it("should handle array of imported types", async function () {
      const html = `
        <div :types='{"users": "@import:./test_types/user.ts:User[]"}'>
          <ul :for="user in users">
            <li>{{ user.name.toUpperCase() }}</li>
            <li>{{ user.age.toFixed(0) }}</li>
          </ul>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle array of imported types");
    });

    it("should handle imports in complex object types", async function () {
      const html = `
        <div :types='{"response": "{ data: @import:./test_types/user.ts:User[], total: number }"}'>
          <span>Total: {{ response.total.toFixed(0) }}</span>
          <ul :for="user in response.data">
            <li>{{ user.name }}</li>
          </ul>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle imports in object types");
    });

    it("should handle multiple imports from different files", async function () {
      const html = `
        <div :types='{
          "user": "@import:./test_types/user.ts:User",
          "product": "@import:./test_types/product.ts:Product",
          "count": "number"
        }'>
          <span>{{ user.name.toUpperCase() }}</span>
          <span>{{ product.name.toUpperCase() }}</span>
          <span>{{ count.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle multiple imports");
    });

    it("should handle multiple imports from same file", async function () {
      const html = `
        <div :types='{
          "user": "@import:./test_types/user.ts:User",
          "admin": "@import:./test_types/user.ts:Admin"
        }'>
          <span>{{ user.name.toUpperCase() }}</span>
          <span>{{ admin.role.toUpperCase() }}</span>
          <span>{{ admin.permissions.length }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle multiple imports from same file");
    });

    it("should inherit imported types in nested scopes", async function () {
      const html = `
        <div :types='{"user": "@import:./test_types/user.ts:User"}'>
          <span>{{ user.name.toUpperCase() }}</span>
          <div :types='{"count": "number"}'>
            <span>{{ user.email.toLowerCase() }}</span>
            <span>{{ count.toFixed(0) }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should inherit imported types");
    });

    it("should handle imports with for-loops", async function () {
      const html = `
        <div :types='{"products": "@import:./test_types/product.ts:Product[]"}'>
          <ul :for="product in products">
            <li>{{ product.name.toUpperCase() }}</li>
            <li>{{ product.price.toFixed(2) }}</li>
            <li :show="product.inStock"></li>
          </ul>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle imports with for-loops");
    });

    it("should handle nested imports with for-loops", async function () {
      const html = `
        <div :types='{"categories": "@import:./test_types/product.ts:Category[]"}'>
          <div :for="category in categories">
            <h2>{{ category.name.toUpperCase() }}</h2>
            <div :types='{"selectedId": "number"}'>
              <ul :for="product in category.products">
                <li>{{ product.name }} - {{ selectedId.toFixed(0) }}</li>
              </ul>
            </div>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle nested imports with for-loops");
    });

    it("should handle generic types with imports", async function () {
      const html = `
        <div :types='{"response": "@import:./test_types/api.ts:ApiResponse<@import:./test_types/user.ts:User>"}'>
          <span>{{ response.data.name.toUpperCase() }}</span>
          <span>{{ response.status.toFixed(0) }}</span>
          <span>{{ response.message.toLowerCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle generic types with imports");
    });

    it("should handle union types with imports", async function () {
      const html = `
        <div :types='{"user": "@import:./test_types/user.ts:User | null"}'>
          <span :show="user !== null"></span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle union types with imports");
    });

    it("should detect errors in nested imported types", async function () {
      const html = `
        <div :types='{"response": "{ user: @import:./test_types/user.ts:User, count: number }"}'>
          <span>{{ response.user.name.toFixed(2) }}</span>
          <span>{{ response.count.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 2);
      assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
    });

    it("should handle deeply nested imports in object types", async function () {
      const html = `
        <div :types='{
          "config": "{
            user: @import:./test_types/user.ts:User,
            settings: {
              theme: string,
              product: @import:./test_types/product.ts:Product
            }
          }"
        }'>
          <span>{{ config.user.name.toUpperCase() }}</span>
          <span>{{ config.settings.theme.toLowerCase() }}</span>
          <span>{{ config.settings.product.price.toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle deeply nested imports");
    });
  });

  describe("union types", () => {
    it("should handle basic union types without imports", async function () {
      const html = `
        <div :types='{"value": "string | number"}'>
          <span :show="typeof value === 'string'">{{ value }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle union types");
    });

    it("should detect errors on union types when method doesn't exist on all types", async function () {
      const html = `
        <div :types='{"value": "string | number"}'>
          <span>{{ value.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.ok(diagnostics.length > 0);
      assert.ok(
        findDiagnostic(
          diagnostics,
          "Property 'toUpperCase' does not exist on type 'string | number'"
        )
      );
    });

    it("should handle union with null", async function () {
      const html = `
        <div :types='{"name": "string | null"}'>
          <span :show="name !== null">{{ name }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle union with null");
    });

    it("should handle union with undefined", async function () {
      const html = `
        <div :types='{"value": "number | undefined"}'>
          <span :show="value !== undefined">{{ value }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle union with undefined");
    });
  });

  describe("strict mode nullable checks", () => {
    it("should detect errors when accessing nullable property without checks", async function () {
      const html = `
        <div :types='{"name": "string | null"}'>
          <span>{{ name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should detect error on nullable access");
      const diagnostic = diagnostics.find((d) =>
        ts.flattenDiagnosticMessageText(d.messageText, "\n").includes("null")
      );
      assert.ok(diagnostic, "Should mention null in error message");
    });

    it("should report unsupported optional chaining on nullable types", async function () {
      const html = `
        <div :types='{"name": "string | null"}'>
          <span>{{ name?.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should flag unsupported optional chaining on nullable");
      assert.ok(
        findDiagnostic(diagnostics, "Unsupported expression for jexpr (name?.toUpperCase())")
      );
    });

    it("should detect errors when accessing undefined property without checks", async function () {
      const html = `
        <div :types='{"value": "number | undefined"}'>
          <span>{{ value.toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should detect error on undefined access");
      const diagnostic = diagnostics.find((d) =>
        ts.flattenDiagnosticMessageText(d.messageText, "\n").includes("undefined")
      );
      assert.ok(diagnostic, "Should mention undefined in error message");
    });

    it("should report unsupported optional chaining on undefined types", async function () {
      const html = `
        <div :types='{"value": "number | undefined"}'>
          <span>{{ value?.toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should flag unsupported optional chaining on undefined");
      assert.ok(
        findDiagnostic(diagnostics, "Unsupported expression for jexpr (value?.toFixed(2))")
      );
    });

    it("should detect errors on optional property without checks", async function () {
      const html = `
        <div :types='{"user": "{ name: string, age?: number }"}'>
          <span>{{ user.age.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should detect error on optional property");
      const diagnostic = diagnostics.find((d) =>
        ts.flattenDiagnosticMessageText(d.messageText, "\n").includes("undefined")
      );
      assert.ok(diagnostic, "Should mention undefined for optional property");
    });

    it("should report unsupported optional chaining on optional properties", async function () {
      const html = `
        <div :types='{"user": "{ name: string, age?: number }"}'>
          <span>{{ user.age?.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should flag unsupported optional chaining");
      assert.ok(
        findDiagnostic(diagnostics, "Unsupported expression for jexpr (user.age?.toFixed(0))")
      );
    });

    it("should detect errors on null | undefined without checks", async function () {
      const html = `
        <div :types='{"data": "string | null | undefined"}'>
          <span>{{ data.length }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should detect error on null | undefined");
    });

    it("should report unsupported optional chaining on null | undefined", async function () {
      const html = `
        <div :types='{"data": "string | null | undefined"}'>
          <span>{{ data?.length }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should flag unsupported optional chaining");
      assert.ok(
        findDiagnostic(diagnostics, "Unsupported expression for jexpr (data?.length)")
      );
    });

    it("should detect errors in nested nullable property access", async function () {
      const html = `
        <div :types='{"user": "{ profile?: { name: string } }"}'>
          <span>{{ user.profile.name }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should detect error on nested nullable");
    });

    it("should report unsupported nested optional chaining", async function () {
      const html = `
        <div :types='{"user": "{ profile?: { name: string } }"}'>
          <span>{{ user.profile?.name }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      assert.ok(diagnostics.length > 0, "Should flag unsupported nested optional chaining");
      assert.ok(
        findDiagnostic(diagnostics, "Unsupported expression for jexpr (user.profile?.name)")
      );
    });

    it("should handle strict mode with non-nullable types correctly", async function () {
      const html = `
        <div :types='{"name": "string"}'>
          <span>{{ name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: true });
      if (diagnostics.length > 0) {
        console.log(
          "Unexpected diagnostics:",
          diagnostics.map((d) => ({
            code: d.code,
            message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
          }))
        );
      }
      assert.equal(diagnostics.length, 0, "Should have no errors with non-nullable types");
    });
  });

  describe("literal types", () => {
    it("should handle string literal types", async function () {
      const html = `
        <div :types="{&quot;status&quot;: &quot;'active' | 'inactive'&quot;}">
          <span :show="status === 'active'">Active</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle literal types");
    });

    it("should handle numeric literal types", async function () {
      const html = `
        <div :types='{"code": "200 | 404 | 500"}'>
          <span :show="code === 200">Success</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle numeric literals");
    });
  });

  describe("tuple types", () => {
    it("should handle tuple types", async function () {
      const html = `
        <div :types='{"coords": "[number, number]"}'>
          <span>{{ coords[0].toFixed(2) }}</span>
          <span>{{ coords[1].toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle tuple types");
    });

    it("should detect errors on tuple types", async function () {
      const html = `
        <div :types='{"coords": "[number, string]"}'>
          <span>{{ coords[0].toUpperCase() }}</span>
          <span>{{ coords[1].toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 2);
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
      assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
    });
  });

  describe("optional properties", () => {
    it("should handle optional properties", async function () {
      const html = `
        <div :types='{"user": "{ name: string, age?: number }"}'>
          <span>{{ user.name.toUpperCase() }}</span>
          <span :show="user.age !== undefined">{{ user.age }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle optional properties");
    });
  });

  describe("readonly properties", () => {
    it("should handle readonly properties", async function () {
      const html = `
        <div :types='{"user": "{ readonly id: number, name: string }"}'>
          <span>{{ user.id.toFixed(0) }}</span>
          <span>{{ user.name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle readonly properties");
    });
  });

  describe("generic types", () => {
    it("should handle generic array types", async function () {
      const html = `
        <div :types='{"items": "Array<string>"}'>
          <ul :for="item in items">
            <li>{{ item.toUpperCase() }}</li>
          </ul>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle Array<T> syntax");
    });

    it("should handle generic Promise types", async function () {
      const html = `
        <div :types='{"result": "Promise<number>"}'>
          <span>{{ result }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle Promise types");
    });

    it("should handle nested generic types", async function () {
      const html = `
        <div :types='{"data": "Array<Array<number>>"}'>
          <div :for="row in data">
            <span :for="cell in row">{{ cell.toFixed(1) }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle nested generics");
    });
  });

  describe("intersection types", () => {
    it("should handle intersection types", async function () {
      const html = `
        <div :types='{"item": "{ name: string } & { age: number }"}'>
          <span>{{ item.name.toUpperCase() }}</span>
          <span>{{ item.age.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle intersection types");
    });
  });

  describe("for-loop edge cases", () => {
    it("should handle for-loop with union array types", async function () {
      const html = `
        <div :types='{"items": "(string | number)[]"}'>
          <ul :for="item in items">
            <li>{{ item }}</li>
          </ul>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle union in arrays");
    });
  });

  describe("edge cases", () => {
    it("should handle empty types object", async function () {
      const html = `
        <div :types='{}'>
          <span>No types defined</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Empty types should be valid");
    });

    it("should handle deeply nested object types", async function () {
      const html = `
        <div :types='{"data": "{ a: { b: { c: { d: string } } } }"}'>
          <span>{{ data.a.b.c.d.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle deep nesting");
    });

    it("should detect errors in deeply nested paths", async function () {
      const html = `
        <div :types='{"data": "{ a: { b: { c: { d: number } } } }"}'>
          <span>{{ data.a.b.c.d.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.ok(diagnostics.length > 0);
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
    });

    it("should handle type with special characters in property names", async function () {
      const html = `
        <div :types='{ "data": "{ \\"special-key\\": string, another_key: number }" }'>
          <span>{{ data["special-key"].toUpperCase() }}</span>
          <span>{{ data.another_key.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle special characters in keys");
    });

    it("should handle Record utility type", async function () {
      const html = `
        <div :types='{"map": "Record<string, number>"}'>
          <span>{{ map.someKey }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle Record type");
    });

    it("should handle Partial utility type", async function () {
      const html = `
        <div :types='{"user": "Partial<{ name: string, age: number }>"}'>
          <span :show="user.name">{{ user.name }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle Partial type");
    });

    it("should handle Pick utility type", async function () {
      const html = `
        <div :types="{&quot;user&quot;: &quot;Pick<{ name: string, age: number, email: string }, 'name' | 'age'>&quot;}">
          <span>{{ user.name.toUpperCase() }}</span>
          <span>{{ user.age.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle Pick type");
    });
  });

  describe("attribute handling with data- prefix", () => {
    it("should recognize data-types attribute", async function () {
      const html = `
        <div data-types='{"name": "string"}'>
          <span>{{ name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should recognize data-types attribute");
    });

    it("should recognize :types attribute", async function () {
      const html = `
        <div :types='{"name": "string"}'>
          <span>{{ name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should recognize :types attribute");
    });

    it("should prioritize :types over data-types", async function () {
      const html = `
        <div :types='{"name": "string"}' data-types='{"name": "number"}'>
          <span>{{ name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should use :types (string) not data-types (number)");
    });

    it("should recognize data-for attribute", async function () {
      const html = `
        <div :types='{"items": "string[]"}'>
          <div data-for="item in items">
            <span>{{ item.toUpperCase() }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should recognize data-for attribute");
    });

    it("should recognize :for attribute", async function () {
      const html = `
        <div :types='{"items": "string[]"}'>
          <div :for="item in items">
            <span>{{ item.toUpperCase() }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should recognize :for attribute");
    });

    it("should prioritize :for over data-for", async function () {
      const html = `
        <div :types='{"items": "string[]", "numbers": "number[]"}'>
          <div :for="item in items" data-for="num in numbers">
            <span>{{ item.toUpperCase() }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(
        diagnostics.length,
        0,
        "Should use :for (items/string) not data-for (numbers/number)"
      );
    });

    it("should detect type errors with data-types", async function () {
      const html = `
        <div data-types='{"name": "string"}'>
          <span>{{ name.toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.ok(diagnostics.length > 0, "Should detect error with data-types");
    });

    it("should detect type errors in data-for loops", async function () {
      const html = `
        <div :types='{"items": "string[]"}'>
          <div data-for="item in items">
            <span>{{ item.toFixed(2) }}</span>
          </div>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.ok(diagnostics.length > 0, "Should detect error in data-for loop");
    });

    it("should ignore unrelated data-* attributes", async function () {
      const html = `
        <div :types='{"title": "string"}'>
          <h1 data-testid="main-title">{{ title.toUpperCase() }}</h1>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "data-testid should be treated as a static attribute");
    });
  });

  describe("parent directory imports", () => {
    const nestedTestFilePath = path.join(__dirname, "test_types/nested/test.html");

    it("should handle imports from parent directory", async function () {
      const html = `
        <div :types='{"user": "@import:../user.ts:User"}'>
          <span>{{ user.name.toUpperCase() }}</span>
          <span>{{ user.age.toFixed(0) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: nestedTestFilePath });
      assert.equal(diagnostics.length, 0, "Should handle parent directory imports");
    });

    it("should handle imports from multiple parent directories", async function () {
      const html = `
        <div :types='{"data": "@import:../user.ts:User"}'>
          <span>{{ data.name }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: nestedTestFilePath });
      assert.equal(diagnostics.length, 0, "Should resolve parent paths correctly");
    });

    it("should detect type errors with parent directory imports", async function () {
      const html = `
        <div :types='{"user": "@import:../user.ts:User"}'>
          <span>{{ user.name.toFixed(2) }}</span>
          <span>{{ user.age.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: nestedTestFilePath });
      assert.equal(diagnostics.length, 2);
      assert.ok(findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'"));
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'number'")
      );
    });
  });

  describe("global types availability", () => {
    it("should have access to String global type methods", async function () {
      const html = `
        <div :types='{"text": "string"}'>
          <span>{{ text.toUpperCase() }}</span>
          <span>{{ text.toLowerCase() }}</span>
          <span>{{ text.trim() }}</span>
          <span>{{ text.substring(0, 5) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should have String methods available");
    });

    it("should have access to Number global type methods", async function () {
      const html = `
        <div :types='{"value": "number"}'>
          <span>{{ value.toFixed(2) }}</span>
          <span>{{ value.toString() }}</span>
          <span>{{ value.toExponential() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should have Number methods available");
    });

    it("should have access to Array global type methods", async function () {
      const html = `
        <div :types='{"items": "string[]"}'>
          <span>{{ items.length }}</span>
          <span>{{ items.join(", ") }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should have Array methods available");
    });

    it("should detect when using wrong global type method", async function () {
      const html = `
        <div :types='{"text": "string"}'>
          <span>{{ text.toFixed(2) }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.ok(diagnostics.length > 0, "Should detect wrong method usage");
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toFixed' does not exist on type 'string'")
      );
    });
  });

  describe("filePath option for path resolution", () => {
    it("should resolve relative imports based on filePath", async function () {
      const html = `
        <div :types='{"user": "@import:./user.ts:User"}'>
          <span>{{ user.name.toUpperCase() }}</span>
        </div>
      `;
      const filePath = path.join(__dirname, "test_types/test.html");
      const diagnostics = await typeCheck(html, { strict: false, filePath });
      assert.equal(diagnostics.length, 0, "Should resolve based on filePath");
    });

    it("should handle filePath in different directory", async function () {
      const html = `
        <div :types='{"child": "@import:./child.ts:ChildData"}'>
          <span>{{ child.name.toUpperCase() }}</span>
          <span>{{ child.id.toFixed(0) }}</span>
        </div>
      `;
      const filePath = path.join(__dirname, "test_types/nested/test.html");
      const diagnostics = await typeCheck(html, { strict: false, filePath });
      assert.equal(diagnostics.length, 0, "Should resolve in nested directory");
    });

    it("should work without filePath option for simple cases", async function () {
      const html = `
        <div :types='{"name": "string"}'>
          <span>{{ name.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should work without filePath for inline types");
    });
  });

  describe("external package imports", () => {
    it("should handle imports from node_modules packages", async function () {
      // This test assumes typescript is installed (which it is, as a devDependency)
      const html = `
        <div :types='{"program": "@import:typescript:Program"}'>
          <span>{{ program }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle external package imports");
    });

    it("should handle imports from node_modules packages with nested paths", async function () {
      // Test importing from a nested submodule path like yargs/helpers
      // Note: Parser is a namespace, so we use Parser.Arguments which is a type
      const html = `
        <div :types='{"args": "@import:yargs/helpers:Parser.Arguments"}'>
          <span>{{ args }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.equal(diagnostics.length, 0, "Should handle nested paths in external packages");
    });

    it("should detect type errors on external package imports", async function () {
      const html = `
        <div :types='{"program": "@import:typescript:Program"}'>
          <span>{{ program.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      assert.ok(diagnostics.length > 0, "Should detect type errors on external types");
      assert.ok(
        findDiagnostic(diagnostics, "Property 'toUpperCase' does not exist on type 'Program'")
      );
    });

    it("should handle imports from local packages with exports subpaths", async function () {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mancha-type-check-"));
      const htmlPath = path.join(tempDir, "template.html");

      const packageDir = path.join(tempDir, "node_modules", "local-exported-package");
      await fs.mkdir(path.join(packageDir, "dist"), { recursive: true });

      const packageJson = {
        name: "local-exported-package",
        version: "1.0.0",
        type: "module",
        exports: {
          "./preview": {
            types: "./dist/preview.d.ts",
            default: "./dist/preview.js",
          },
        },
      };
      await fs.writeFile(
        path.join(packageDir, "package.json"),
        JSON.stringify(packageJson, null, 2),
        "utf-8"
      );
      await fs.writeFile(
        path.join(packageDir, "dist", "preview.d.ts"),
        `export interface PreviewType { title: string; }\n`,
        "utf-8"
      );
      await fs.writeFile(path.join(packageDir, "dist", "preview.js"), `export {};\n`, "utf-8");

      const html = `
        <div :types='{"preview": "@import:local-exported-package/preview:PreviewType"}'>
          <span>{{ preview.title.toUpperCase() }}</span>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: htmlPath });
      assert.equal(diagnostics.length, 0, "Should handle package exports subpaths");
    });
  });

  describe("DOM API augmentations", () => {
    it("should allow querySelector without null checking", async function () {
      const html = `
        <div :types='{}'>
          <button :on:click="document.querySelector('#myDialog').showModal()">Open</button>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      // Should not error about querySelector potentially being null
      assert.equal(diagnostics.length, 0, "querySelector should not require null checking");
    });

    it("should allow close() on querySelector results", async function () {
      const html = `
        <div :types='{}'>
          <button :on:click="$elem.querySelector('dialog').close()">Close</button>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      // Should not error about close() method
      assert.equal(diagnostics.length, 0, "close() should be available on querySelector results");
    });

    it("should allow showModal() on querySelector results", async function () {
      const html = `
        <div :types='{}'>
          <button :on:click="document.querySelector('.dialog').showModal()">Show</button>
        </div>
      `;
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      // Should not error about showModal() method
      assert.equal(diagnostics.length, 0, "showModal() should be available on querySelector results");
    });
  });

  describe("performance regression tests", () => {
    it("should complete type checking quickly even with imports", async function () {
      const html = `
        <div :types='{"user": "@import:./test_types/user.ts:User"}'>
          <span>{{ user.name.toUpperCase() }}</span>
        </div>
      `;
      const startTime = Date.now();
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const duration = Date.now() - startTime;

      // Type checking should complete in reasonable time (< 5 seconds)
      assert.ok(duration < 5000, `Type checking took ${duration}ms, should be < 5000ms`);
      assert.equal(diagnostics.length, 0);
    });

    it("should handle multiple nested elements efficiently", async function () {
      const html = `
        <div :types='{"users": "@import:./test_types/user.ts:User[]"}'>
          <div :for="user in users">
            <span>{{ user.name }}</span>
            <div :types='{"product": "@import:./test_types/product.ts:Product"}'>
              <span>{{ product.name }}</span>
              <span>{{ user.email }}</span>
            </div>
          </div>
        </div>
      `;
      const startTime = Date.now();
      const diagnostics = await typeCheck(html, { strict: false, filePath: testFilePath });
      const duration = Date.now() - startTime;

      assert.ok(duration < 5000, `Type checking took ${duration}ms, should be < 5000ms`);
      assert.equal(diagnostics.length, 0);
    });
  });
});
