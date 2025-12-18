import { SafeStyleSheet, concatStyleSheets, safeStyleSheet } from "safevalues";

export default function rules(): SafeStyleSheet {
	// Based on https://www.swyx.io/css-100-bytes.
	return concatStyleSheets([
		safeStyleSheet`html{`,
		safeStyleSheet`max-width: 70ch;`,
		safeStyleSheet`padding: 2em 1em;`,
		safeStyleSheet`margin: auto;`,
		safeStyleSheet`line-height: 1.75;`,
		safeStyleSheet`font-size: 1.25em;`,
		safeStyleSheet`font-family: sans-serif;`,
		safeStyleSheet`}`,
		safeStyleSheet`h1,h2,h3,h4,h5,h6{`,
		safeStyleSheet`margin: 1em 0 0.5em;`,
		safeStyleSheet`}`,
		safeStyleSheet`p,ul,ol{`,
		safeStyleSheet`margin-bottom: 1em;`,
		safeStyleSheet`color: #1d1d1d;`,
		safeStyleSheet`}`,
	]);
}
