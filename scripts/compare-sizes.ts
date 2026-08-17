/**
 * Re-measures the size comparison in README.md.
 *
 * Every figure is the brotli-compressed size of the file a user actually
 * downloads, at a pinned version, so the table can be refreshed rather than
 * left to drift as the comparators release.
 *
 * Two libraries ship no drop-in build and cannot be measured this way; their
 * numbers come from bundling a minimal counter app and are recorded in
 * BUILD_STEP below alongside the steps that produced them.
 *
 * Usage: npx tsx scripts/compare-sizes.ts
 */
import { execFileSync } from "node:child_process";
import { brotliCompressSync } from "node:zlib";

/** A library whose size has to be fetched before it is known. */
interface Source {
	name: string;
	version: string;
	/** unpkg path to the file a `<script src>` user downloads. */
	url: string;
}

/** A library with a size, however that size was arrived at. */
interface Measured {
	name: string;
	version: string;
	bytes: number;
	/** Set when the library has no drop-in build; see BUILD_STEP. */
	note?: string;
}

/** Drop-in builds, fetched from unpkg at a pinned version. */
const DROP_IN: Source[] = [
	{
		name: "petite-vue",
		version: "0.4.1",
		url: "https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.iife.js",
	},
	{ name: "htmx", version: "2.0.10", url: "https://unpkg.com/htmx.org@2.0.10/dist/htmx.min.js" },
	{
		name: "Alpine.js",
		version: "3.16.1",
		url: "https://unpkg.com/alpinejs@3.16.1/dist/cdn.min.js",
	},
	{ name: "Vue", version: "3.5.41", url: "https://unpkg.com/vue@3.5.41/dist/vue.global.prod.js" },
];

/**
 * Libraries that compile rather than ship a runtime, so "the size" depends on
 * the app. Both figures below are a minimal counter — one button, one piece of
 * state — bundled with esbuild at `--minify --format=esm --target=es2022` and
 * `process.env.NODE_ENV` defined as "production". They are a floor, not a
 * typical app. React is listed this way because React 19 dropped its UMD
 * build: there is no longer any official way to load it from a script tag.
 */
const BUILD_STEP: Measured[] = [
	{ name: "Svelte", version: "5.56.9", bytes: 15106, note: "compiled; minimal app" },
	{ name: "React", version: "19.2.8", bytes: 52002, note: "bundled; minimal app" },
];

function brotliOf(bytes: Uint8Array): number {
	return brotliCompressSync(bytes).length;
}

async function measure(source: Source): Promise<Measured> {
	const response = await fetch(source.url);
	if (!response.ok) throw new Error(`${source.name}: ${response.status} for ${source.url}`);
	const { name, version } = source;
	return { name, version, bytes: brotliOf(new Uint8Array(await response.arrayBuffer())) };
}

async function main(): Promise<void> {
	// Measure mancha from the build in dist/, the same file unpkg serves.
	const version = JSON.parse(
		execFileSync("node", ["-p", "JSON.stringify(require('./package.json'))"]).toString(),
	).version as string;
	const { readFileSync } = await import("node:fs");
	const mancha: Measured = {
		name: "mancha",
		version,
		bytes: brotliOf(readFileSync("dist/mancha.js")),
	};

	const measured = await Promise.all(DROP_IN.map(measure));
	const rows = [mancha, ...measured, ...BUILD_STEP].sort((a, b) => a.bytes - b.bytes);

	console.log("| Library | Version | Brotli | Notes |");
	console.log("| --- | --- | ---: | --- |");
	for (const row of rows) {
		const size = `${row.bytes.toLocaleString("en-US")} B`;
		console.log(`| ${row.name} | ${row.version} | ${size} | ${row.note ?? ""} |`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
