"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mancha = exports.RendererImpl = void 0;
const fs = require("fs/promises");
const worker_1 = require("./worker");
/** The Node Mancha renderer is just like the worker renderer, but it also uses the filesystem. */
class RendererImpl extends worker_1.RendererImpl {
    async fetchLocal(fpath, params) {
        return fs.readFile(fpath, { encoding: params?.encoding || "utf8" });
    }
}
exports.RendererImpl = RendererImpl;
// Export the renderer instance directly.
exports.Mancha = new RendererImpl();
