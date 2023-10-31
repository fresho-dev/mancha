"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const Mancha = require("./web.js");
self["Mancha"] = Mancha;
if (((_b = (_a = self.document) === null || _a === void 0 ? void 0 : _a.currentScript) === null || _b === void 0 ? void 0 : _b.getAttribute("init")) !== undefined) {
    const vars = JSON.parse(self.document.currentScript.dataset["vars"] || "{}");
    const fsroot = self.location.href.split("/").slice(0, -1).join("/") + "/";
    Mancha.renderContent(self.document.body.innerHTML, vars, fsroot).then((content) => {
        self.document.body.innerHTML = content;
    });
}
exports.default = Mancha;
