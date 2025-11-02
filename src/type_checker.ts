import * as ts from "typescript";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { JSDOM } from "jsdom";
import { getAttributeOrDataset } from "./dome.js";

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

  const compilerOptions: ts.CompilerOptions = {
    noEmit: true,
    strict: options.strict,
    strictNullChecks: options.strict,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: baseDir,
    lib: ["ES2022", "DOM"],
    skipLibCheck: true,
    skipDefaultLibCheck: false,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    allowSyntheticDefaultImports: true,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram([tempFilePath], compilerOptions, host);

  const allDiagnostics = ts.getPreEmitDiagnostics(program);

  await fs.unlink(tempFilePath);

  // Filter out irrelevant diagnostics (keep semantic errors 2000-2999 and strict mode errors 18000-18999)
  return allDiagnostics.filter(
    (d) => (d.code >= 2000 && d.code < 3000) || (d.code >= 18000 && d.code < 19000)
  );
}

// Structure to represent a scope of expressions, potentially with nested for loops
interface ExpressionScope {
  expressions: string[];
  forLoops: Array<{
    itemName: string;
    itemsExpression: string;
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

function buildTypeScriptSource(types: Map<string, string>, scope: ExpressionScope, baseDir?: string): string {
  const namespace = `M${Math.random().toString(36).substring(2, 15)}`;

  // Add reference directive for DOM lib
  const libDirectives = `/// <reference lib="dom" />\n/// <reference lib="es2021" />`;

  // Default mancha-specific globals available in all templates
  // (Standard browser globals like document, window, prompt come from DOM lib)
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

  // Recursively build checks from scope
  const buildChecks = (currentScope: ExpressionScope, indent: string = ""): string => {
    let result = "";

    // Add expressions in current scope
    for (const expr of currentScope.expressions) {
      result += `${indent}(${expr});\n`;
    }

    // Add for loops with their nested scopes
    for (const forLoop of currentScope.forLoops) {
      result += `${indent}for (const ${forLoop.itemName} of ${forLoop.itemsExpression}) {\n`;
      result += buildChecks(forLoop.scope, indent + "  ");
      result += `${indent}}\n`;
    }

    return result;
  };

  const checks = buildChecks(scope);

  // Global augmentations are necessary because jexpr (mancha's expression parser) doesn't support:
  // - Type assertions (as HTMLDialogElement)
  // - Optional chaining (?.)
  // - Null checking (if statements)
  // So we augment querySelector to return non-null with dialog methods
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

  return `${libDirectives}\n${globalAugmentations}\nnamespace ${namespace} {\n${defaultGlobals}\n${declarations}\n${checks}}`;
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
  processedElements: Set<Element>
): Promise<ts.Diagnostic[]> {
  // Skip if already processed
  if (processedElements.has(element)) {
    return [];
  }
  processedElements.add(element);

  const allDiagnostics: ts.Diagnostic[] = [];
  const typesAttr = getAttributeOrDataset(element, "types", ":");
  if (!typesAttr) return allDiagnostics;

  try {
    // Parse types for this element
    const elementTypes = new Map(
      Object.entries(JSON.parse(typesAttr) as { [key: string]: string })
    );

    // Merge with parent types (element types override parent types)
    const mergedTypes = new Map([...parentTypes, ...elementTypes]);

    // Get expressions for this element (excluding nested :types descendants)
    const expressions = getExpressionsExcludingNestedTypes(element);

    // Type check expressions in this scope
    const baseDir = options.filePath ? path.dirname(path.resolve(options.filePath)) : undefined;
    const source = buildTypeScriptSource(mergedTypes, expressions, baseDir);
    const diagnostics = await getDiagnostics(source, options);
    allDiagnostics.push(...diagnostics);

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
        processedElements
      );
      allDiagnostics.push(...nestedDiagnostics);
    }
  } catch (e) {
    console.error("Error parsing :types attribute:", e);
  }

  return allDiagnostics;
}

// Find nested :types elements that are direct descendants (not grandchildren through other :types)
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

// Get expressions excluding those in nested :types elements
function getExpressionsExcludingNestedTypes(root: Element): ExpressionScope {
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

      currentScope.expressions.push(itemsExpression);

      const forScope: ExpressionScope = { expressions: [], forLoops: [] };
      processDescendants(element, forScope);
      currentScope.forLoops.push({ itemName, itemsExpression, scope: forScope });
    } else {
      // Process attributes
      for (const attr of Array.from(element.attributes)) {
        if (
          (attr.name.startsWith(":") || attr.name.startsWith("data-")) &&
          attr.name !== ":types" &&
          attr.name !== "data-types"
        ) {
          currentScope.expressions.push(attr.value);
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
        currentScope.expressions.push(match[1].trim());
      }
    }
  };

  // Start processing from root's children
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === 1) {
      processElement(child as Element, scope);
    } else if (child.nodeType === 3) {
      processTextNode(child as Text, scope);
    }
  }

  return scope;
}

export async function typeCheck(html: string, options: TypeCheckOptions): Promise<ts.Diagnostic[]> {
  const dom = new JSDOM(html);

  const allTypeNodes = dom.window.document.querySelectorAll("[\\:types], [data-types]");

  const allDiagnostics: ts.Diagnostic[] = [];
  const processedElements = new Set<Element>();

  // Find top-level :types elements (not nested within other :types)
  const topLevelTypeNodes = Array.from(allTypeNodes).filter((node) => !hasTypesAncestor(node));

  // Process each top-level :types element and its nested descendants
  for (const node of topLevelTypeNodes) {
    const diagnostics = await processTypesElement(node, new Map(), options, processedElements);
    allDiagnostics.push(...diagnostics);
  }

  return allDiagnostics;
}
