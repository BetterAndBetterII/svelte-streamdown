import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildParityRoute } from '../../../apps/parity-shared/query.js';
import {
	parityFixtureIds,
	parityFixturePaths,
	type ParityFixtureId
} from '../../../fixtures/parity/fixture-registry.js';
import { formatNormalizedDom, normalizeDom } from './normalize-dom.js';

type ParityHarnessSnapshot = {
	caret: string;
	caretPlaceholderCount: number;
	disabledButtonCount: number;
	incompleteCount: number;
	interactiveButtonCount: number;
	mode: string;
	fixtureId: string;
	isAnimating: string;
	text: string;
};

type RenderSnapshot = {
	dump: string;
	formattedDom: string;
	summary: ParityHarnessSnapshot;
};

type StreamingCheckpoint = {
	charCount: number;
	markdown: string;
};

const referenceBaseUrl = process.env.PARITY_REFERENCE_URL ?? 'http://127.0.0.1:4173';
const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';
const fixtureDirectory = fileURLToPath(new URL('../../../fixtures/parity/', import.meta.url));
const selectedFixtureIds = selectStreamingFixtureIds([...parityFixtureIds]);

test.describe('browser streaming parity against frozen streamdown reference', () => {
	test('tracks the shared fixture corpus used for streaming parity', () => {
		expect(selectedFixtureIds.length).toBeGreaterThan(0);
		expect(selectedFixtureIds.every((fixtureId) => parityFixtureIds.includes(fixtureId))).toBe(
			true
		);
		if (
			!process.env.PARITY_STREAMING_FIXTURE_FILTER &&
			!process.env.PARITY_STREAMING_FIXTURES &&
			!process.env.PARITY_STREAMING_MAX_FIXTURES
		) {
			expect(selectedFixtureIds).toEqual([...parityFixtureIds]);
		}
	});

	for (const fixtureId of selectedFixtureIds) {
		test(`matches streaming checkpoints for fixture ${fixtureId}`, async ({ browser }) => {
			const markdown = readFixtureMarkdown(fixtureId);
			const checkpoints = buildStreamingCheckpoints(markdown);
			const mismatchReports: string[] = [];
			let mismatchCount = 0;
			const context = await browser.newContext();
			const referencePage = await context.newPage();
			const localPage = await context.newPage();

			try {
				await Promise.all([
					openParityFixture(referencePage, referenceBaseUrl, fixtureId),
					openParityFixture(localPage, localBaseUrl, fixtureId)
				]);

				for (const [checkpointIndex, checkpoint] of checkpoints.entries()) {
					const update = {
						fixtureId,
						markdown: checkpoint.markdown,
						mode: 'streaming' as const,
						isAnimating: checkpoint.charCount < Array.from(markdown).length,
						caret: 'block' as const
					};

					await Promise.all([
						setParityState(referencePage, update),
						setParityState(localPage, update)
					]);

					await Promise.all([
						expect(referencePage.locator('[data-parity-source]')).toHaveValue(checkpoint.markdown),
						expect(localPage.locator('[data-parity-source]')).toHaveValue(checkpoint.markdown),
						expect(referencePage.locator('[data-parity-mode]')).toHaveText('streaming'),
						expect(localPage.locator('[data-parity-mode]')).toHaveText('streaming')
					]);

					const [referenceState, localState, referenceSnapshot, localSnapshot] = await Promise.all([
						readParityState(referencePage),
						readParityState(localPage),
						readRenderSnapshot(referencePage.locator(renderedSelector)),
						readRenderSnapshot(localPage.locator(renderedSelector))
					]);

					if (localSnapshot.dump !== referenceSnapshot.dump) {
						mismatchCount += 1;
						if (mismatchReports.length < 5) {
							mismatchReports.push(
								formatStreamingParityFailure({
									fixtureId,
									markdown,
									checkpoint,
									checkpointIndex,
									checkpointCount: checkpoints.length,
									referenceState,
									localState,
									referenceSnapshot,
									localSnapshot
								})
							);
						}
					}
				}

				expect(
					mismatchCount,
					formatMismatchSummary({
						fixtureId,
						mismatchCount,
						reportedMismatchCount: mismatchReports.length,
						reports: mismatchReports
					})
				).toBe(0);
			} finally {
				await context.close();
			}
		});
	}
});

