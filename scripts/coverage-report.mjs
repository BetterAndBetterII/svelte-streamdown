import {
	existsSync,
	globSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	coverageSourceExclude,
	coverageSourceInclude,
	coverageSuites,
	getCoverageSuite,
	getCoverageSuiteNames
} from '../config/coverage-suites.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const coverageRoot = resolve(repoRoot, 'coverage');
const browserCoverageBatchSize = 10;

function parseArgs(argv) {
	const options = {
		suites: [],
		summaryFile: null
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === '--') {
			continue;
		}

		if (arg === '--summary-file') {
			const value = argv[index + 1];

			if (!value) {
				throw new Error('--summary-file requires a path');
			}

			options.summaryFile = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--')) {
			throw new Error(`Unknown argument: ${arg}`);
		}

		options.suites.push(arg);
	}

	if (options.suites.length === 0) {
		options.suites = getCoverageSuiteNames();
	}

	return options;
}

function resolveSelectedSuites(suiteNames) {
	return suiteNames.map((name) => [name, getCoverageSuite(name)]);
}

function resolveTestFiles(testGlobs, excludedTestGlobs) {
	const excluded = new Set(
		excludedTestGlobs.flatMap((pattern) =>
			globSync(pattern, {
				cwd: repoRoot,
				nodir: true
			}).filter((path) => statSync(resolve(repoRoot, path)).isFile())
		)
	);
	const resolved = new Set();

	for (const pattern of testGlobs) {
		for (const file of globSync(pattern, { cwd: repoRoot, nodir: true })) {
			if (!statSync(resolve(repoRoot, file)).isFile()) {
				continue;
			}

			if (!excluded.has(file)) {
				resolved.add(file);
			}
		}
	}

	return [...resolved].sort((left, right) => left.localeCompare(right));
}

