import { basename } from 'node:path';

const suiteNameMap = new Map([
	['parse-blocks-reference.bench.ts', 'Parse Blocks'],
	['remend-reference.bench.ts', 'Remend Parser'],
	['streamdown-render-reference.bench.ts', 'Stream Render'],
	['table-utils-reference.bench.ts', 'Table Utilities']
]);

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const signedNumber = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
	signDisplay: 'always'
});

function formatDeltaPercent(value) {
	return `${signedNumber.format(value)}%`;
}

export function labelSuite(filePath) {
	const file = basename(filePath);
	const knownName = suiteNameMap.get(file);
	if (knownName) {
		return knownName;
	}

	return file
		.replace(/-reference\.bench\.ts$/, '')
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function labelScenario(fullName, filePath) {
	const file = basename(filePath);
	const prefix = `${file} > `;
	if (fullName.startsWith(prefix)) {
		return fullName.slice(prefix.length);
	}

	const parts = fullName.split(' > ');
	return parts.length > 1 ? parts.slice(1).join(' / ') : fullName;
}

export function geometricMean(values) {
	if (values.length === 0) {
		return Number.NaN;
	}

	return Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
}

export function extractComparisons(report) {
	const comparisons = [];

	for (const file of report.files ?? []) {
		for (const group of file.groups ?? []) {
			const local = group.benchmarks?.find((benchmark) => benchmark.name === 'local');
			const reference = group.benchmarks?.find((benchmark) => benchmark.name === 'reference');
			if (!local || !reference || !local.hz || !reference.hz) {
				continue;
			}

			const suite = labelSuite(file.filepath);
			const scenario = labelScenario(group.fullName, file.filepath);
			const ratio = local.hz / reference.hz;

			comparisons.push({
				file: basename(file.filepath),
				filepath: file.filepath,
				suite,
				scenario,
				id: `${suite}::${scenario}`,
				localHz: local.hz,
				referenceHz: reference.hz,
				localRme: local.rme ?? null,
				referenceRme: reference.rme ?? null,
				ratio,
				deltaPercent: (ratio - 1) * 100,
				winner: ratio >= 1 ? 'local' : 'reference'
			});
		}
	}

	return comparisons;
}

export function aggregateBySuite(comparisons) {
	return Array.from(
		comparisons.reduce((groups, comparison) => {
			const entries = groups.get(comparison.suite) ?? [];
			entries.push(comparison);
			groups.set(comparison.suite, entries);
			return groups;
		}, new Map())
	)
		.map(([suite, entries]) => {
			const ratio = geometricMean(entries.map((entry) => entry.ratio));
			const localWins = entries.filter((entry) => entry.winner === 'local').length;

			return {
				suite,
				pairs: entries.length,
				ratio,
				deltaPercent: (ratio - 1) * 100,
				localWins,
				referenceWins: entries.length - localWins,
				bestCase: entries.reduce((best, entry) =>
					!best || entry.deltaPercent > best.deltaPercent ? entry : best
				),
				worstCase: entries.reduce((worst, entry) =>
					!worst || entry.deltaPercent < worst.deltaPercent ? entry : worst
				)
			};
		})
		.sort((left, right) => right.deltaPercent - left.deltaPercent);
}

export function summarizeComparisons(comparisons) {
	const ratio = geometricMean(comparisons.map((entry) => entry.ratio));
	const localWins = comparisons.filter((entry) => entry.winner === 'local').length;
	return {
		pairs: comparisons.length,
		localWins,
		referenceWins: comparisons.length - localWins,
		ratio,
		deltaPercent: (ratio - 1) * 100
	};
}

function escapeXml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

export function renderBarChartSvg({ title, subtitle, caption, rows }) {
	const leftGutter = 340;
	const rightGutter = 220;
	const chartWidth = 620;
	const topGutter = 120;
	const rowGap = 14;
	const rowHeight = 26;
	const footerHeight = 56;
	const width = leftGutter + chartWidth + rightGutter;
	const height = topGutter + rows.length * (rowHeight + rowGap) + footerHeight;
	const centerX = leftGutter + chartWidth / 2;
	const maxAbs = Math.max(5, ...rows.map((row) => Math.abs(row.value)));
	const pixelsPerPercent = chartWidth / 2 / maxAbs;
	const axisTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs].map((value) =>
		Math.round(value * 10) / 10
	);

	const svgRows = rows
		.map((row, index) => {
			const y = topGutter + index * (rowHeight + rowGap);
			const barWidth = Math.abs(row.value) * pixelsPerPercent;
			const barX = row.value >= 0 ? centerX : centerX - barWidth;
			const labelY = y + rowHeight / 2 + 1;
			const valueText = `${formatDeltaPercent(row.value)} (${number.format(row.ratio)}x)`;
			const valueX =
				row.value >= 0 ? clamp(barX + barWidth + 12, centerX + 12, width - 12) : clamp(barX - 12, 180, centerX - 12);
			const valueAnchor = row.value >= 0 ? 'start' : 'end';
			const detailX = width - 16;

			return `
		<text x="${leftGutter - 16}" y="${labelY}" text-anchor="end" fill="#0f172a" font-size="15" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(row.label)}</text>
		<rect x="${barX}" y="${y}" width="${Math.max(barWidth, 1)}" height="${rowHeight}" rx="6" fill="${row.value >= 0 ? '#16a34a' : '#dc2626'}" opacity="0.9" />
		<text x="${valueX}" y="${labelY}" text-anchor="${valueAnchor}" fill="#0f172a" font-size="14" font-family="ui-monospace, SFMono-Regular, monospace">${escapeXml(valueText)}</text>
		<text x="${detailX}" y="${labelY}" text-anchor="end" fill="#475569" font-size="13" font-family="ui-monospace, SFMono-Regular, monospace">${escapeXml(row.detail)}</text>`;
		})
		.join('\n');

	const axisLines = axisTicks
		.map((tick) => {
			const x = centerX + tick * pixelsPerPercent;
			return `
		<line x1="${x}" y1="${topGutter - 18}" x2="${x}" y2="${height - footerHeight}" stroke="${tick === 0 ? '#0f172a' : '#cbd5e1'}" stroke-width="${tick === 0 ? 2 : 1}" />
		<text x="${x}" y="${topGutter - 28}" text-anchor="middle" fill="#475569" font-size="12" font-family="ui-monospace, SFMono-Regular, monospace">${escapeXml(formatDeltaPercent(tick))}</text>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
	<title>${escapeXml(title)}</title>
	<desc>${escapeXml(subtitle)}</desc>
	<rect width="${width}" height="${height}" fill="#f8fafc" />
	<text x="24" y="40" fill="#020617" font-size="28" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(title)}</text>
	<text x="24" y="68" fill="#334155" font-size="15" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(subtitle)}</text>
	<text x="24" y="92" fill="#64748b" font-size="13" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(caption)}</text>
	${axisLines}
	${svgRows}
	<text x="24" y="${height - 20}" fill="#64748b" font-size="12" font-family="ui-sans-serif, system-ui, sans-serif">Green = local faster, red = reference faster. Metric uses throughput delta: ((local hz / reference hz) - 1) * 100.</text>
</svg>`;
}

function formatHz(hz) {
	if (hz >= 1_000_000) {
		return `${number.format(hz / 1_000_000)}M hz`;
	}

	if (hz >= 1_000) {
		return `${number.format(hz / 1_000)}k hz`;
	}

	return `${number.format(hz)} hz`;
}

function formatRme(rme) {
	if (typeof rme !== 'number') {
		return 'n/a';
	}

	return `${number.format(rme)}%`;
}

export function toSuiteChartRows(suites) {
	return suites.map((suite) => ({
		label: suite.suite,
		value: suite.deltaPercent,
		ratio: suite.ratio,
		detail: `${suite.localWins}/${suite.pairs} wins`
	}));
}

export function toScenarioChartRows(comparisons) {
	return comparisons
		.toSorted((left, right) => right.deltaPercent - left.deltaPercent)
		.map((comparison) => ({
			label: `${comparison.suite} - ${comparison.scenario}`,
			value: comparison.deltaPercent,
			ratio: comparison.ratio,
			detail: `${formatHz(comparison.localHz)} vs ${formatHz(comparison.referenceHz)}`
		}));
}

export function buildMarkdownReport({
	sourcePath,
	overall,
	suites,
	comparisons,
	platform,
	suiteChartPath,
	scenarioChartPath
}) {
	const topImprovements = comparisons.toSorted((left, right) => right.deltaPercent - left.deltaPercent).slice(0, 5);
	const topRegressions = comparisons.toSorted((left, right) => left.deltaPercent - right.deltaPercent).slice(0, 5);

	return `# Benchmark Comparison Report

- Generated: ${platform.generatedAt}
- Source JSON: \`${sourcePath}\`
- Platform: ${platform.platform}
- CPU: ${platform.cpu}
- Memory: ${platform.memory}
- Runtime: Node ${platform.nodeVersion} | pnpm ${platform.pnpmVersion}
- Git: \`${platform.gitBranch}\` @ \`${platform.gitCommit}\`

## Overall

- Pairs: ${overall.pairs}
- Local wins: ${overall.localWins}
- Reference wins: ${overall.referenceWins}
- Geometric mean throughput: ${number.format(overall.ratio)}x (${formatDeltaPercent(overall.deltaPercent)})

## Charts

![Benchmark comparison by suite](${suiteChartPath})

![Benchmark comparison by scenario](${scenarioChartPath})

## By Suite

| Suite | Pairs | Local wins | Geometric mean | Delta |
| --- | ---: | ---: | ---: | ---: |
${suites.map((suite) => `| ${suite.suite} | ${suite.pairs} | ${suite.localWins} | ${number.format(suite.ratio)}x | ${formatDeltaPercent(suite.deltaPercent)} |`).join('\n')}

## Top Improvements

| Scenario | Delta | Ratio | Local | Reference | RME(local/ref) |
| --- | ---: | ---: | ---: | ---: | ---: |
${topImprovements.map((comparison) => `| ${comparison.suite} / ${comparison.scenario} | ${formatDeltaPercent(comparison.deltaPercent)} | ${number.format(comparison.ratio)}x | ${formatHz(comparison.localHz)} | ${formatHz(comparison.referenceHz)} | ${formatRme(comparison.localRme)} / ${formatRme(comparison.referenceRme)} |`).join('\n')}

## Top Regressions

| Scenario | Delta | Ratio | Local | Reference | RME(local/ref) |
| --- | ---: | ---: | ---: | ---: | ---: |
${topRegressions.map((comparison) => `| ${comparison.suite} / ${comparison.scenario} | ${formatDeltaPercent(comparison.deltaPercent)} | ${number.format(comparison.ratio)}x | ${formatHz(comparison.localHz)} | ${formatHz(comparison.referenceHz)} | ${formatRme(comparison.localRme)} / ${formatRme(comparison.referenceRme)} |`).join('\n')}

## Full Scenario Breakdown

| Suite | Scenario | Winner | Delta | Ratio | Local | Reference |
| --- | --- | --- | ---: | ---: | ---: | ---: |
${comparisons.toSorted((left, right) => right.deltaPercent - left.deltaPercent).map((comparison) => `| ${comparison.suite} | ${comparison.scenario} | ${comparison.winner} | ${formatDeltaPercent(comparison.deltaPercent)} | ${number.format(comparison.ratio)}x | ${formatHz(comparison.localHz)} | ${formatHz(comparison.referenceHz)} |`).join('\n')}
`;
}

export function buildJsonReport({ overall, suites, comparisons, platform, artifacts }) {
	return {
		generatedAt: platform.generatedAt,
		platform,
		overall,
		suites,
		comparisons,
		artifacts
	};
}
