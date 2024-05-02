"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attributeNameToCamelCase = exports.decodeHtmlAttrib = exports.encodeHtmlAttrib = void 0;
/**
 * Helper function used to escape HTML attribute values.
 * See: https://stackoverflow.com/a/9756789
 */
function encodeHtmlAttrib(value) {
    var _a, _b, _c, _d, _e, _f, _g;
    return ((_g = (_f = (_e = (_d = (_c = (_b = (_a = value === null || value === void 0 ? void 0 : value.replace(/&/g, "&amp;")) === null || _a === void 0 ? void 0 : _a.replace(/'/g, "&apos;")) === null || _b === void 0 ? void 0 : _b.replace(/"/g, "&quot;")) === null || _c === void 0 ? void 0 : _c.replace(/</g, "&lt;")) === null || _d === void 0 ? void 0 : _d.replace(/>/g, "&gt;")) === null || _e === void 0 ? void 0 : _e.replace(/\r\n/g, "&#13;")) === null || _f === void 0 ? void 0 : _f.replace(/[\r\n]/g, "&#13;")) !== null && _g !== void 0 ? _g : "");
}
exports.encodeHtmlAttrib = encodeHtmlAttrib;
/** Inverse the operation of [encodeHtmlAttrib] */
function decodeHtmlAttrib(value) {
    var _a, _b, _c, _d, _e, _f;
    return ((_f = (_e = (_d = (_c = (_b = (_a = value === null || value === void 0 ? void 0 : value.replace(/&amp;/g, "&")) === null || _a === void 0 ? void 0 : _a.replace(/&apos;/g, "'")) === null || _b === void 0 ? void 0 : _b.replace(/&quot;/g, '"')) === null || _c === void 0 ? void 0 : _c.replace(/&lt;/g, "<")) === null || _d === void 0 ? void 0 : _d.replace(/&gt;/g, ">")) === null || _e === void 0 ? void 0 : _e.replace(/&#13;/g, "\n")) !== null && _f !== void 0 ? _f : "");
}
exports.decodeHtmlAttrib = decodeHtmlAttrib;
/**
 * Converts from an attribute name to camelCase, e.g. `foo-bar` becomes `fooBar`.
 * @param name attribute name
 * @returns camel-cased attribute name
 */
function attributeNameToCamelCase(name) {
    return name.replace(/-./g, (c) => c[1].toUpperCase());
}
exports.attributeNameToCamelCase = attributeNameToCamelCase;