function selectStreamingFixtureIds(fixtureIds: readonly ParityFixtureId[]): ParityFixtureId[] {
	let selected = [...fixtureIds];
	const rawRegexFilter = process.env.PARITY_STREAMING_FIXTURE_FILTER?.trim();
	const rawExplicitList = process.env.PARITY_STREAMING_FIXTURES?.trim();
	const rawMaxFixtures = process.env.PARITY_STREAMING_MAX_FIXTURES?.trim();

	if (rawRegexFilter) {
		const pattern = new RegExp(rawRegexFilter, 'i');
		selected = selected.filter((fixtureId) => pattern.test(fixtureId));
	}

	if (rawExplicitList) {
		const wantedIds = new Set(
			rawExplicitList
				.split(',')
				.map((value) => value.trim())
				.filter((value) => value.length > 0)
		);
		selected = selected.filter((fixtureId) => wantedIds.has(fixtureId));
	}

	if (rawMaxFixtures) {
		const maxFixtures = Number.parseInt(rawMaxFixtures, 10);
		if (Number.isInteger(maxFixtures) && maxFixtures >= 0) {
			selected = selected.slice(0, maxFixtures);
		}
	}

	return selected;
}

function readFixtureMarkdown(fixtureId: string): string {
	const fixturePath = parityFixturePaths[fixtureId as keyof typeof parityFixturePaths];
	return readFileSync(resolve(fixtureDirectory, fixturePath), 'utf8');
}

function buildStreamingCheckpoints(markdown: string): StreamingCheckpoint[] {
	const characters = Array.from(markdown);
	const totalCharacters = characters.length;
	const checkpointSet = new Set<number>([0, totalCharacters]);

	if (totalCharacters <= 120) {
		for (let index = 1; index < totalCharacters; index += 1) {
			checkpointSet.add(index);
		}
	} else {
		addRange(checkpointSet, 1, Math.min(totalCharacters, 48));
		addRange(checkpointSet, Math.max(1, totalCharacters - 24), totalCharacters);

		for (let index = 1; index <= totalCharacters; index += 1) {
			if (characters[index - 1] === '\n') {
				checkpointSet.add(index);
			}
		}

		for (let step = 1; step < 10; step += 1) {
			checkpointSet.add(Math.floor((totalCharacters * step) / 10));
		}

		for (let index = 32; index < totalCharacters; index += 32) {
			checkpointSet.add(index);
		}
	}

	const limitedCheckpoints = limitCheckpoints(
		[...checkpointSet].sort((left, right) => left - right)
	);
	return limitedCheckpoints.map((charCount) => ({
		charCount,
		markdown: characters.slice(0, charCount).join('')
	}));
}

function addRange(checkpointSet: Set<number>, start: number, end: number): void {
	for (let index = start; index < end; index += 1) {
		checkpointSet.add(index);
	}
}

function limitCheckpoints(checkpoints: number[]): number[] {
	const rawMaxCheckpoints = process.env.PARITY_STREAMING_MAX_STEPS?.trim();
	if (!rawMaxCheckpoints) {
		return checkpoints;
	}

	const maxCheckpoints = Number.parseInt(rawMaxCheckpoints, 10);
	if (
		!Number.isInteger(maxCheckpoints) ||
		maxCheckpoints <= 0 ||
		checkpoints.length <= maxCheckpoints
	) {
		return checkpoints;
	}
	if (maxCheckpoints === 1) {
		return [checkpoints.at(-1) ?? 0];
	}

	const limited = new Set<number>();
	for (let index = 0; index < maxCheckpoints; index += 1) {
		const sourceIndex = Math.round(((checkpoints.length - 1) * index) / (maxCheckpoints - 1));
		limited.add(checkpoints[sourceIndex]);
	}

	return [...limited].sort((left, right) => left - right);
}

async function openParityFixture(page: Page, baseUrl: string, fixtureId: string): Promise<void> {
	await page.goto(`${baseUrl}${buildParityRoute({ fixture: fixtureId })}`, {
		waitUntil: 'networkidle'
	});
	await expect(page.locator(renderedSelector)).toBeVisible();
	await waitForParityApi(page);
}

async function waitForParityApi(page: Page): Promise<void> {
	await page.waitForFunction(() =>
		Boolean((window as Window & { __STREAMDOWN_PARITY__?: unknown }).__STREAMDOWN_PARITY__)
	);
}

async function setParityState(
	page: Page,
	update: {
		fixtureId: string;
		markdown: string;
		mode: 'streaming';
		isAnimating: boolean;
		caret: 'block';
	}
): Promise<void> {
	await page.evaluate(async (nextUpdate) => {
		const parityApi = (
			window as Window & {
				__STREAMDOWN_PARITY__?: { setState: (update: typeof nextUpdate) => Promise<void> };
			}
		).__STREAMDOWN_PARITY__;
		if (!parityApi) {
			throw new Error('Missing window.__STREAMDOWN_PARITY__ API.');
		}

		await parityApi.setState(nextUpdate);
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	}, update);
}

async function readParityState(page: Page): Promise<Record<string, string | boolean>> {
	return page.evaluate(() => {
		const parityApi = (
			window as Window & {
				__STREAMDOWN_PARITY__?: { getState: () => Record<string, string | boolean> };
			}
		).__STREAMDOWN_PARITY__;
		if (!parityApi) {
			throw new Error('Missing window.__STREAMDOWN_PARITY__ API.');
		}

		return parityApi.getState();
	});
}

