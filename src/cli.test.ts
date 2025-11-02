import { assert, setupGlobalTestEnvironment } from "./test_utils.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CLI", function () {
  this.timeout(10000); // CLI tests can take a few seconds

  before(() => setupGlobalTestEnvironment());

  const cliPath = path.join(__dirname, "cli.js");

  it("should not hang when running --help", async function () {
    const { stdout } = await execAsync(`node ${cliPath} --help`);
    assert.ok(stdout.includes("Commands"), "Should display help text");
  });

  it("should not hang when checking a simple HTML file", async function () {
    const html = `<!DOCTYPE html>
<html>
<body>
  <div :types='{"data": "{ name: string }"}'>
    <p>{{ data.name }}</p>
  </div>
</body>
</html>`;

    const tempFile = path.join(__dirname, `test_cli_${Date.now()}.html`);
    await fs.writeFile(tempFile, html);

    try {
      const { stdout } = await execAsync(`node ${cliPath} check ${tempFile}`);
      assert.ok(stdout.includes("✓") || stdout.includes("no type errors"), "Should complete successfully");
    } finally {
      await fs.unlink(tempFile);
    }
  });

  it("should complete type checking within timeout", async function () {
    const html = `<!DOCTYPE html>
<html>
<body>
  <div :types='{"items": "string[]"}'>
    <ul>
      <li :for="item in items">{{ item.toUpperCase() }}</li>
    </ul>
  </div>
</body>
</html>`;

    const tempFile = path.join(__dirname, `test_cli_${Date.now()}.html`);
    await fs.writeFile(tempFile, html);

    try {
      // Use a timeout wrapper to ensure it doesn't hang
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("CLI check timed out after 5 seconds")), 5000)
      );

      const checkPromise = execAsync(`node ${cliPath} check ${tempFile}`);

      const { stdout } = await Promise.race([checkPromise, timeoutPromise]) as { stdout: string };
      assert.ok(stdout.includes("✓") || stdout.includes("no type errors"), "Should complete successfully");
    } finally {
      await fs.unlink(tempFile);
    }
  });
});
