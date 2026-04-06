import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildParityRoute } from '../../../apps/parity-shared/query.js';
import { formatNormalizedDom, normalizeDom } from '../parity/normalize-dom.js';

type CommonmarkExample = {
	end_line: number;
	example: number;
	html: string;
	markdown: string;
	section: string;
	start_line: number;
};

type NormalizedComparison = {
	formatted: string;
	matchesSpec: boolean;
};

const referenceBaseUrl = process.env.PARITY_REFERENCE_URL ?? 'http://127.0.0.1:4173';
const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';
const specPath = fileURLToPath(
	new URL('../../../references/commonmark/0.31.2/spec.json', import.meta.url)
);
const allExamples = JSON.parse(readFileSync(specPath, 'utf8')) as CommonmarkExample[];

const selectedExamples = selectCommonmarkExamples(allExamples);

test.describe('CommonMark parity against frozen reference streamdown', () => {
	test.describe.configure({ mode: 'parallel' });

	test('tracks the frozen CommonMark dataset metadata', () => {
		expect(allExamples).toHaveLength(652);
		expect(selectedExamples.length).toBeGreaterThan(0);
	});

	for (const example of selectedExamples) {
		test(
			`example ${example.example} (${example.section}) keeps local behavior aligned with reference`,
			async ({ browser }) => {
				const context = await browser.newContext();
				const referencePage = await context.newPage();
				const localPage = await context.newPage();
				const specPage = await context.newPage();
				const route = buildParityRoute({
					markdown: example.markdown,
					profile: 'commonmark'
				});

				try {
					await Promise.all([
						openParityPage(referencePage, `${referenceBaseUrl}${route}`),
						openParityPage(localPage, `${localBaseUrl}${route}`),
						openSpecPage(specPage, example.html)
					]);

					const [referenceResult, localResult, specDom] = await Promise.all([
						normalizeAgainstSpec(referencePage, specPage),
						normalizeAgainstSpec(localPage, specPage),
						readNormalizedDom(specPage.locator('#spec-root'))
					]);

					expect(
						localResult.formatted,
						formatComparisonFailure({
							example,
							local: localResult,
							reference: referenceResult,
							spec: specDom
						})
					).toBe(referenceResult.formatted);
				} finally {
					await context.close();
				}
			}
		);
	}
});

function selectCommonmarkExamples(examples: CommonmarkExample[]): CommonmarkExample[] {
	const rawSectionFilter = process.env.COMMONMARK_SECTION_FILTER?.trim();
	const rawExamplesFilter = process.env.COMMONMARK_EXAMPLES?.trim();
	const rawMaxExamples = process.env.COMMONMARK_MAX_EXAMPLES?.trim();

	let selected = examples;

	if (rawSectionFilter) {
		const sectionPattern = new RegExp(rawSectionFilter, 'i');
		selected = selected.filter((example) => sectionPattern.test(example.section));
	}

	if (rawExamplesFilter) {
		const wantedExamples = new Set(
			rawExamplesFilter
				.split(',')
				.map((value) => Number.parseInt(value.trim(), 10))
				.filter((value) => Number.isInteger(value))
		);
		selected = selected.filter((example) => wantedExamples.has(example.example));
	}

	if (rawMaxExamples) {
		const maxExamples = Number.parseInt(rawMaxExamples, 10);
		if (Number.isInteger(maxExamples) && maxExamples >= 0) {
			selected = selected.slice(0, maxExamples);
		}
	}

	return selected;
}

async function openParityPage(page: Page, url: string): Promise<void> {
	await page.goto(url, { waitUntil: 'networkidle' });
	await expect(page.locator(renderedSelector)).toBeVisible();
	await expect(page.locator('[data-parity-profile]')).toHaveText('commonmark');
	await page.locator(renderedSelector).evaluate((root) => {
		for (const header of root.querySelectorAll('[data-streamdown="code-block-header"]')) {
			header.remove();
		}
	});
}

async function openSpecPage(page: Page, html: string): Promise<void> {
	await page.setContent(`<main id="spec-root">${html}</main>`);
	await expect(page.locator('#spec-root')).toHaveCount(1);
}

async function normalizeAgainstSpec(
	page: Page,
	specPage: Page
): Promise<NormalizedComparison> {
	const [rendered, spec] = await Promise.all([
		readNormalizedDom(page.locator(renderedSelector)),
		readNormalizedDom(specPage.locator('#spec-root'))
	]);

	return {
		formatted: rendered,
		matchesSpec: rendered === spec
	};
}

async function readNormalizedDom(locator: ReturnType<Page['locator']>): Promise<string> {
	return formatNormalizedDom(await normalizeDom(locator));
}

function formatComparisonFailure(input: {
	example: CommonmarkExample;
	local: NormalizedComparison;
	reference: NormalizedComparison;
	spec: string;
}): string {
	const classification = classifyComparison(input.local.matchesSpec, input.reference.matchesSpec);

	return [
		`CommonMark example ${input.example.example} (${input.example.section}) drifted from reference.`,
		`Classification: ${classification}`,
		`Line range: ${input.example.start_line}-${input.example.end_line}`,
		'',
		'Markdown:',
		input.example.markdown,
		'',
		'Normalized spec DOM:',
		input.spec,
		'',
		'Normalized reference DOM:',
		input.reference.formatted,
		'',
		'Normalized local DOM:',
		input.local.formatted
	].join('\n');
}

function classifyComparison(localMatchesSpec: boolean, referenceMatchesSpec: boolean): string {
	if (localMatchesSpec && referenceMatchesSpec) {
		return 'local/reference mismatch while both independently match spec';
	}

	if (!localMatchesSpec && referenceMatchesSpec) {
		return 'local drift; reference matches spec';
	}

	if (localMatchesSpec && !referenceMatchesSpec) {
		return 'reference drift; local matches spec';
	}

	return 'shared spec drift; local and reference disagree with each other and with spec';
}
