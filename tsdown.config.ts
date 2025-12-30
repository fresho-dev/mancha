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
		minify: true,
		unbundle: false,
		skipNodeModulesBundle: false,
		noExternal: [/.*/],
		globalName: "Mancha",
	},
	{
		entry: {
			browser: "src/browser.ts",
			safe_browser: "src/safe_browser.ts",
		},
		format: "esm",
		clean: false,
		dts: true,
		target: "es2022",
		platform: "browser",
		minify: true,
		unbundle: false,
		skipNodeModulesBundle: false,
	},
]);
