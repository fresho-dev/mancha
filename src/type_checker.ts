import * as ts from "typescript";
import * as fs from "fs/promises";
import * as path from "path";
import { JSDOM } from "jsdom";
import * as jexpr from "jexpr";
import { getAttributeOrDataset } from "./dome.js";
import { TRUSTED_DATA_ATTRIBS } from "./trusted_attributes.js";

export interface TypeCheckOptions {
  strict: boolean;
  filePath?: string; // Optional path to the HTML file being checked (for correct module resolution)
}

async function getDiagnostics(
  content: string,
  options: TypeCheckOptions
): Promise<ts.Diagnostic[]> {
  // Create temp file in the same directory as the HTML file (or cwd if no filePath)
  // This allows TypeScript's module resolution to find node_modules properly
  const baseDir = options.filePath ? path.dirname(path.resolve(options.filePath)) : process.cwd();
  const tempFilePath = path.join(
    baseDir,
    `temp_type_check_${Math.random().toString(36).substring(2, 15)}.ts`
  );

  await fs.writeFile(tempFilePath, content);

  try {
    const compilerOptions: ts.CompilerOptions = {
      noEmit: true,
      strict: options.strict,
      strictNullChecks: options.strict,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: baseDir,
      lib: ["lib.es2022.full.d.ts", "lib.dom.d.ts"],
      skipLibCheck: true,
      skipDefaultLibCheck: false,
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true,
    };

    const host = ts.createCompilerHost(compilerOptions);
    const program = ts.createProgram([tempFilePath], compilerOptions, host);

    const allDiagnostics = ts.getPreEmitDiagnostics(program);

    // Filter out irrelevant diagnostics (keep semantic errors 2000-2999 and strict mode errors 18000-18999)
    return allDiagnostics.filter(
      (d) => (d.code >= 2000 && d.code < 3000) || (d.code >= 18000 && d.code < 19000)
    );
  } finally {
    await fs.unlink(tempFilePath);
  }
}

const AST_FACTORY = new jexpr.EvalAstFactory();

interface SourceRange {
  start: number;
  length: number;
}

function parseWithJexpr(expression: string) {
  const ast = jexpr.parse(expression, AST_FACTORY);
  if (!ast) {
    throw new Error(`Failed to parse expression "${expression}" with jexpr`);
  }
  return ast;
}

// Structure to represent a scope of expressions, potentially with nested for loops
interface AttributeExpressionSource {
  kind: "attribute";
  element: Element;
  attributeName: string;
  attributeKind: "default" | "for-items";
}

interface TextExpressionSource {
  kind: "text";
  node: Text;
}

type ExpressionSource = AttributeExpressionSource | TextExpressionSource;

interface ExpressionEntry {
  expression: string;
  source: ExpressionSource;
  range?: SourceRange;
}

