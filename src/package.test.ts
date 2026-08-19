import { exec } from "node:child_process";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliCompressSync } from "node:zlib";
import { assert } from "./test_utils.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.join(path.dirname(__filename), "..");
const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
	exports: Record<string, unknown>;
};

/** Paths that must never reach consumers, keyed by what makes them unwanted. */
const FORBIDDEN: Array<[label: string, pattern: RegExp]> = [
	["compiled tests", /\.test\.(js|d\.ts|js\.map)$/],
	["test helpers", /^dist\/test_utils\./],
	["test fixtures", /^dist\/(fixtures|test_types)\//],
	["repo config", /^(\.github|\.vscode|\.claude)\//],
	[
		"build config",
		/^(biome\.json|\.biomeignore|gulpfile\.ts|tsdown\.config\.ts|tsconfig\.json|global\.d\.ts|tsec_exemptions\.json|web-test-runner\.config\.js)$/,
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
	"dist/index.d.ts",
	"dist/browser.js",
	"dist/browser.d.ts",
	"dist/worker.js",
	"dist/worker.d.ts",
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

/** Entry points a consumer is told to import, and the docs that say so. */
const PUBLIC_ENTRY_POINTS = [
	["mancha", "docs/06_ssr.md"],
	["mancha/browser", "docs/02_initialization.md"],
	["mancha/worker", "docs/06_ssr.md"],
	// Not documented, but bundlers and tooling read the manifest, and narrowing
	// `exports` blocks that unless it is listed explicitly.
	["mancha/package.json", "tooling"],
];

/**
 * Deep paths into dist/. These were importable while `exports` carried a
 * `./dist/*.js` wildcard, which made every emitted module public API and left
 * no way to change one without a breaking release.
 */
const PRIVATE_DEEP_PATHS = [
	"mancha/dist/dome.js",
	"mancha/dist/store.js",
	"mancha/dist/css_gen_utils.js",
	"mancha/dist/type_checker.js",
	"mancha/dist/renderer.js",
	// The supported spelling of these two is `mancha` and `mancha/worker`.
	"mancha/dist/index.js",
	"mancha/dist/worker.js",
];

/**
 * Resolves each specifier the way a consumer's Node would, in a throwaway
 * package whose node_modules/mancha symlinks back here. A symlink rather than
 * an installed tarball keeps this to one subprocess; what is under test is the
 * `exports` map, and Node applies it identically either way.
 * @param specs - Package specifiers to resolve.
 * @returns Each specifier mapped to "ok" or the Node error code it raised.
 */
async function resolveAsConsumer(specs: string[]): Promise<Record<string, string>> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mancha-exports-"));
	try {
		// A bare consumer package, with mancha resolvable by name.
		await fs.writeFile(
			path.join(dir, "package.json"),
			JSON.stringify({ name: "consumer", type: "module", version: "1.0.0" }),
		);
		await fs.mkdir(path.join(dir, "node_modules"), { recursive: true });
		await fs.symlink(packageRoot, path.join(dir, "node_modules", "mancha"), "dir");

		// import.meta.resolve applies `exports` without executing the module.
		const probe = `const out = {};
for (const spec of ${JSON.stringify(specs)}) {
	try {
		import.meta.resolve(spec);
		out[spec] = "ok";
	} catch (err) {
		out[spec] = err.code ?? err.name;
	}
}
console.log(JSON.stringify(out));`;
		await fs.writeFile(path.join(dir, "probe.mjs"), probe);

		const { stdout } = await execAsync("node probe.mjs", { cwd: dir });
		return JSON.parse(stdout);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

describe("Package exports", function () {
	this.timeout(30000); // Spawns a node subprocess.

	let resolved: Record<string, string>;

	before(async () => {
		resolved = await resolveAsConsumer([
			...PUBLIC_ENTRY_POINTS.map(([spec]) => spec),
			...PRIVATE_DEEP_PATHS,
		]);
	});

	for (const [spec, source] of PUBLIC_ENTRY_POINTS) {
		it(`should resolve ${spec}, used by ${source}`, () => {
			assert.equal(resolved[spec], "ok", `${spec} does not resolve for consumers`);
		});
	}

	for (const spec of PRIVATE_DEEP_PATHS) {
		it(`should not expose ${spec}`, () => {
			assert.equal(
				resolved[spec],
				"ERR_PACKAGE_PATH_NOT_EXPORTED",
				`${spec} is reachable, making an internal module public API`,
			);
		});
	}

	it("should declare no wildcard subpath", () => {
		const wildcards = Object.keys(pkg.exports).filter((key) => key.includes("*"));
		assert.deepEqual(wildcards, [], "a wildcard subpath re-exposes every emitted module");
	});
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
