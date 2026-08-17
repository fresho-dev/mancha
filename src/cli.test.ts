import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assert, setupGlobalTestEnvironment } from "./test_utils.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CLI", function () {
	this.timeout(10000); // CLI tests can take a few seconds

	before(() => setupGlobalTestEnvironment());

	const cliPath = path.join(__dirname, "cli.js");

	it("should not hang when running --help", async () => {
		const { stdout } = await execAsync(`node ${cliPath} --help`);
		assert.ok(stdout.includes("Commands"), "Should display help text");
	});

	describe("check command", () => {
		const testDir = path.join(__dirname, "temp_cli_tests");

		before(async () => {
			// Clean up any leftover test directories from previous runs.
			await fs.rm(testDir, { recursive: true, force: true });
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

		it("should skip node_modules directories when crawling", async () => {
			const nested = path.join(testDir, "node_modules", "ignoredpkg");
			await fs.mkdir(nested, { recursive: true });
			await fs.writeFile(path.join(nested, "ignored.html"), "<p>ignore me</p>");

			const { stdout } = await execAsync(`node ${cliPath} check ${testDir}`);
			assert.ok(stdout.includes("Checked 3 file(s)"), "Should not count files under node_modules");
		});
	});

	describe("render command", () => {
		const testDir = path.join(__dirname, "temp_cli_render_tests");

		before(async () => {
			await fs.rm(testDir, { recursive: true, force: true });
			await fs.mkdir(testDir, { recursive: true });
			await fs.writeFile(
				path.join(testDir, "types.html"),
				`<div :types='{"name": "string"}' data-types='{}'>hi</div>`,
			);
		});

		after(async () => {
			await fs.rm(testDir, { recursive: true, force: true });
		});

		it("should render a template to stdout", async () => {
			const filePath = path.join(testDir, "types.html");
			const { stdout } = await execAsync(`node ${cliPath} render ${filePath}`);
			assert.ok(stdout.includes("<div>hi</div>"), "Should render the template");
		});

		it("should write to the file given by --output", async () => {
			const filePath = path.join(testDir, "types.html");
			const outPath = path.join(testDir, "out.html");
			await execAsync(`node ${cliPath} render ${filePath} --output ${outPath}`);
			const output = await fs.readFile(outPath, "utf-8");
			assert.ok(output.includes("<div>hi</div>"), "Should write the rendered template");
		});

		it("should strip type attributes without any flag", async () => {
			const filePath = path.join(testDir, "types.html");
			const { stdout } = await execAsync(`node ${cliPath} render ${filePath}`);
			assert.ok(!stdout.includes(":types"), "Should strip :types");
			assert.ok(!stdout.includes("data-types"), "Should strip data-types");
		});

		it("should reject unknown flags instead of ignoring them", async () => {
			const filePath = path.join(testDir, "types.html");
			const result = await execAsync(`node ${cliPath} render ${filePath} --strip-types`).then(
				() => ({ failed: false, stderr: "" }),
				(err: { stderr: string }) => ({ failed: true, stderr: err.stderr }),
			);
			assert.ok(result.failed, "Should exit with a non-zero code");
			assert.ok(result.stderr.includes("Unknown argument"), "Should name the unknown argument");
		});
	});

	describe("docs command", () => {
		it("should output documentation", async () => {
			const { stdout } = await execAsync(`node ${cliPath} docs`);
			assert.ok(stdout.includes("# mancha"), "Should include README title");
			assert.ok(stdout.includes("# Quick Start"), "Should include Quick Start");
			assert.ok(stdout.includes("# Syntax"), "Should include Syntax docs");
		});

		it("should output the current version", async () => {
			const packageJsonPath = path.join(__dirname, "..", "package.json");
			const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
			const { stdout } = await execAsync(`node ${cliPath} docs`);
			assert.ok(
				stdout.includes(`mancha version ${packageJson.version}`),
				"Should include version number",
			);
		});
	});

	describe("version flag", () => {
		// Run from a copy with its own manifest: asserting against the repo's cannot fail, since
		// that is the one yargs guesses. Dependencies are symlinked rather than copied, so the
		// CLI still resolves yargs while the fixture stays out of the repository.
		const fixtureVersion = "0.0.0-fixture";
		let fixtureRoot: string;

		before(async () => {
			fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mancha-cli-version-"));
			await fs.cp(__dirname, path.join(fixtureRoot, "dist"), { recursive: true });
			await fs.symlink(
				path.join(__dirname, "..", "node_modules"),
				path.join(fixtureRoot, "node_modules"),
				"dir",
			);

			const packageJson = JSON.parse(
				await fs.readFile(path.join(__dirname, "..", "package.json"), "utf-8"),
			);
			packageJson.version = fixtureVersion;
			await fs.writeFile(path.join(fixtureRoot, "package.json"), JSON.stringify(packageJson));
		});

		after(async () => {
			await fs.rm(fixtureRoot, { recursive: true, force: true });
		});

		it("should report the version from its own package root", async () => {
			const fixtureCli = path.join(fixtureRoot, "dist", "cli.js");
			const { stdout } = await execAsync(`node ${fixtureCli} --version`);
			assert.equal(stdout.trim(), fixtureVersion, "Should read mancha's own manifest");
		});
	});
});
