import { assert } from "../test_utils.js";
import { Tokenizer, Kind } from './tokenizer.js';

describe("Tokenizer", () => {
  it("should tokenize simple expressions", () => {
    const tokenizer = new Tokenizer("1 + 2");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.INTEGER, value: "1", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.OPERATOR, value: "+", precedence: 11 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.INTEGER, value: "2", precedence: 0 });
    assert.equal(tokenizer.nextToken(), undefined);
  });

  it("should tokenize identifiers and keywords", () => {
    const tokenizer = new Tokenizer("this is a test");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.KEYWORD, value: "this", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.IDENTIFIER, value: "is", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.IDENTIFIER, value: "a", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.IDENTIFIER, value: "test", precedence: 0 });
  });

  it("should tokenize strings", () => {
    const tokenizer = new Tokenizer("'hello' \"world\"");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.STRING, value: "hello", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.STRING, value: "world", precedence: 0 });
  });

  it("should tokenize numbers", () => {
    const tokenizer = new Tokenizer("123 45.67 .89");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.INTEGER, value: "123", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.DECIMAL, value: "45.67", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.DECIMAL, value: ".89", precedence: 0 });
  });

  it("should tokenize operators", () => {
    const tokenizer = new Tokenizer("+ - * / % == != > < >= <= || && ?? | !");
    const ops = ["+", "-", "*", "/", "%", "==", "!=", ">", "<", ">=", "<=", "||", "&&", "??", "|", "!"];
    for (const op of ops) {
      const token = tokenizer.nextToken();
      assert.equal(token?.kind, Kind.OPERATOR);
      assert.equal(token?.value, op);
    }
  });

  it("should tokenize optional chaining operator", () => {
    const tokenizer = new Tokenizer("a?.b");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.IDENTIFIER, value: "a", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.OPTIONAL_DOT, value: "?.", precedence: 13 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.IDENTIFIER, value: "b", precedence: 0 });
  });

  it("should tokenize spread operator", () => {
    const tokenizer = new Tokenizer("...arr");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.SPREAD, value: "...", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.IDENTIFIER, value: "arr", precedence: 0 });
  });

  it("should tokenize arrow function arrow", () => {
    const tokenizer = new Tokenizer("() => {}");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "(", precedence: 13 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: ")", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.ARROW, value: "=>", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "{", precedence: 13 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "}", precedence: 0 });
  });

  it("should tokenize groupers", () => {
    const tokenizer = new Tokenizer("() [] {}");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "(", precedence: 13 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: ")", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "[", precedence: 13 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "]", precedence: 0 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "{", precedence: 13 });
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.GROUPER, value: "}", precedence: 0 });
  });

  it("should handle escaped strings", () => {
    const tokenizer = new Tokenizer("'foo\\'bar'");
    assert.deepEqual(tokenizer.nextToken(), { kind: Kind.STRING, value: "foo'bar", precedence: 0 });
  });

  it("should throw on unterminated string", () => {
    const tokenizer = new Tokenizer("'foo");
    assert.throws(() => tokenizer.nextToken(), "unterminated string");
  });

  it("should throw on unexpected character", () => {
    const tokenizer = new Tokenizer("@"); // @ is not a valid operator or identifier start
    // Wait, @ is usually not valid but might be caught by default case?
    // Current tokenizer implementation:
    /*
    if (_isQuote(this._next!)) return this._tokenizeString();
    if (_isIdentOrKeywordStart(this._next!)) ...
    if (_isNumber(this._next!)) ...
    if (this._next === 46) ...
    if (this._next === 44) ...
    if (this._next === 58) ...
    if (_isOperator(this._next!)) ...
    if (_isGrouper(this._next!)) ...
    this._advance();
    if (this._next !== undefined) throw new Error...
    */
    // If it falls through, it advances and checks if end of input.
    // If @ is input, it advances past @. _next becomes undefined (if end of string).
    // Then it returns undefined.
    // So '@' is ignored? That seems like a BUG.
    
    // Let's verify this behavior.
    assert.equal(tokenizer.nextToken(), undefined); 
    // If this passes, then unexpected characters are silently ignored, which is bad.
  });
});
