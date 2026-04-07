import { describe, expect, it } from 'vitest';

import {
	aggregateBySuite,
	buildMarkdownReport,
	extractComparisons,
	labelScenario,
	labelSuite,
	renderBarChartSvg,
	summarizeComparisons,
	toScenarioChartRows,
	toSuiteChartRows
} from '../scripts/lib/benchmark-report.mjs';

describe('benchmark report helpers', () => {
	const sampleReport = {
		files: [
			{
				filepath: '/tmp/tests/benchmarks/compare/parse-blocks-reference.bench.ts',
				groups: [
					{
						fullName:
							'tests/benchmarks/compare/parse-blocks-reference.bench.ts > single block',
						benchmarks: [
							{ name: 'local', hz: 2000, rme: 1.1 },
							{ name: 'reference', hz: 1000, rme: 1.2 }
						]
					}
				]
			},
			{
				filepath: '/tmp/tests/benchmarks/compare/table-utils-reference.bench.ts',
				groups: [
					{
						fullName:
							'tests/benchmarks/compare/table-utils-reference.bench.ts > simple table (3x3)',
						benchmarks: [
							{ name: 'local', hz: 900, rme: 0.8 },
							{ name: 'reference', hz: 1000, rme: 0.7 }
						]
					}
				]
			}
		]
	};

	it('normalizes benchmark suites and scenarios', () => {
		expect(labelSuite('/tmp/tests/benchmarks/compare/parse-blocks-reference.bench.ts')).toBe(
			'Parse Blocks'
		);
		expect(
			labelScenario(
				'tests/benchmarks/compare/table-utils-reference.bench.ts > simple table (3x3)',
				'/tmp/tests/benchmarks/compare/table-utils-reference.bench.ts'
			)
		).toBe('simple table (3x3)');
	});

	it('extracts comparisons and aggregates suite deltas', () => {
		const comparisons = extractComparisons(sampleReport);
		const overall = summarizeComparisons(comparisons);
		const suites = aggregateBySuite(comparisons);

		expect(comparisons).toHaveLength(2);
		expect(overall.pairs).toBe(2);
		expect(overall.localWins).toBe(1);
		expect(suites.map((suite) => suite.suite)).toEqual(['Parse Blocks', 'Table Utilities']);
		expect(suites[0]?.deltaPercent).toBeGreaterThan(0);
		expect(suites[1]?.deltaPercent).toBeLessThan(0);
	});

	it('renders svg and markdown reports with chart references', () => {
		const comparisons = extractComparisons(sampleReport);
		const suites = aggregateBySuite(comparisons);
		const overall = summarizeComparisons(comparisons);
		const svg = renderBarChartSvg({
			title: 'Test Chart',
			subtitle: 'Platform subtitle',
			caption: 'Caption text',
			rows: toSuiteChartRows(suites)
		});
		const markdown = buildMarkdownReport({
			sourcePath: 'coverage/benchmarks/compare.json',
			overall,
			suites,
			comparisons,
			platform: {
				generatedAt: '2026-04-07T10:00:00.000Z',
				platform: 'linux test',
				cpu: 'Example CPU',
				memory: '16 GiB',
				nodeVersion: 'v22.0.0',
				pnpmVersion: '10.0.0',
				gitBranch: 'main',
				gitCommit: 'abc123'
			},
			suiteChartPath: './compare-by-suite.svg',
			scenarioChartPath: './compare-by-scenario.svg'
		});

		expect(svg).toContain('Test Chart');
		expect(svg).toContain('Green = local faster');
		expect(toScenarioChartRows(comparisons)).toHaveLength(2);
		expect(markdown).toContain('Benchmark Comparison Report');
		expect(markdown).toContain('![Benchmark comparison by suite](./compare-by-suite.svg)');
		expect(markdown).toContain('Parse Blocks / single block');
	});
});
