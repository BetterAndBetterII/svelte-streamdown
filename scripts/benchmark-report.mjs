import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
	aggregateBySuite,
	buildJsonReport,
	buildMarkdownReport,
	extractComparisons,
	renderBarChartSvg,
	summarizeComparisons,
	toScenarioChartRows,
	toSuiteChartRows
} from './lib/benchmark-report.mjs';

const args = process.argv.slice(2);

function readArg(flag, fallback = null) {
	const index = args.indexOf(flag);
	return index === -1 ? fallback : args[index + 1] ?? fallback;
}

function hasFlag(flag) {
	return args.includes(flag);
}

const outputDir = resolve(readArg('--output-dir', 'coverage/benchmarks'));
const inputPath = readArg('--input');
const jsonPath = resolve(readArg('--json', inputPath ?? `${outputDir}/compare.json`));
const top = Math.max(1, Number.parseInt(readArg('--top', '999'), 10) || 999);
const shouldRunBenchmarks = !inputPath && !hasFlag('--no-run');

mkdirSync(outputDir, { recursive: true });

if (shouldRunBenchmarks) {
	const benchCommand = [
		'vitest',
		'bench',
		'tests/benchmarks/compare',
		'--run',
		'--project',
		'server',
		'--outputJson',
		jsonPath
	];
	console.log(`Running benchmark compare suite: pnpm ${benchCommand.join(' ')}`);
	const result = spawnSync('pnpm', benchCommand, {
		stdio: 'inherit',
		shell: false
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const report = JSON.parse(readFileSync(inputPath ? resolve(inputPath) : jsonPath, 'utf8'));
const comparisons = extractComparisons(report);

if (comparisons.length === 0) {
	console.error(`No local/reference benchmark pairs found in ${inputPath ?? jsonPath}`);
	process.exit(1);
}

const suites = aggregateBySuite(comparisons);
const overall = summarizeComparisons(comparisons);
const filteredComparisons = comparisons
	.toSorted((left, right) => Math.abs(right.deltaPercent) - Math.abs(left.deltaPercent))
	.slice(0, top)
	.toSorted((left, right) => right.deltaPercent - left.deltaPercent);

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const packageManager = String(packageJson.packageManager ?? 'pnpm@unknown');
const cpus = os.cpus();
const uniqueCpuModels = [...new Set(cpus.map((cpu) => cpu.model.trim()).filter(Boolean))];
const gitCommit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
	encoding: 'utf8'
}).stdout.trim() || 'unknown';
const gitBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
	encoding: 'utf8'
}).stdout.trim() || 'unknown';
const platform = {
	generatedAt: new Date().toISOString(),
	platform: `${os.platform()} ${os.release()} (${os.arch()})`,
	cpu: uniqueCpuModels[0]
		? `${uniqueCpuModels[0]} | ${cpus.length} logical cores`
		: `${cpus.length} logical cores`,
	memory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GiB`,
	nodeVersion: process.version,
	pnpmVersion: packageManager.includes('@') ? packageManager.split('@').slice(1).join('@') : packageManager,
	gitCommit,
	gitBranch
};

const platformSummary = `${platform.platform} | ${platform.cpu} | Node ${platform.nodeVersion} | pnpm ${platform.pnpmVersion}`;
const suiteChart = renderBarChartSvg({
	title: 'Benchmark Comparison by Suite',
	subtitle: platformSummary,
	caption: 'Geometric mean throughput delta for each benchmark area.',
	rows: toSuiteChartRows(suites)
});
const scenarioChart = renderBarChartSvg({
	title: `Benchmark Comparison by Scenario${top < comparisons.length ? ` (top ${top})` : ''}`,
	subtitle: platformSummary,
	caption: 'Per-scenario throughput delta, sorted from best improvement to worst regression.',
	rows: toScenarioChartRows(filteredComparisons)
});

const suiteChartPath = resolve(outputDir, 'compare-by-suite.svg');
const scenarioChartPath = resolve(outputDir, 'compare-by-scenario.svg');
const markdownPath = resolve(outputDir, 'compare-report.md');
const jsonSummaryPath = resolve(outputDir, 'compare-report.json');

writeFileSync(suiteChartPath, suiteChart);
writeFileSync(scenarioChartPath, scenarioChart);

const markdown = buildMarkdownReport({
	sourcePath: relative(process.cwd(), inputPath ? resolve(inputPath) : jsonPath),
	overall,
	suites,
	comparisons,
	platform,
	suiteChartPath: `./${relative(dirname(markdownPath), suiteChartPath)}`,
	scenarioChartPath: `./${relative(dirname(markdownPath), scenarioChartPath)}`
});
writeFileSync(markdownPath, markdown);

writeFileSync(
	jsonSummaryPath,
	JSON.stringify(
		buildJsonReport({
			overall,
			suites,
			comparisons,
			platform,
			artifacts: {
				sourceJson: relative(process.cwd(), inputPath ? resolve(inputPath) : jsonPath),
				suiteChart: relative(process.cwd(), suiteChartPath),
				scenarioChart: relative(process.cwd(), scenarioChartPath),
				markdown: relative(process.cwd(), markdownPath)
			}
		}),
		null,
		2
	)
);

console.log(`Benchmark report ready:
- ${relative(process.cwd(), markdownPath)}
- ${relative(process.cwd(), suiteChartPath)}
- ${relative(process.cwd(), scenarioChartPath)}
- ${relative(process.cwd(), jsonSummaryPath)}

Overall: ${overall.pairs} pairs | local wins ${overall.localWins} | reference wins ${overall.referenceWins} | geometric mean ${overall.ratio.toFixed(2)}x (${overall.deltaPercent >= 0 ? '+' : ''}${overall.deltaPercent.toFixed(1)}%)`);
