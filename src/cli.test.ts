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

  describe("check command", () => {
    const testDir = path.join(__dirname, "temp_cli_tests");

    before(async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "file1.html"), "<p>hello</p>");
      await fs.mkdir(path.join(testDir, "dir1"));
      await fs.writeFile(path.join(testDir, "dir1", "file2.html"), "<p>world</p>");
      await fs.mkdir(path.join(testDir, "dir2"));
      await fs.writeFile(path.join(testDir, "dir2", "file3.html"), "<p>!</p>");
    });

    after(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should check a single file", async () => {
      const filePath = path.join(testDir, "file1.html");
      const { stdout } = await execAsync(`node ${cliPath} check ${filePath}`);
      assert.ok(stdout.includes("Checked 1 file(s)"));
    });

    it("should check a single directory", async () => {
      const dirPath = path.join(testDir, "dir1");
      const { stdout } = await execAsync(`node ${cliPath} check ${dirPath}`);
      assert.ok(stdout.includes("Checked 1 file(s)"));
    });

    it("should check a list of files", async () => {
      const file1 = path.join(testDir, "file1.html");
      const file2 = path.join(testDir, "dir1", "file2.html");
      const { stdout } = await execAsync(`node ${cliPath} check ${file1} ${file2}`);
      assert.ok(stdout.includes("Checked 2 file(s)"));
    });

    it("should check a list of directories", async () => {
      const dir1 = path.join(testDir, "dir1");
      const dir2 = path.join(testDir, "dir2");
      const { stdout } = await execAsync(`node ${cliPath} check ${dir1} ${dir2}`);
      assert.ok(stdout.includes("Checked 2 file(s)"));
    });

    it("should check a mix of files and directories", async () => {
      const file1 = path.join(testDir, "file1.html");
      const dir1 = path.join(testDir, "dir1");
      const { stdout } = await execAsync(`node ${cliPath} check ${file1} ${dir1}`);
      assert.ok(stdout.includes("Checked 2 file(s)"));
    });
  });
});
