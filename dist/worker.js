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
exports.Mancha = exports.decodeHtmlAttrib = exports.encodeHtmlAttrib = exports.resolvePath = exports.folderPath = exports.preprocess = exports.RendererImpl = void 0;
const htmlparser2 = require("htmlparser2");
const dom_serializer_1 = require("dom-serializer");
const core_1 = require("./core");
class RendererImpl extends core_1.IRenderer {
    parseDocument(content) {
        return htmlparser2.parseDocument(content);
    }
    serializeDocument(document) {
        return (0, dom_serializer_1.render)(document);
    }
    replaceNodeWith(original, replacement) {
        const elem = original;
        const parent = elem.parentNode;
        const index = Array.from(parent.childNodes).indexOf(elem);
        replacement.forEach((elem) => (elem.parentNode = parent));
        parent.childNodes = []
            .concat(Array.from(parent.childNodes).slice(0, index))
            .concat(replacement)
            .concat(Array.from(parent.childNodes).slice(index + 1));
    }
    renderLocalPath(fpath_1) {
        return __awaiter(this, arguments, void 0, function* (fpath, vars = {}, encoding = "utf8") {
            throw new Error("Not implemented.");
        });
    }
}
exports.RendererImpl = RendererImpl;
// Re-exports from web.
var core_2 = require("./core");
Object.defineProperty(exports, "preprocess", { enumerable: true, get: function () { return core_2.preprocess; } });
Object.defineProperty(exports, "folderPath", { enumerable: true, get: function () { return core_2.folderPath; } });
Object.defineProperty(exports, "resolvePath", { enumerable: true, get: function () { return core_2.resolvePath; } });
Object.defineProperty(exports, "encodeHtmlAttrib", { enumerable: true, get: function () { return core_2.encodeHtmlAttrib; } });
Object.defineProperty(exports, "decodeHtmlAttrib", { enumerable: true, get: function () { return core_2.decodeHtmlAttrib; } });
// Export the renderer instance directly.
exports.Mancha = new RendererImpl();
