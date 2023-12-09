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
exports.decodeHtmlAttrib = exports.encodeHtmlAttrib = exports.renderRemotePath = exports.folderPath = exports.resolvePath = exports.preprocess = exports.renderContent = exports.renderLocalPath = void 0;
const fs = require("fs/promises");
const web_1 = require("./web");
function renderLocalPath(fpath, vars = {}, encoding = "utf8") {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield fs.readFile(fpath, { encoding: encoding });
        return renderContent(content, vars, (0, web_1.folderPath)(fpath));
    });
}
exports.renderLocalPath = renderLocalPath;
function renderContent(content, vars = {}, fsroot = null, maxdepth = 10) {
    return __awaiter(this, void 0, void 0, function* () {
        fsroot = fsroot || ".";
        return (0, web_1.renderContent)(content, vars, fsroot, maxdepth, renderLocalPath);
    });
}
exports.renderContent = renderContent;
// Re-exports from web.
var web_2 = require("./web");
Object.defineProperty(exports, "preprocess", { enumerable: true, get: function () { return web_2.preprocess; } });
Object.defineProperty(exports, "resolvePath", { enumerable: true, get: function () { return web_2.resolvePath; } });
Object.defineProperty(exports, "folderPath", { enumerable: true, get: function () { return web_2.folderPath; } });
Object.defineProperty(exports, "renderRemotePath", { enumerable: true, get: function () { return web_2.renderRemotePath; } });
Object.defineProperty(exports, "encodeHtmlAttrib", { enumerable: true, get: function () { return web_2.encodeHtmlAttrib; } });
Object.defineProperty(exports, "decodeHtmlAttrib", { enumerable: true, get: function () { return web_2.decodeHtmlAttrib; } });
