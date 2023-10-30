"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const Mancha = require("../index.js");
(window || {})["Mancha"] = Mancha;
if (((_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.getAttribute("init")) !== undefined) {
    const vars = JSON.parse(document.currentScript.dataset["vars"] || "{}");
    const fsroot = window.location.href.split("/").slice(0, -1).join("/") + "/";
    Mancha.renderContent(document.body.innerHTML, vars, fsroot).then((content) => {
        document.body.innerHTML = content;
    });
}
