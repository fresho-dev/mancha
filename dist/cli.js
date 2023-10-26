#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = require("yargs");
const helpers_1 = require("yargs/helpers");
const args = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .demand("input")
    .demand("output")
    .help("input", "input file")
    .help("output", "output file")
    .parse();
// Mancha.renderLocalPath(args)
console.log("input", args["input"]);
console.log("output", args["output"]);
