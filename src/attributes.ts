/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
export function encodeHtmlAttrib(value?: string) {
  return (
    value
      ?.replace(/&/g, "&amp;")
      ?.replace(/'/g, "&apos;")
      ?.replace(/"/g, "&quot;")
      ?.replace(/</g, "&lt;")
      ?.replace(/>/g, "&gt;")
      ?.replace(/\r\n/g, "&#13;")
      ?.replace(/[\r\n]/g, "&#13;") ?? ""
  );
}

/** Inverse the operation of [encodeHtmlAttrib] */
export function decodeHtmlAttrib(value?: string) {
  return (
    value
      ?.replace(/&amp;/g, "&")
      ?.replace(/&apos;/g, "'")
      ?.replace(/&quot;/g, '"')
      ?.replace(/&lt;/g, "<")
      ?.replace(/&gt;/g, ">")
      ?.replace(/&#13;/g, "\n") ?? ""
  );
}

/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
export function attributeNameToCamelCase(name: string): string {
  return name.replace(/-./g, (c) => c[1].toUpperCase());
}
