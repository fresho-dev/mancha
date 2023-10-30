#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as Mancha from "./index.js";
import * as fs from "fs/promises";

const args = yargs(hideBin(process.argv))
  .describe("input", "Input HMTL file to render")
  .describe("output", "Output file, defaults to stdout")
  .describe("vars", "JSON-formatted variables")
  .demand(["input"])
  .parse() as any;

Mancha.renderLocalPath(args["input"], JSON.parse(args.vars || "{}")).then((result) => {
  if (!args.output || args.output === "-") {
    console.log(result + "\n");
  } else {
    return fs.writeFile(args.output, result);
  }
});