interface ExpressionScope {
  expressions: ExpressionEntry[];
  forLoops: Array<{
    itemName: string;
    itemsExpression: ExpressionEntry;
    scope: ExpressionScope;
  }>;
}
// Replace @import:MODULE_PATH:TYPE_NAME with import("MODULE_PATH").TYPE_NAME
// and resolve relative paths to absolute paths
function replaceImportSyntax(typeString: string, baseDir?: string): string {
  return typeString.replace(/@import:([^:]+):([A-Za-z_][A-Za-z0-9_]*)/g, (match, modulePath, typeName) => {
    // If baseDir is provided and the path is relative, resolve it to an absolute path
    if (baseDir && (modulePath.startsWith('./') || modulePath.startsWith('../'))) {
      const absolutePath = path.resolve(baseDir, modulePath);
      return `import("${absolutePath}").${typeName}`;
    }
    return `import("${modulePath}").${typeName}`;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensurePlainObject(value: unknown, context: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(`${context} must evaluate to an object`);
  }
  return value;
}

function descriptorToTypeScript(descriptor: unknown, baseDir: string | undefined, key: string): string {
  if (typeof descriptor !== "string") {
    const description =
      typeof descriptor === "object" && descriptor !== null
        ? JSON.stringify(descriptor)
        : String(descriptor);
    throw new Error(`Type for "${key}" must be a string, received ${description}`);
  }

  return replaceImportSyntax(descriptor, baseDir);
}

function parseTypesAttribute(raw: string, baseDir: string | undefined): Map<string, string> {
  const ast = parseWithJexpr(raw);
  const value = ast.evaluate({});
  const typeObject = ensurePlainObject(value, ":types expression");

  const result = new Map<string, string>();
  for (const [name, descriptor] of Object.entries(typeObject)) {
    result.set(name, descriptorToTypeScript(descriptor, baseDir, name));
  }
  return result;
}

function buildTypeScriptSource(
  types: Map<string, string>,
  scope: ExpressionScope,
  baseDir?: string
): { source: string; expressionMap: Map<number, ExpressionEntry> } {
  const namespace = `M`; // Use a constant namespace

  // Add reference directive for DOM lib
  const libDirectives = `/// <reference lib="dom" />\n/// <reference lib="es2021" />`;

  // Default mancha-specific globals available in all templates
  const defaultGlobals = [
    "declare const $elem: Element;",
    "declare const $event: Event;",
  ].join("\n");

  // Apply import syntax transformation to all type values
  const declarations = Array.from(types.entries())
    .map(([key, value]) => {
      const resolvedType = replaceImportSyntax(value, baseDir);
      return `declare let ${key}: ${resolvedType};`;
    })
    .join("\n");

  // Global augmentations
  const globalAugmentations = [
    "interface TemplateElement extends Element {",
    "  close(): void;",
    "  showModal(): void;",
    "}",
    "",
    "interface Element {",
    "  querySelector<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K];",
    "  querySelector(selector: string): TemplateElement;",
    "}",
    "",
    "interface Document {",
    "  querySelector<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K];",
    "  querySelector(selector: string): TemplateElement;",
    "}",
  ].join("\n");

  const prefix = `${libDirectives}\n${globalAugmentations}\nnamespace ${namespace} {\n${defaultGlobals}\n${declarations}\n`;
  const suffix = `\n}`;
  const expressionMap = new Map<number, ExpressionEntry>();
  let currentOffset = prefix.length;

  // Recursively build checks from scope
  const buildChecks = (currentScope: ExpressionScope, indent: string = ""): string => {
    let result = "";

    // Add expressions in current scope
    for (const entry of currentScope.expressions) {
      const expressionPrefix = `${indent}(`;
      const code = `${expressionPrefix}${entry.expression});\n`;
      expressionMap.set(currentOffset + expressionPrefix.length, entry);
      result += code;
      currentOffset += code.length;
    }

    // Add for loops with their nested scopes
    for (const forLoop of currentScope.forLoops) {
      const expressionPrefix = `${indent}for (const ${forLoop.itemName} of (`;
      const forLoopHeader = `${expressionPrefix}${forLoop.itemsExpression.expression})) {\n`;
      expressionMap.set(currentOffset + expressionPrefix.length, forLoop.itemsExpression);

      result += forLoopHeader;
      currentOffset += forLoopHeader.length;

      result += buildChecks(forLoop.scope, indent + "  ");

      const closingBrace = `${indent}}\n`;
      result += closingBrace;
      currentOffset += closingBrace.length;
    }

    return result;
  };

  const checks = buildChecks(scope);
  const source = `${prefix}${checks}${suffix}`;
  return { source, expressionMap };
}

function getAttributeValueRange(
  element: Element,
  attributeName: string,
  attrValue: string,
  valueSubstring: string,
  dom: JSDOM,
  html: string,
  valueOffsetInAttrValue?: number
): SourceRange | undefined {
  const elementLocation = dom.nodeLocation(element) as any;
  if (!elementLocation) return undefined;

  const attrLocation = elementLocation?.attrs?.[attributeName];
  if (!attrLocation) return undefined;

  const attrText = html.slice(attrLocation.startOffset, attrLocation.endOffset);
  const equalsIndex = attrText.indexOf("=");

  if (equalsIndex === -1) {
    return { start: attrLocation.startOffset, length: attrLocation.endOffset - attrLocation.startOffset };
  }

  let cursor = equalsIndex + 1;
  while (cursor < attrText.length && /\s/.test(attrText[cursor]!)) {
    cursor++;
  }

  let baseOffset = cursor;
  if (cursor < attrText.length && (attrText[cursor] === '"' || attrText[cursor] === "'")) {
    baseOffset = cursor + 1;
  }

  let offsetWithinValue = valueOffsetInAttrValue;
  if (offsetWithinValue == null || offsetWithinValue < 0) {
    offsetWithinValue = attrValue.indexOf(valueSubstring);
    if (offsetWithinValue < 0) {
      offsetWithinValue = attrValue.trimStart().indexOf(valueSubstring);
      if (offsetWithinValue < 0) {
        offsetWithinValue = 0;
      } else {
        offsetWithinValue += attrValue.length - attrValue.trimStart().length;
      }
    }
  }

  const start = attrLocation.startOffset + baseOffset + offsetWithinValue;
  return { start, length: valueSubstring.length };
}

function getTextExpressionRange(
  textNode: Text,
  match: RegExpMatchArray,
  trimmedExpression: string,
  dom: JSDOM
): SourceRange | undefined {
  const location = dom.nodeLocation(textNode) as any;
  if (!location) return undefined;

  const rawExpression = match[1] ?? "";
  const leadingWhitespace = rawExpression.length - rawExpression.trimStart().length;
  const start = location.startOffset + (match.index ?? 0) + 2 + leadingWhitespace;
  return { start, length: trimmedExpression.length };
}

// Helper to check if an element is nested within another :types element
function hasTypesAncestor(element: Element): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (getAttributeOrDataset(parent, "types", ":")) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

// Compute type of for-loop variable based on the items expression
function computeForLoopVariableType(itemsType: string): string {
  // Handle array types: string[] -> string, Array<T> -> T
  if (itemsType.endsWith("[]")) {
    return itemsType.slice(0, -2);
  }
  if (itemsType.match(/^Array<(.+)>$/)) {
    return itemsType.match(/^Array<(.+)>$/)![1];
  }
  // For complex types, try to infer element type
  // This is a simple heuristic - for more complex cases, TypeScript would need to resolve the type
  return "any";
}

// Find for-loop ancestors of an element and compute their variable types
function getForLoopContext(element: Element, typesMap: Map<string, string>): Map<string, string> {
  const forLoopTypes = new Map<string, string>();
  let current: Element | null = element.parentElement;

  while (current) {
    const forAttr = getAttributeOrDataset(current, "for", ":");
    if (forAttr) {
      const parts = forAttr.split(" in ");
      const itemName = parts[0].trim();
      const itemsExpression = parts[1].trim();

      // Try to determine the type of the items expression
      // First check if it's a simple variable name in our types map
      if (typesMap.has(itemsExpression)) {
        const itemsType = typesMap.get(itemsExpression)!;
        const itemType = computeForLoopVariableType(itemsType);
        forLoopTypes.set(itemName, itemType);
      } else if (forLoopTypes.has(itemsExpression)) {
        // Check if it's a for-loop variable from an outer loop (for shadowing)
        const itemsType = forLoopTypes.get(itemsExpression)!;
        const itemType = computeForLoopVariableType(itemsType);
        forLoopTypes.set(itemName, itemType);
      } else {
        // Try to infer from more complex expressions like user.scores
        // For now, use a simple heuristic
        const match = itemsExpression.match(/^(\w+)\.(\w+)$/);
        if (match && forLoopTypes.has(match[1])) {
          // e.g., user.scores where user is already in forLoopTypes
          const parentType = forLoopTypes.get(match[1])!;
          const propertyName = match[2];
          // Extract property type from parent type (simple heuristic)
          const propMatch = parentType.match(new RegExp(`${propertyName}:\\s*([^,}]+)`));
          if (propMatch) {
            const propType = propMatch[1].trim();
            const itemType = computeForLoopVariableType(propType);
            forLoopTypes.set(itemName, itemType);
          }
        }
      }
    }

    // Stop if we hit a :types boundary (don't cross into parent :types scopes)
    if (current !== element && getAttributeOrDataset(current, "types", ":")) {
      break;
    }

    current = current.parentElement;
  }

  return forLoopTypes;
}

// Recursively process a :types element and its nested :types descendants
async function processTypesElement(
  element: Element,
  parentTypes: Map<string, string>,
  options: TypeCheckOptions,
  processedElements: Set<Element>,
  dom: JSDOM,
  html: string,
  htmlSourceFile: ts.SourceFile
): Promise<ts.Diagnostic[]> {
  // Skip if already processed
  if (processedElements.has(element)) {
    return [];
  }
  processedElements.add(element);

  const allDiagnostics: ts.Diagnostic[] = [];
  const typesAttr = getAttributeOrDataset(element, "types", ":");
  if (!typesAttr) return allDiagnostics;

  const baseDir = options.filePath ? path.dirname(path.resolve(options.filePath)) : undefined;
  const typesAttrName = element.hasAttribute(":types") ? ":types" : "data-types";

  try {
    // Parse types for this element
    const elementTypes = parseTypesAttribute(typesAttr, baseDir);

    // Merge with parent types (element types override parent types)
    const mergedTypes = new Map([...parentTypes, ...elementTypes]);

    // Get expressions for this element (excluding nested :types descendants)
    const scope = getExpressionsExcludingNestedTypes(element, dom, html);

    const jexprDiagnostics = validateExpressionsWithJexpr(scope, htmlSourceFile);
    allDiagnostics.push(...jexprDiagnostics);

    // Type check expressions in this scope
    const { source, expressionMap } = buildTypeScriptSource(mergedTypes, scope, baseDir);
    const rawDiagnostics = await getDiagnostics(source, options);

    // Remap diagnostics to original source locations
    for (const diag of rawDiagnostics) {
      if (diag.start === undefined) {
        allDiagnostics.push(diag);
        continue;
      }

      let bestMatch: { offset: number; entry: ExpressionEntry } | undefined;
      for (const [offset, entry] of expressionMap.entries()) {
        if (offset <= diag.start) {
          if (!bestMatch || offset > bestMatch.offset) {
            bestMatch = { offset, entry };
          }
        }
      }

      if (bestMatch && bestMatch.entry.range) {
        const { range } = bestMatch.entry; // HTML range of the full expression
        const tsOffsetInGeneratedCode = diag.start - bestMatch.offset; // Offset of the error within the generated `(expression);`
        
        // Adjust the HTML start and length based on the offset within the generated code
        const newStart = range.start + tsOffsetInGeneratedCode;
        const newLength = diag.length; // The length from TS diagnostic is usually correct for the error part

        allDiagnostics.push({
          ...diag,
          file: htmlSourceFile,
          start: newStart,
          length: newLength,
        });
      } else {
        allDiagnostics.push(diag);
      }
    }

    // Find and process nested :types elements
    const nestedTypesElements = findDirectNestedTypesElements(element);
    for (const nestedElement of nestedTypesElements) {
      // Compute for-loop context for the nested element
      const forLoopContext = getForLoopContext(nestedElement, mergedTypes);

      // Merge for-loop variables with parent types (for-loop variables take precedence)
      const nestedParentTypes = new Map([...mergedTypes, ...forLoopContext]);

      const nestedDiagnostics = await processTypesElement(
        nestedElement,
        nestedParentTypes,
        options,
        processedElements,
        dom,
        html,
        htmlSourceFile
      );
      allDiagnostics.push(...nestedDiagnostics);
    }
  } catch (error) {
    const tagName = element.tagName?.toLowerCase() ?? "element";
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
    const attrRange = getAttributeValueRange(
      element,
      typesAttrName,
      typesAttr,
      typesAttr,
      dom,
      html,
      0
    );

    allDiagnostics.push({
      file: attrRange ? htmlSourceFile : undefined,
      start: attrRange?.start,
      length: attrRange?.length,
      category: ts.DiagnosticCategory.Error,
      code: 91001,
      source: "mancha-type-checker",
      messageText: `Failed to evaluate :types on <${tagName}>: ${message}`,
    });
  }

  return allDiagnostics;
}

// Find nested :types elements that are direct descendants (not grandchildren through other :types)
const TRUSTED_DATA_ATTRIBUTE_SET = new Set(
  TRUSTED_DATA_ATTRIBS.map((attr) => attr.toLowerCase())
);

function findDirectNestedTypesElements(element: Element): Element[] {
  const result: Element[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, 1); // 1 = SHOW_ELEMENT

  while (walker.nextNode()) {
    const node = walker.currentNode as Element;
    if (node === element) continue;

    const typesAttr = getAttributeOrDataset(node, "types", ":");
    if (typesAttr) {
      // Check if this is a direct nested :types (not nested within another :types first)
      let parent = node.parentElement;
      let foundIntermediateTypes = false;
      while (parent && parent !== element) {
        if (getAttributeOrDataset(parent, "types", ":")) {
          foundIntermediateTypes = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!foundIntermediateTypes) {
        result.push(node);
      }
    }
  }
  return result;
}

function isExpressionAttribute(attrName: string): boolean {
  const normalized = attrName.toLowerCase();

  if (normalized === ":types" || normalized === "data-types") {
    return false;
  }

  if (normalized.startsWith(":")) {
    return true;
  }

  if (!normalized.startsWith("data-")) {
    return false;
  }

  return TRUSTED_DATA_ATTRIBUTE_SET.has(normalized);
}

// Get expressions excluding those in nested :types elements
function getExpressionsExcludingNestedTypes(root: Element, dom: JSDOM, html: string): ExpressionScope {
  const scope: ExpressionScope = { expressions: [], forLoops: [] };
  const processedForElements = new Set<Element>();

  const processElement = (element: Element, currentScope: ExpressionScope) => {
    // Stop if we encounter a nested :types element
    if (element !== root && getAttributeOrDataset(element, "types", ":")) {
      return;
    }

    // Check if this element has a :for attribute
    const forAttr = getAttributeOrDataset(element, "for", ":");
    if (forAttr) {
      if (processedForElements.has(element)) return;
      processedForElements.add(element);

      const parts = forAttr.split(" in ");
      const itemName = parts[0].trim();
      const itemsExpression = parts[1].trim();
      const attributeName = element.hasAttribute(":for")
        ? ":for"
        : element.hasAttribute("data-for")
          ? "data-for"
          : ":for";
      const attr = element.getAttributeNode(attributeName);
      const attrValue = attr?.value ?? "";
      const valueIndex = attrValue.lastIndexOf(itemsExpression);

      const itemsExpressionEntry: ExpressionEntry = {
        expression: itemsExpression,
        source: {
          kind: "attribute",
          element,
          attributeName,
          attributeKind: "for-items",
        },
        range: getAttributeValueRange(
          element,
          attributeName,
          attrValue,
          itemsExpression,
          dom,
          html,
          valueIndex
        ),
      };

      currentScope.expressions.push(itemsExpressionEntry);

      const forScope: ExpressionScope = { expressions: [], forLoops: [] };
      processDescendants(element, forScope);
      currentScope.forLoops.push({ itemName, itemsExpression: itemsExpressionEntry, scope: forScope });
    } else {
      // Process attributes
      for (const attr of Array.from(element.attributes)) {
        if (isExpressionAttribute(attr.name)) {
          currentScope.expressions.push({
            expression: attr.value,
            source: {
              kind: "attribute",
              element,
              attributeName: attr.name,
              attributeKind: "default",
            },
            range: getAttributeValueRange(
              element,
              attr.name,
              attr.value,
              attr.value,
              dom,
              html,
              0
            ),
          });
        }
      }

      // Process children
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === 1) {
          processElement(child as Element, currentScope);
        } else if (child.nodeType === 3) {
          processTextNode(child as Text, currentScope);
        }
      }
    }
  };

  const processDescendants = (element: Element, currentScope: ExpressionScope) => {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 1) {
        processElement(child as Element, currentScope);
      } else if (child.nodeType === 3) {
        processTextNode(child as Text, currentScope);
      }
    }
  };

  const processTextNode = (textNode: Text, currentScope: ExpressionScope) => {
    const text = textNode.nodeValue;
    if (text) {
      const matches = text.matchAll(/{{(.*?)}}/g);
      for (const match of matches) {
        const trimmedExpression = match[1]?.trim() ?? "";
        if (!trimmedExpression) continue;
        currentScope.expressions.push({
          expression: trimmedExpression,
          source: { kind: "text", node: textNode },
          range: getTextExpressionRange(textNode, match, trimmedExpression, dom),
        });
      }
    }
  };

  // Start processing from root
  processElement(root, scope);

  return scope;
}

