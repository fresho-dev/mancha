#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as Mancha from "./index.js";

const args = yargs(hideBin(process.argv))
  .demand("input")
  .demand("output")
  .help("input", "input file")
  .help("output", "output file")
  .parse() as any;

// Mancha.renderLocalPath(args)
console.log("input", args["input"]);
console.log("output", args["output"]);