function runCommand(command, args) {
	const resolvedCommand = process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command;
	const result = spawnSync(resolvedCommand, args, {
		cwd: repoRoot,
		stdio: 'inherit',
		env: process.env
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(`Command failed: ${resolvedCommand} ${args.join(' ')}`);
	}
}

function isClientCoverageTestFile(path) {
	return /\.svelte\.(test|spec)\.[jt]s$/.test(path);
}

function chunkArray(items, size) {
	const chunks = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

function cleanupBrowserOrphans() {
	if (process.platform === 'win32') {
		return;
	}

	const workerdBinaryPattern = `${repoRoot}/node_modules/.pnpm/@cloudflare+workerd-linux-64`;
	spawnSync('pkill', ['-f', workerdBinaryPattern], {
		cwd: repoRoot,
		stdio: 'ignore',
		env: process.env
	});
}

function readSummary(path) {
	if (!existsSync(path)) {
		throw new Error(`Expected coverage summary at ${relative(repoRoot, path)}`);
	}

	return JSON.parse(readFileSync(path, 'utf8'));
}

function formatPercent(value) {
	return `${value.toFixed(2)}%`;
}

function formatSummaryMetric(metric) {
	const total = metric?.total ?? 0;
	const covered = metric?.covered ?? 0;
	const skipped = metric?.skipped ?? 0;

	return {
		total,
		covered,
		skipped,
		pct: total === 0 ? 100 : (covered / total) * 100
	};
}

function mergeSummaryMetric(left, right) {
	return formatSummaryMetric({
		total: Math.max(left?.total ?? 0, right?.total ?? 0),
		covered: Math.max(left?.covered ?? 0, right?.covered ?? 0),
		skipped: Math.max(left?.skipped ?? 0, right?.skipped ?? 0)
	});
}

function parseCoveragePercent(value) {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : 0;
	}

	const parsed = Number.parseFloat(value ?? '');

	return Number.isNaN(parsed) ? 0 : parsed;
}

function readSuiteMetrics(summaryPath) {
	const summary = readSummary(summaryPath);
	const total = summary.total;

	if (!total) {
		throw new Error(`Coverage summary missing total metrics at ${relative(repoRoot, summaryPath)}`);
	}

	return {
		statements: parseCoveragePercent(total.statements?.pct),
		branches: parseCoveragePercent(total.branches?.pct),
		functions: parseCoveragePercent(total.functions?.pct),
		lines: parseCoveragePercent(total.lines?.pct)
	};
}

function mergeCoverageSummaries(summaries) {
	if (summaries.length === 0) {
		throw new Error('Expected at least one coverage summary to merge');
	}

	const mergedEntries = {};

	for (const summary of summaries) {
		for (const [entryName, entryMetrics] of Object.entries(summary)) {
			if (entryName === 'total') {
				continue;
			}

			const current = mergedEntries[entryName] ?? {};
			mergedEntries[entryName] = {
				lines: mergeSummaryMetric(current.lines, entryMetrics.lines),
				statements: mergeSummaryMetric(current.statements, entryMetrics.statements),
				functions: mergeSummaryMetric(current.functions, entryMetrics.functions),
				branches: mergeSummaryMetric(current.branches, entryMetrics.branches),
				branchesTrue: mergeSummaryMetric(current.branchesTrue, entryMetrics.branchesTrue)
			};
		}
	}

	const totalMetric = (metricName) =>
		formatSummaryMetric({
			total: Object.values(mergedEntries).reduce(
				(sum, entry) => sum + (entry[metricName]?.total ?? 0),
				0
			),
			covered: Object.values(mergedEntries).reduce(
				(sum, entry) => sum + (entry[metricName]?.covered ?? 0),
				0
			),
			skipped: Object.values(mergedEntries).reduce(
				(sum, entry) => sum + (entry[metricName]?.skipped ?? 0),
				0
			)
		});

	return {
		total: {
			lines: totalMetric('lines'),
			statements: totalMetric('statements'),
			functions: totalMetric('functions'),
			branches: totalMetric('branches'),
			branchesTrue: totalMetric('branchesTrue')
		},
		...mergedEntries
	};
}

function assertThresholds(name, metrics, thresholds) {
	for (const metricName of ['statements', 'branches', 'functions', 'lines']) {
		if (metrics[metricName] < thresholds[metricName]) {
			throw new Error(
				`${name} coverage for ${metricName} dropped below threshold: ` +
					`${formatPercent(metrics[metricName])} < ${formatPercent(thresholds[metricName])}`
			);
		}
	}
}

function renderMarkdown(results) {
	const lines = [
		'# Coverage Report',
		'',
		'| Suite | Statements | Branches | Functions | Lines | Minimum thresholds |',
		'| --- | --- | --- | --- | --- | --- |'
	];

	for (const result of results) {
		lines.push(
			`| ${result.name} | ${formatPercent(result.metrics.statements)} | ${formatPercent(result.metrics.branches)} | ${formatPercent(result.metrics.functions)} | ${formatPercent(result.metrics.lines)} | ` +
				`S ${formatPercent(result.thresholds.statements)} / B ${formatPercent(result.thresholds.branches)} / F ${formatPercent(result.thresholds.functions)} / L ${formatPercent(result.thresholds.lines)} |`
		);
		lines.push(
			`| ${result.name} notes | ${result.description} |  |  |  | \`coverage/${result.name}\` |`
		);
	}

	return `${lines.join('\n')}\n`;
}

function main() {
	const options = parseArgs(process.argv.slice(2));
	const selectedSuites = resolveSelectedSuites(options.suites);

	mkdirSync(coverageRoot, { recursive: true });

	const results = [];

	for (const [name, suite] of selectedSuites) {
		const reportsDirectory = resolve(coverageRoot, name);
		const summaryPath = resolve(reportsDirectory, 'coverage-summary.json');
		const testFiles = resolveTestFiles(suite.testGlobs, suite.excludedTestGlobs);

		if (testFiles.length === 0) {
			throw new Error(`Coverage suite "${name}" did not resolve any test files`);
		}

		rmSync(reportsDirectory, { recursive: true, force: true });

		const batchSummaryPaths = [];

		const runVitestCoverage = ({ projects, files, isBrowserBatch, batchName }) => {
			if (files.length === 0) {
				return;
			}

			const batchReportsDirectory = resolve(reportsDirectory, batchName);
			const vitestArgs = [
				'exec',
				'vitest',
				'run',
				'--reporter=dot',
				'--silent=passed-only',
				'--coverage.enabled=true',
				'--coverage.provider=v8',
				'--coverage.reporter=text-summary',
				'--coverage.reporter=json-summary',
				'--coverage.reporter=html',
				`--coverage.reportsDirectory=${relative(repoRoot, batchReportsDirectory)}`,
				...(suite.sourceInclude ?? coverageSourceInclude).map(
					(pattern) => `--coverage.include=${pattern}`
				),
				...coverageSourceExclude.map((pattern) => `--coverage.exclude=${pattern}`),
				...(isBrowserBatch ? ['--maxWorkers=1', '--sequence.concurrent=false'] : []),
				...projects.map((project) => `--project=${project}`),
				...files
			];

			if (isBrowserBatch) {
				cleanupBrowserOrphans();
			}

			runCommand('pnpm', vitestArgs);
			batchSummaryPaths.push(resolve(batchReportsDirectory, 'coverage-summary.json'));

			if (isBrowserBatch) {
				cleanupBrowserOrphans();
			}
		};

		const clientTestFiles = suite.projects.includes('client')
			? testFiles.filter((path) => isClientCoverageTestFile(path))
			: [];
		const serverTestFiles = suite.projects.includes('server')
			? testFiles.filter((path) => !isClientCoverageTestFile(path))
			: [];

		if (suite.projects.includes('server')) {
			runVitestCoverage({
				projects: ['server'],
				files: serverTestFiles,
				isBrowserBatch: false,
				batchName: 'server'
			});
		}

		if (suite.projects.includes('client')) {
			for (const [index, files] of chunkArray(clientTestFiles, browserCoverageBatchSize).entries()) {
				runVitestCoverage({
					projects: ['client'],
					files,
					isBrowserBatch: true,
					batchName: `client-${index + 1}`
				});
			}
		}

		const mergedSummary = mergeCoverageSummaries(batchSummaryPaths.map((path) => readSummary(path)));
		writeFileSync(summaryPath, `${JSON.stringify(mergedSummary, null, 2)}\n`);

		const metrics = readSuiteMetrics(summaryPath);
		assertThresholds(name, metrics, suite.thresholds);

		results.push({
			name,
			description: suite.description,
			metrics,
			thresholds: suite.thresholds
		});
	}

	const markdown = renderMarkdown(results);
	const defaultSummaryPath = resolve(coverageRoot, 'summary.md');

	writeFileSync(defaultSummaryPath, markdown);

	if (options.summaryFile) {
		const outputPath = resolve(process.cwd(), options.summaryFile);
		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, markdown);
	}

	process.stdout.write(markdown);
}

main();
