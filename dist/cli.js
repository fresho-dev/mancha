#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = require("yargs");
const helpers_1 = require("yargs/helpers");
const Mancha = require("./index.js");
const fs = require("fs/promises");
const args = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .describe("input", "Input HMTL file to render")
    .describe("output", "Output file, defaults to stdout")
    .describe("vars", "JSON-formatted variables")
    .demand(["input"])
    .parse();
Mancha.renderLocalPath(args["input"], JSON.parse(args.vars || "{}")).then((result) => {
    if (!args.output || args.output === "-") {
        console.log(result + "\n");
    }
    else {
        return fs.writeFile(args.output, result);
    }
});
