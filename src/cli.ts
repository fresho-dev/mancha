import * as fs from "fs/promises";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Mancha } from "./index.js";
import { typeCheck } from "./type_checker.js";
import * as ts from "typescript";

const args = yargs(hideBin(process.argv))
  .command(
    "render <input>",
    "Render a Mancha template",
    (yargs) => {
      return yargs
        .positional("input", {
          describe: "Input HTML file to render",
          type: "string",
        })
        .option("output", {
          describe: "Output file, defaults to stdout",
          type: "string",
        })
        .option("vars", {
          describe: "JSON-formatted variables",
          type: "string",
        })
        .option("debug", {
          describe: "Print Mancha.js debugging information",
          type: "boolean",
        });
    },
    async (argv) => {
      Mancha.debug(argv.debug!!);
      Object.entries(JSON.parse(argv.vars || "{}")).forEach(
        ([key, value]) => (Mancha.$[key] = value)
      );

      const fragment = await Mancha.preprocessLocal(argv.input as string);
      await Mancha.renderNode(fragment);

      if (!argv.output || argv.output === "-") {
        console.log(Mancha.serializeHTML(fragment) + "\n");
      } else {
        await fs.writeFile(argv.output, Mancha.serializeHTML(fragment));
      }
    }
  )
  .command(
    "check <input...>",
    "Type check Mancha template(s)",
    (yargs) => {
      return yargs
        .positional("input", {
          describe: "Input HTML file(s) or directories to type check",
          type: "string",
          array: true,
        })
        .option("strict", {
          describe: "Enable strict type checking",
          type: "boolean",
          default: false,
        })
        .option("recursive", {
          describe: "Recursively check directories",
          type: "boolean",
          default: true,
        });
    },
    async (argv) => {
      const inputs = argv.input as string[];
      const options = { strict: argv.strict };

      // Collect all files to check
      const filesToCheck: string[] = [];

      for (const input of inputs) {
        const stat = await fs.stat(input);

        if (stat.isDirectory()) {
          // Read directory recursively
          const files = await fs.readdir(input, {
            recursive: argv.recursive,
            withFileTypes: true,
          });

          for (const file of files) {
            if (file.isFile() && (file.name.endsWith(".html") || file.name.endsWith(".htm"))) {
              const fullPath = `${file.path}/${file.name}`;
              filesToCheck.push(fullPath);
            }
          }
        } else if (stat.isFile()) {
          filesToCheck.push(input);
        }
      }

      if (filesToCheck.length === 0) {
        console.log("No files found to check.");
        process.exit(0);
      }

      let totalErrors = 0;
      let filesWithErrors = 0;

      for (const filePath of filesToCheck) {
        const htmlContent = await fs.readFile(filePath, "utf-8");
        const diagnostics = await typeCheck(htmlContent, { ...options, filePath });

        if (diagnostics.length > 0) {
          filesWithErrors++;
          totalErrors += diagnostics.length;

          diagnostics.forEach((diagnostic) => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            if (diagnostic.file && diagnostic.start) {
              const { line, character } = ts.getLineAndCharacterOfPosition(
                diagnostic.file,
                diagnostic.start
              );
              console.error(`${filePath} (${line + 1},${character + 1}): ${message}`);
            } else {
              console.error(`${filePath}: ${message}`);
            }
          });
        }
      }

      if (totalErrors > 0) {
        console.error(`\nFound ${totalErrors} error(s) in ${filesWithErrors} file(s).`);
        process.exit(1);
      } else {
        console.log(`✓ Checked ${filesToCheck.length} file(s), no type errors found.`);
      }
    }
  )
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;
