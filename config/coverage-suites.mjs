/**
 * @typedef {{ statements: number; branches: number; functions: number; lines: number }} CoverageThresholds
 */

/**
 * @typedef {{
 *   description: string;
 *   projects: string[];
 *   testGlobs: string[];
 *   excludedTestGlobs: string[];
 *   thresholds: CoverageThresholds;
 * }} CoverageSuite
 */

/** @typedef {'parser' | 'components' | 'parity'} CoverageSuiteName */

export const coverageSourceInclude = [
	'src/lib/**/*.{ts,svelte}',
	'packages/remend/src/index.ts',
	'packages/remend/src/incomplete-markdown.ts',
	'packages/remend/src/utils.ts'
];

export const coverageSourceExclude = ['src/lib/**/*.d.ts', 'packages/remend/src/**/*.d.ts'];

const flakyParserParityTests = [
	'tests/ported/remend/broken-markdown-variants.test.ts',
	'tests/ported/remend/mixed-formatting.test.ts'
];

/** @type {Record<CoverageSuiteName, CoverageSuite>} */
export const coverageSuites = {
	parser: {
		description: 'Parser, streaming, and markdown normalization coverage',
		projects: ['server'],
		testGlobs: [
			'packages/remend/__tests__/**/*.test.ts',
			'tests/contracts/parser-ir.spec.ts',
			'tests/contracts/parser-parity.spec.ts',
			'tests/ported/remend/**/*.test.ts',
			'tests/ported/streamdown/security/*.test.ts'
		],
		excludedTestGlobs: flakyParserParityTests,
		thresholds: {
			statements: 64,
			branches: 70,
			functions: 50,
			lines: 64
		}
	},
	components: {
		description: 'Browser-rendered component and control coverage',
		projects: ['client'],
		testGlobs: ['tests/helpers/dom.svelte.test.ts', 'tests/ported/streamdown/**/*.svelte.test.ts'],
		excludedTestGlobs: [],
		thresholds: {
			statements: 72,
			branches: 71,
			functions: 65,
			lines: 72
		}
	},
	parity: {
		description: 'Reference-backed parity coverage across ported server and browser suites',
		projects: ['server', 'client'],
		testGlobs: [
			'packages/remend/__tests__/**/*.test.ts',
			'tests/contracts/parser-parity.spec.ts',
			'tests/helpers/fixtures.test.ts',
			'tests/ported/remend/**/*.test.ts',
			'tests/ported/streamdown/**/*.{test,spec}.ts'
		],
		excludedTestGlobs: flakyParserParityTests,
		thresholds: {
			statements: 80,
			branches: 75,
			functions: 70,
			lines: 80
		}
	}
};

/** @returns {CoverageSuiteName[]} */
export function getCoverageSuiteNames() {
	return /** @type {CoverageSuiteName[]} */ (Object.keys(coverageSuites));
}

/** @param {CoverageSuiteName} name */
export function getCoverageSuite(name) {
	const suite = coverageSuites[name];

	if (!suite) {
		throw new Error(
			`Unknown coverage suite "${name}". Expected one of: ${getCoverageSuiteNames().join(', ')}`
		);
	}

	return suite;
}
