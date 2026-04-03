const BUG_FIX_LABEL = 'Bug fix';
const COVERAGE_PATH_LABEL = 'Coverage path';
const COVERAGE_TYPE_LABEL = 'Coverage type';
const REGISTRY_PATH = 'fixtures/parity/fixture-registry.ts';

/**
 * @typedef {{ filename: string; status: string }} ChangedFile
 * @typedef {{ isBugFix: boolean; coveragePath: string; coverageType: string }} PullRequestMetadata
 * @typedef {{ body: string; changedFiles: ChangedFile[] }} RegressionCoverageInput
 * @typedef {PullRequestMetadata & { shouldValidate: boolean; problems: string[] }} RegressionCoverageResult
 */

const parityFixturePattern =
	/^fixtures\/parity\/(?:markdown|interactions)\/\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const regressionTestPattern = /^(?:tests|src\/tests)\/.+\.(?:test|spec)\.[^.\/]+$/;

/** @param {string} value */
export function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} value */
export function isMeaningfulValue(value) {
	const normalized = value.trim().toLowerCase();
	return normalized.length > 0 && !['n/a', 'na', 'none', 'tbd', 'todo'].includes(normalized);
}

/** @param {string} value */
export function normalizeFieldValue(value) {
	const trimmed = value.trim();
	const codeMatch = trimmed.match(/^`(.+)`$/);
	return codeMatch ? codeMatch[1].trim() : trimmed;
}

/**
 * @param {string} body
 * @returns {PullRequestMetadata}
 */
export function parsePullRequestTemplate(body) {
	const checkedItems = new Set(
		Array.from(body.matchAll(/^- \[(x|X)\] (.+)$/gm), (match) => match[2]?.trim() ?? '').filter(
			Boolean
		)
	);

	/** @param {string} label */
	const readField = (label) => {
		const pattern = new RegExp(`^- ${escapeRegExp(label)}:\\s*(.*)$`, 'mi');
		const match = body.match(pattern);
		return normalizeFieldValue(match?.[1] ?? '');
	};

	return {
		isBugFix: checkedItems.has(BUG_FIX_LABEL),
		coveragePath: readField(COVERAGE_PATH_LABEL),
		coverageType: readField(COVERAGE_TYPE_LABEL)
	};
}

/** @param {string} path */
export function isRegressionCoveragePath(path) {
	return parityFixturePattern.test(path) || regressionTestPattern.test(path);
}

/** @param {ChangedFile | undefined} file */
export function isDurableCoverageFile(file) {
	return file != null && file.status !== 'removed';
}

/**
 * @param {RegressionCoverageInput} input
 * @returns {RegressionCoverageResult}
 */
export function validateRegressionCoverage({ body, changedFiles }) {
	const metadata = parsePullRequestTemplate(body);
	if (!metadata.isBugFix) {
		return {
			...metadata,
			shouldValidate: false,
			problems: []
		};
	}

	const problems = [];
	/** @type {Map<string, ChangedFile>} */
	const changedFileMap = new Map(changedFiles.map((file) => [file.filename, file]));

	if (!isMeaningfulValue(metadata.coveragePath)) {
		problems.push(
			'`Coverage path` must point to the regression fixture or test added for this bug fix.'
		);
	} else if (!isRegressionCoveragePath(metadata.coveragePath)) {
		problems.push(
			'`Coverage path` must point to a parity fixture in `fixtures/parity/` or a regression test file in `tests/` or `src/tests/`.'
		);
	}

	const coverageFile = changedFileMap.get(metadata.coveragePath);
	if (isMeaningfulValue(metadata.coveragePath) && isRegressionCoveragePath(metadata.coveragePath)) {
		if (!isDurableCoverageFile(coverageFile)) {
			problems.push(
				'`Coverage path` must match a regression fixture or test file that is added or updated in this PR.'
			);
		}
	}

	if (!isMeaningfulValue(metadata.coverageType)) {
		problems.push(
			'`Coverage type` must describe the regression asset, for example shared parity fixture, unit test, browser test, or ported upstream regression test.'
		);
	}

	if (
		coverageFile?.status === 'added' &&
		metadata.coveragePath.startsWith('fixtures/parity/') &&
		!changedFileMap.has(REGISTRY_PATH)
	) {
		problems.push(
			'New shared parity fixtures must also update `fixtures/parity/fixture-registry.ts` so the fixture becomes a durable shared asset.'
		);
	}

	return {
		...metadata,
		shouldValidate: true,
		problems
	};
}