function collectExpressions(scope: ExpressionScope, result: ExpressionEntry[] = []): ExpressionEntry[] {
  for (const entry of scope.expressions) {
    result.push(entry);
  }
  for (const loop of scope.forLoops) {
    result.push(loop.itemsExpression);
    collectExpressions(loop.scope, result);
  }
  return result;
}

function describeExpressionSource(source: ExpressionSource): string {
  if (source.kind === "attribute") {
    const tagName = source.element.tagName?.toLowerCase() ?? "element";
    if (source.attributeKind === "for-items") {
      return `:for items expression on <${tagName}>`;
    }
    return `attribute "${source.attributeName}" on <${tagName}>`;
  }

  const parentTag = source.node.parentElement?.tagName?.toLowerCase();
  if (parentTag) {
    return `text interpolation inside <${parentTag}>`;
  }
  return "text interpolation";
}

function createJexprDiagnostic(
  entry: ExpressionEntry,
  error: unknown,
  htmlSourceFile: ts.SourceFile
): ts.Diagnostic {
  const expressionPreview = entry.expression.trim() || entry.expression;
  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  const message = `Unsupported expression for jexpr (${expressionPreview}) in ${describeExpressionSource(entry.source)}: ${errorMessage}`;
  return {
    file: entry.range ? htmlSourceFile : undefined,
    start: entry.range?.start,
    length: entry.range?.length,
    category: ts.DiagnosticCategory.Error,
    code: 91002,
    source: "mancha-type-checker",
    messageText: message,
  };
}

