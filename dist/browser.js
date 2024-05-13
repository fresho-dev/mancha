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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
class RendererImpl extends core_1.IRenderer {
    constructor() {
        super(...arguments);
        this.dirpath = (0, core_1.dirname)(self.location.href);
    }
    parseHTML(content, params = { root: false }) {
        if (params.root) {
            return new DOMParser().parseFromString(content, "text/html");
        }
        else {
            const range = document.createRange();
            range.selectNodeContents(document.body);
            return range.createContextualFragment(content);
        }
    }
    serializeHTML(root) {
        return new XMLSerializer().serializeToString(root).replace(/\s?xmlns="[^"]+"/gm, "");
    }
    preprocessLocal(fpath, params) {
        // In the browser, "local" paths (i.e., relative) can still be fetched.
        return this.preprocessRemote(fpath, params);
    }
}
const Mancha = new RendererImpl();
self["Mancha"] = Mancha;
const currentScript = (_a = self.document) === null || _a === void 0 ? void 0 : _a.currentScript;
if ((_c = (_b = self.document) === null || _b === void 0 ? void 0 : _b.currentScript) === null || _c === void 0 ? void 0 : _c.hasAttribute("init")) {
    Mancha.update(Object.assign({}, currentScript === null || currentScript === void 0 ? void 0 : currentScript.dataset));
    const debug = currentScript === null || currentScript === void 0 ? void 0 : currentScript.hasAttribute("debug");
    const cachePolicy = currentScript === null || currentScript === void 0 ? void 0 : currentScript.getAttribute("cache");
    const targets = ((_d = currentScript === null || currentScript === void 0 ? void 0 : currentScript.getAttribute("target")) === null || _d === void 0 ? void 0 : _d.split(",")) || ["body"];
    targets.map((target) => __awaiter(void 0, void 0, void 0, function* () {
        const fragment = self.document.querySelector(target);
        yield Mancha.mount(fragment, { cache: cachePolicy, debug });
    }));
}
exports.default = Mancha;
