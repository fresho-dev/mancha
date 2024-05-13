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
exports.Mancha = exports.RendererImpl = void 0;
const fs = require("fs/promises");
const worker_1 = require("./worker");
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
class RendererImpl extends worker_1.RendererImpl {
    fetchLocal(fpath, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return fs.readFile(fpath, { encoding: (params === null || params === void 0 ? void 0 : params.encoding) || "utf8" });
        });
    }
}
exports.RendererImpl = RendererImpl;
// Export the renderer instance directly.
exports.Mancha = new RendererImpl();
