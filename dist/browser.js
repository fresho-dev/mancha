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
const Mancha = require("./web.js");
self["Mancha"] = Mancha;
if ((_b = (_a = self.document) === null || _a === void 0 ? void 0 : _a.currentScript) === null || _b === void 0 ? void 0 : _b.hasAttribute("init")) {
    const vars = Mancha.datasetAttributes(self.document.currentScript.attributes);
    const attributes = Array.from(((_c = self.document.currentScript) === null || _c === void 0 ? void 0 : _c.attributes) || []).reduce((dict, attr) => Object.assign(dict, { [attr.name]: attr.value }), {});
    const targets = ((_d = attributes["target"]) === null || _d === void 0 ? void 0 : _d.split(",")) || ["body"];
    const renderings = targets.map((target) => __awaiter(void 0, void 0, void 0, function* () {
        const node = self.document[target];
        node.innerHTML = yield Mancha.renderContent(node.innerHTML, vars);
    }));
    Promise.all(renderings).then(() => {
        if (attributes["onrender"]) {
            eval(attributes["onrender"]);
        }
        dispatchEvent(new Event("mancha-render", { bubbles: true }));
    });
}
exports.default = Mancha;
