import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliCompressSync } from "node:zlib";
import { assert } from "./test_utils.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.join(path.dirname(__filename), "..");

/** Paths that must never reach consumers, keyed by what makes them unwanted. */
const FORBIDDEN: Array<[label: string, pattern: RegExp]> = [
	["compiled tests", /\.test\.(js|d\.ts|js\.map)$/],
	["test helpers", /^dist\/test_utils\./],
	["test fixtures", /^dist\/(fixtures|test_types)\//],
	["repo config", /^(\.github|\.vscode|\.claude)\//],
	[
		"build config",
		/^(biome\.json|\.biomeignore|gulpfile\.ts|tsdown\.config\.ts|tsconfig\.json|global\.d\.ts|tsec_exemptions\.json)$/,
	],
	["build scripts", /^scripts\//],
	// tsdown overwrites the tsc output for these two entries without emitting a
	// map, so any map left on disk describes code that is no longer in the file.
	["stale sourcemaps", /^dist\/(mancha|browser)\.js\.map$/],
];

/** Paths consumers or the `mancha docs` command depend on at runtime. */
const REQUIRED = [
	"package.json",
	"README.md",
	"dist/index.js",
	"dist/browser.js",
	"dist/mancha.js",
	"dist/cli.js",
	"docs/00_quickstart.md",
];

describe("Published package", function () {
	this.timeout(60000); // `npm pack` walks the whole tree.

	let files: string[];

	before(async () => {
		const { stdout } = await execAsync("npm pack --dry-run --json", { cwd: packageRoot });
		// npm reports either a bare array or an object keyed by package name.
		const parsed = JSON.parse(stdout);
		const manifest = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
		files = (manifest as { files: Array<{ path: string }> }).files.map((f) => f.path);
	});

	for (const [label, pattern] of FORBIDDEN) {
		it(`should not ship ${label}`, () => {
			const offenders = files.filter((f) => pattern.test(f));
			assert.deepEqual(offenders, [], `unexpected ${label} in tarball`);
		});
	}

	for (const required of REQUIRED) {
		it(`should ship ${required}`, () => {
			assert.ok(files.includes(required), `${required} missing from tarball`);
		});
	}
});

/**
 * A budget, not a target. Growth here is a product decision — every added
 * utility class lands in this bundle — so it should be made deliberately by
 * raising this number, rather than discovered later by a user on a slow link.
 * Matches `npm run check:size`; node's brotli defaults agree with the CLI.
 */
const BUNDLE_BUDGET_BYTES = 20_000;

describe("Bundle size", function () {
	this.timeout(20000); // Brotli at maximum quality is not fast.

	it(`compresses to under ${BUNDLE_BUDGET_BYTES} bytes`, async () => {
		const bundle = await fs.readFile(path.join(packageRoot, "dist/mancha.js"));
		const compressed = brotliCompressSync(bundle).length;
		assert.ok(
			compressed <= BUNDLE_BUDGET_BYTES,
			`dist/mancha.js is ${compressed} bytes brotli, over the ${BUNDLE_BUDGET_BYTES} budget ` +
				`by ${compressed - BUNDLE_BUDGET_BYTES}`,
		);
	});
});
