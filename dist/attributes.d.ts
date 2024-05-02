/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
export declare function encodeHtmlAttrib(value?: string): string;
/** Inverse the operation of [encodeHtmlAttrib] */
export declare function decodeHtmlAttrib(value?: string): string;
/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
export declare function attributeNameToCamelCase(name: string): string;