function validateExpressionsWithJexpr(scope: ExpressionScope, htmlSourceFile: ts.SourceFile): ts.Diagnostic[] {
  const diagnostics: ts.Diagnostic[] = [];
  const expressions = collectExpressions(scope);

  for (const entry of expressions) {
    const candidate = entry.expression.trim();
    if (!candidate) continue;
    try {
      parseWithJexpr(candidate);
    } catch (error) {
      diagnostics.push(createJexprDiagnostic(entry, error, htmlSourceFile));
    }
  }

  return diagnostics;
}

export async function typeCheck(html: string, options: TypeCheckOptions): Promise<ts.Diagnostic[]> {
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const htmlSourceFile = ts.createSourceFile(
    options.filePath ?? "template.html",
    html,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.Unknown
  );

  const allTypeNodes = dom.window.document.querySelectorAll("[\\:types], [data-types]");

  const allDiagnostics: ts.Diagnostic[] = [];
  const processedElements = new Set<Element>();

  // Find top-level :types elements (not nested within other :types)
  const topLevelTypeNodes = Array.from(allTypeNodes).filter((node) => !hasTypesAncestor(node));

  // Process each top-level :types element and its nested descendants
  for (const node of topLevelTypeNodes) {
    const diagnostics = await processTypesElement(
      node,
      new Map(),
      options,
      processedElements,
      dom,
      html,
      htmlSourceFile
    );
    allDiagnostics.push(...diagnostics);
  }

  const documentRoot =
    dom.window.document.documentElement ??
    dom.window.document.body ??
    (dom.window.document.firstElementChild as Element | null);

  if (documentRoot) {
    const globalScope = getExpressionsExcludingNestedTypes(documentRoot, dom, html);
    const globalJexprDiagnostics = validateExpressionsWithJexpr(globalScope, htmlSourceFile);
    allDiagnostics.push(...globalJexprDiagnostics);
  }

  return allDiagnostics;
}
