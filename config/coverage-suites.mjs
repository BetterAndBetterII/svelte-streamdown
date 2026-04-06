/**
 * @typedef {{ statements: number; branches: number; functions: number; lines: number }} CoverageThresholds
 */

/**
 * @typedef {{
 *   description: string;
 *   projects: string[];
 *   sourceInclude?: string[];
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

const parserCoverageExcludedTests = [
	...flakyParserParityTests,
	'src/tests/alert.test.ts',
	'src/tests/footnoteRef.test.ts',
	'src/tests/paragraph.test.ts'
];

/** @type {Record<CoverageSuiteName, CoverageSuite>} */
export const coverageSuites = {
	parser: {
		description: 'Parser, streaming, and markdown normalization coverage',
		projects: ['server'],
		sourceInclude: [
			'src/lib/marked/**/*.ts',
			'src/lib/markdown.ts',
			'src/lib/security/**/*.{js,ts}',
			'src/lib/streaming.ts'
		],
		testGlobs: [
			'src/tests/*.test.ts',
			'packages/remend/__tests__/**/*.test.ts',
			'tests/contracts/parser-ir.spec.ts',
			'tests/contracts/parser-parity.spec.ts',
			'tests/ported/remend/**/*.test.ts',
			'tests/ported/streamdown/security/*.test.ts'
		],
		excludedTestGlobs: parserCoverageExcludedTests,
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
		sourceInclude: [
			'src/lib/Block.svelte',
			'src/lib/Streamdown.svelte',
			'src/lib/context.svelte.ts',
			'src/lib/incomplete-code.ts',
			'src/lib/plugins.ts',
			'src/lib/theme.ts',
			'src/lib/Elements/**/*.{ts,svelte}',
			'src/lib/utils/**/*.{ts,js}'
		],
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
		description: 'Reference-backed UI/runtime parity coverage across ported server and browser suites',
		projects: ['server', 'client'],
		sourceInclude: [
			'src/lib/AnimatedText.svelte',
			'src/lib/Block.svelte',
			'src/lib/Streamdown.svelte',
			'src/lib/context-key.ts',
			'src/lib/context.svelte.ts',
			'src/lib/detect-direction.ts',
			'src/lib/icon-context.ts',
			'src/lib/incomplete-code.ts',
			'src/lib/markdown.ts',
			'src/lib/marked/index.ts',
			'src/lib/plugin-context.ts',
			'src/lib/plugins.ts',
			'src/lib/security/html.ts',
			'src/lib/streaming.ts',
			'src/lib/theme.ts',
			'src/lib/translations.ts',
			'src/lib/url-policy.ts',
			'src/lib/Elements/**/*.{ts,svelte}',
			'src/lib/utils/bundledLanguages.ts',
			'src/lib/utils/code-block.ts',
			'src/lib/utils/copy.svelte.ts',
			'src/lib/utils/darkMode.svelte.ts',
			'src/lib/utils/hightlighter.svelte.ts',
			'src/lib/utils/mermaid.ts',
			'src/lib/utils/panzoom.svelte.ts',
			'src/lib/utils/save.ts',
			'src/lib/utils/scroll-lock.ts',
			'src/lib/utils/table.ts',
			'src/lib/utils/url.ts',
			'src/lib/utils/useClickOutside.svelte.ts',
			'src/lib/utils/useKeyDown.svelte.ts'
		],
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
