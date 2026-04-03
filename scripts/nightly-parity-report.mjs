import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function assertString(value, label) {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${label} must be a non-empty string`);
	}

	return value.trim();
}

function assertStatus(value) {
	const status = assertString(value, 'status');

	if (status !== 'success' && status !== 'failure') {
		throw new Error(`status must be either "success" or "failure", received: ${status}`);
	}

	return status;
}

function resolveRepoRelativePath(rawPath, label) {
	const absolutePath = resolve(process.cwd(), assertString(rawPath, label));
	return relative(repoRoot, absolutePath).replaceAll('\\', '/');
}

function parseDurationMs(rawValue) {
	if (rawValue == null) {
		return null;
	}

	const parsed = Number.parseInt(assertString(rawValue, 'duration-ms'), 10);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`duration-ms must be a non-negative integer, received: ${rawValue}`);
	}

	return parsed;
}

function parseArtifact(rawValue) {
	const value = assertString(rawValue, 'artifact');
	const separatorIndex = value.indexOf('=');

	if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
		throw new Error(`artifact must use the form label=path, received: ${value}`);
	}

	return {
		label: value.slice(0, separatorIndex),
		path: resolveRepoRelativePath(value.slice(separatorIndex + 1), `artifact path for ${value}`)
	};
}

function parseSuiteArgs(argv) {
	const result = {
		suite: null,
		status: null,
		command: null,
		durationMs: null,
		failureStage: null,
		logFile: null,
		summaryFile: null,
		jsonFile: null,
		artifacts: [],
		notes: []
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const value = argv[index + 1];

		switch (arg) {
			case '--suite':
				result.suite = assertString(value, 'suite');
				index += 1;
				break;
			case '--status':
				result.status = assertStatus(value);
				index += 1;
				break;
			case '--command':
				result.command = assertString(value, 'command');
				index += 1;
				break;
			case '--duration-ms':
				result.durationMs = parseDurationMs(value);
				index += 1;
				break;
			case '--failure-stage':
				result.failureStage = assertString(value, 'failure-stage');
				index += 1;
				break;
			case '--log-file':
				result.logFile = resolveRepoRelativePath(value, 'log-file');
				index += 1;
				break;
			case '--summary-file':
				result.summaryFile = assertString(value, 'summary-file');
				index += 1;
				break;
			case '--json-file':
				result.jsonFile = assertString(value, 'json-file');
				index += 1;
				break;
			case '--artifact':
				result.artifacts.push(parseArtifact(value));
				index += 1;
				break;
			case '--note':
				result.notes.push(assertString(value, 'note'));
				index += 1;
				break;
			default:
				throw new Error(`Unknown suite argument: ${arg}`);
		}
	}

	if (!result.suite) {
		throw new Error('suite mode requires --suite');
	}

	if (!result.status) {
		throw new Error('suite mode requires --status');
	}

	if (!result.summaryFile) {
		throw new Error('suite mode requires --summary-file');
	}

	if (!result.jsonFile) {
		throw new Error('suite mode requires --json-file');
	}

	return result;
}

function parseAggregateArgs(argv) {
	const result = {
		inputDir: null,
		summaryFile: null,
		jsonFile: null,
		expectedSuites: []
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const value = argv[index + 1];

		switch (arg) {
			case '--input-dir':
				result.inputDir = assertString(value, 'input-dir');
				index += 1;
				break;
			case '--summary-file':
				result.summaryFile = assertString(value, 'summary-file');
				index += 1;
				break;
			case '--json-file':
				result.jsonFile = assertString(value, 'json-file');
				index += 1;
				break;
			case '--expected-suite':
				result.expectedSuites.push(assertString(value, 'expected-suite'));
				index += 1;
				break;
			default:
				throw new Error(`Unknown aggregate argument: ${arg}`);
		}
	}

	if (!result.inputDir) {
		throw new Error('aggregate mode requires --input-dir');
	}

	if (!result.summaryFile) {
		throw new Error('aggregate mode requires --summary-file');
	}

	if (!result.jsonFile) {
		throw new Error('aggregate mode requires --json-file');
	}

	return result;
}

function formatDuration(durationMs) {
	if (durationMs == null) {
		return 'n/a';
	}

	return `${(durationMs / 1000).toFixed(1)}s`;
}

function writeOutput(path, content) {
	const absolutePath = resolve(process.cwd(), path);
	mkdirSync(dirname(absolutePath), { recursive: true });
	writeFileSync(absolutePath, content);
}

function renderSuiteMarkdown(report) {
	const lines = [`# Nightly Suite: ${report.suite}`, ''];

	lines.push(`- Status: ${report.status}`);
	lines.push(`- Duration: ${formatDuration(report.durationMs)}`);

	if (report.failureStage) {
		lines.push(`- Failure stage: ${report.failureStage}`);
	}

	if (report.command) {
		lines.push(`- Command: \`${report.command}\``);
	}

	if (report.logFile) {
		lines.push(`- Primary log: \`${report.logFile}\``);
	}

	if (report.artifacts.length > 0) {
		lines.push('');
		lines.push('## Artifacts');
		lines.push('');

		for (const artifact of report.artifacts) {
			lines.push(`- ${artifact.label}: \`${artifact.path}\``);
		}
	}

	if (report.notes.length > 0) {
		lines.push('');
		lines.push('## Notes');
		lines.push('');

		for (const note of report.notes) {
			lines.push(`- ${note}`);
		}
	}

	return `${lines.join('\n')}\n`;
}

