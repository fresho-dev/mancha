import * as csstree from "css-tree";
import basicRules from "./css_gen_basic.js";
import minimalRules from "./css_gen_minimal.js";
import utilsRules from "./css_gen_utils.js";
import { assert } from "./test_utils.js";

/**
 * A declaration the CSS spec cannot accept, and why.
 *
 * Browsers drop such a declaration silently: the selector still parses, so the
 * rule survives with an empty declaration list and matches nothing. Counting
 * rules cannot catch that, and checking it against a live engine only measures
 * that engine — jsdom implements a narrow subset and rejects valid modern
 * properties, while a browser may accept a vendor extension the spec omits.
 * css-tree validates against MDN's spec data instead, which is what we mean.
 */
interface DeadDeclaration {
	selector: string;
	declaration: string;
	reason: string;
}

/** Validate every declaration in a stylesheet against the CSS spec. */
function findDeadDeclarations(css: string): DeadDeclaration[] {
	const dead: DeadDeclaration[] = [];
	const ast = csstree.parse(css, { positions: true });

	csstree.walk(ast, {
		visit: "Declaration",
		enter(node) {
			// Custom properties accept anything by definition.
			if (node.property.startsWith("--")) return;

			const value = csstree.generate(node.value);
			// A var() reference resolves at compute time, so the spec grammar
			// cannot judge it here.
			if (value.includes("var(")) return;

			const reason = !csstree.lexer.getProperty(node.property)
				? "unknown property"
				: csstree.lexer.matchProperty(node.property, node.value).error
					? `value not allowed: ${value}`
					: null;
			if (!reason) return;

			// Report the selector so the offending generator is easy to find.
			const rule = this.rule;
			const selector = rule?.prelude ? csstree.generate(rule.prelude) : "(unknown)";
			dead.push({ selector, declaration: `${node.property}: ${value}`, reason });
		},
	});

	return dead;
}

// basic and minimal return a SafeStyleSheet rather than a bare string; both
// stringify to the CSS they carry.
const GENERATORS: Array<[name: string, generate: () => { toString(): string }]> = [
	["utils", utilsRules],
	["basic", basicRules],
	["minimal", minimalRules],
];

describe("CSS Generation Lint", () => {
	for (const [name, generate] of GENERATORS) {
		it(`emits no declaration the CSS spec rejects in ${name}`, () => {
			const dead = findDeadDeclarations(String(generate()));

			// Report a bounded sample: a broken generator emits hundreds at once,
			// and the first few identify it just as well as all of them.
			const sample = dead
				.slice(0, 8)
				.map((d) => `${d.selector} { ${d.declaration} } — ${d.reason}`);
			assert.deepEqual(sample, [], `${dead.length} dead declaration(s) in ${name}`);
		});
	}
});