async function readRenderSnapshot(locator: Locator): Promise<RenderSnapshot> {
	const [formattedDom, summary] = await Promise.all([
		normalizeDom(locator).then((fragment) => formatNormalizedDom(fragment)),
		locator.evaluate((rootElement) => {
			const hostElement = rootElement.firstElementChild as HTMLElement | null;
			const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

			return {
				caret: hostElement?.style.getPropertyValue('--streamdown-caret') ?? '',
				caretPlaceholderCount: rootElement.querySelectorAll('[data-streamdown-caret-placeholder]')
					.length,
				disabledButtonCount: rootElement.querySelectorAll('button:disabled').length,
				fixtureId:
					rootElement
						.closest('[data-parity-app]')
						?.querySelector('[data-parity-fixture-id]')
						?.textContent?.trim() ?? '',
				incompleteCount: rootElement.querySelectorAll('[data-incomplete="true"]').length,
				interactiveButtonCount: rootElement.querySelectorAll('button').length,
				isAnimating:
					rootElement
						.closest('[data-parity-app]')
						?.querySelector('[data-parity-is-animating]')
						?.textContent?.trim() ?? '',
				mode:
					rootElement
						.closest('[data-parity-app]')
						?.querySelector('[data-parity-mode]')
						?.textContent?.trim() ?? '',
				text: normalizeText(rootElement.textContent ?? '')
			};
		})
	]);

	const dump = [
		'Normalized text:',
		summary.text.length > 0 ? summary.text : '<empty>',
		'',
		'Summary:',
		JSON.stringify(summary, null, 2),
		'',
		'Normalized DOM:',
		formattedDom
	].join('\n');

	return {
		dump,
		formattedDom,
		summary
	};
}

function formatStreamingParityFailure(input: {
	fixtureId: string;
	markdown: string;
	checkpoint: StreamingCheckpoint;
	checkpointIndex: number;
	checkpointCount: number;
	referenceState: Record<string, string | boolean>;
	localState: Record<string, string | boolean>;
	referenceSnapshot: RenderSnapshot;
	localSnapshot: RenderSnapshot;
}): string {
	const prefixPreview =
		input.checkpoint.markdown.length > 0 ? input.checkpoint.markdown : '<empty>';
	const totalCharacters = Array.from(input.markdown).length;

	return [
		`Streaming parity drift for fixture ${input.fixtureId}.`,
		`Checkpoint ${input.checkpointIndex + 1}/${input.checkpointCount} at ${input.checkpoint.charCount}/${totalCharacters} characters.`,
		formatFirstDifference('Snapshot', input.referenceSnapshot.dump, input.localSnapshot.dump),
		'',
		'Markdown prefix under test:',
		prefixPreview,
		'',
		'Reference harness state:',
		JSON.stringify(input.referenceState, null, 2),
		'',
		'Local harness state:',
		JSON.stringify(input.localState, null, 2),
		'',
		'Reference render snapshot:',
		input.referenceSnapshot.dump,
		'',
		'Local render snapshot:',
		input.localSnapshot.dump
	].join('\n');
}

function formatFirstDifference(label: string, expected: string, actual: string): string {
	if (expected === actual) {
		return `${label}: no textual difference detected despite mismatch.`;
	}

	const expectedLines = expected.split('\n');
	const actualLines = actual.split('\n');
	const maxLineCount = Math.max(expectedLines.length, actualLines.length);

	for (let index = 0; index < maxLineCount; index += 1) {
		const expectedLine = expectedLines[index] ?? '<missing>';
		const actualLine = actualLines[index] ?? '<missing>';
		if (expectedLine !== actualLine) {
			return `${label} first differs at line ${index + 1}: expected ${JSON.stringify(expectedLine)}, received ${JSON.stringify(actualLine)}`;
		}
	}

	return `${label}: mismatch detected but no differing line was identified.`;
}

function formatMismatchSummary(input: {
	fixtureId: string;
	mismatchCount: number;
	reportedMismatchCount: number;
	reports: string[];
}): string {
	if (input.mismatchCount === 0) {
		return `No mismatches recorded for fixture ${input.fixtureId}.`;
	}

	const hiddenMismatchCount = input.mismatchCount - input.reportedMismatchCount;
	return [
		`Fixture ${input.fixtureId} drifted at ${input.mismatchCount} streaming checkpoint(s).`,
		hiddenMismatchCount > 0
			? `Showing the first ${input.reportedMismatchCount}; ${hiddenMismatchCount} additional mismatch(es) were omitted.`
			: `Showing all ${input.reportedMismatchCount} mismatch(es).`,
		'',
		input.reports.join('\n\n---\n\n')
	].join('\n');
}
