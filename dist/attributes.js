"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attributeNameToCamelCase = void 0;
/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
function attributeNameToCamelCase(name) {
    return name.replace(/-./g, (c) => c[1].toUpperCase());
}
exports.attributeNameToCamelCase = attributeNameToCamelCase;
