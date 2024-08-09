import * as fs from "fs/promises";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Mancha } from "./index.js";

const args = yargs(hideBin(process.argv))
  .describe("input", "Input HMTL file to render")
  .describe("output", "Output file, defaults to stdout")
  .describe("vars", "JSON-formatted variables")
  .describe("debug", "Print Mancha.js debugging information")
  .demand(["input"])
  .parse() as any;

Mancha.debug(args.debug!!);
new Promise(async (resolve, reject) => {
  Object.entries(JSON.parse(args.vars || "{}")).forEach(([key, value]) => (Mancha.$[key] = value));

  const fragment = await Mancha.preprocessLocal(args["input"]);
  await Mancha.renderNode(fragment);

  if (!args.output || args.output === "-") {
    console.log(Mancha.serializeHTML(fragment) + "\n");
  } else {
    await fs.writeFile(args.output, Mancha.serializeHTML(fragment));
  }
});
