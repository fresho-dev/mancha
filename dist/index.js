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
exports.Mancha = exports.resolvePath = exports.folderPath = exports.RendererImpl = void 0;
const fs = require("fs/promises");
const core_1 = require("./core");
const worker_1 = require("./worker");
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
class RendererImpl extends worker_1.RendererImpl {
    renderLocalPath(fpath_1) {
        return __awaiter(this, arguments, void 0, function* (fpath, params = { encoding: "utf8" }) {
            const content = yield fs.readFile(fpath, { encoding: params.encoding });
            return this.renderString(content.toString(), {
                fsroot: (0, core_1.folderPath)(fpath),
                // Determine whether a root node is needed based on filename.
                isRoot: params.isRoot || !fpath.endsWith(".tpl.html"),
            });
        });
    }
}
exports.RendererImpl = RendererImpl;
// Re-exports from core.
var core_2 = require("./core");
Object.defineProperty(exports, "folderPath", { enumerable: true, get: function () { return core_2.folderPath; } });
Object.defineProperty(exports, "resolvePath", { enumerable: true, get: function () { return core_2.resolvePath; } });
// Export the renderer instance directly.
exports.Mancha = new RendererImpl();