function renderAggregateMarkdown(report) {
	const lines = ['# Nightly Full Parity Summary', ''];

	lines.push(`- Overall status: ${report.ok ? 'success' : 'failure'}`);
	lines.push(`- Generated at: ${report.generatedAt}`);

	if (report.missingSuites.length > 0) {
		lines.push(`- Missing suite artifacts: ${report.missingSuites.join(', ')}`);
	}

	lines.push('');
	lines.push('| Suite | Status | Duration | Failure stage |');
	lines.push('| --- | --- | --- | --- |');

	for (const suite of report.suites) {
		lines.push(
			`| ${suite.suite} | ${suite.status} | ${formatDuration(suite.durationMs)} | ${suite.failureStage ?? 'n/a'} |`
		);
	}

	if (report.suites.length > 0) {
		lines.push('');
		lines.push('## Suite Artifacts');
		lines.push('');

		for (const suite of report.suites) {
			lines.push(`### ${suite.suite}`);
			lines.push('');
			lines.push(`- Status: ${suite.status}`);

			if (suite.command) {
				lines.push(`- Command: \`${suite.command}\``);
			}

			for (const artifact of suite.artifacts) {
				lines.push(`- ${artifact.label}: \`${artifact.path}\``);
			}

			for (const note of suite.notes) {
				lines.push(`- Note: ${note}`);
			}

			lines.push('');
		}
	}

	return `${lines.join('\n')}\n`;
}

function collectFiles(rootDirectory, fileName) {
	const files = [];

	for (const entry of readdirSync(rootDirectory)) {
		const entryPath = resolve(rootDirectory, entry);
		const stats = statSync(entryPath);

		if (stats.isDirectory()) {
			files.push(...collectFiles(entryPath, fileName));
			continue;
		}

		if (stats.isFile() && entry === fileName) {
			files.push(entryPath);
		}
	}

	return files.sort((left, right) => left.localeCompare(right));
}

function readJsonFile(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function runSuiteMode(argv) {
	const options = parseSuiteArgs(argv);
	const report = {
		suite: options.suite,
		status: options.status,
		ok: options.status === 'success',
		command: options.command,
		durationMs: options.durationMs,
		failureStage: options.failureStage,
		logFile: options.logFile,
		artifacts: options.artifacts,
		notes: options.notes,
		generatedAt: new Date().toISOString()
	};

	writeOutput(options.jsonFile, `${JSON.stringify(report, null, 2)}\n`);
	writeOutput(options.summaryFile, renderSuiteMarkdown(report));
}

function runAggregateMode(argv) {
	const options = parseAggregateArgs(argv);
	const inputDirectory = resolve(process.cwd(), options.inputDir);
	const statusFiles = collectFiles(inputDirectory, 'status.json');
	const suites = statusFiles.map((path) => readJsonFile(path));
	const bySuite = new Map(suites.map((suite) => [suite.suite, suite]));
	const orderedSuites = [
		...options.expectedSuites
			.map((suiteName) => bySuite.get(suiteName))
			.filter((suite) => suite != null),
		...suites
			.filter((suite) => !options.expectedSuites.includes(suite.suite))
			.sort((left, right) => left.suite.localeCompare(right.suite))
	];
	const missingSuites = options.expectedSuites.filter((suiteName) => !bySuite.has(suiteName));
	const report = {
		ok: missingSuites.length === 0 && orderedSuites.every((suite) => suite.status === 'success'),
		generatedAt: new Date().toISOString(),
		missingSuites,
		suites: orderedSuites
	};

	writeOutput(options.jsonFile, `${JSON.stringify(report, null, 2)}\n`);
	writeOutput(options.summaryFile, renderAggregateMarkdown(report));
}

function main() {
	const [mode, ...args] = process.argv.slice(2);

	if (mode === 'suite') {
		runSuiteMode(args);
		return;
	}

	if (mode === 'aggregate') {
		runAggregateMode(args);
		return;
	}

	throw new Error(`Expected mode "suite" or "aggregate", received: ${mode ?? 'undefined'}`);
}

main();
