import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: {
			mancha: "src/mancha.ts",
		},
		format: "iife",
		clean: false,
		target: "es2022",
		platform: "browser",
		// Everything ships inside one IIFE, so no top-level name is reachable from
		// outside it; rolldown leaves them alone unless told they are safe to rename.
		minify: { mangle: { toplevel: true } },
		unbundle: false,
		skipNodeModulesBundle: false,
		noExternal: [/.*/],
		globalName: "Mancha",
	},
	{
		entry: {
			browser: "src/browser.ts",
		},
		format: "esm",
		clean: false,
		dts: true,
		target: "es2022",
		platform: "browser",
		minify: { mangle: { toplevel: true } },
		unbundle: false,
		skipNodeModulesBundle: false,
	},
]);
