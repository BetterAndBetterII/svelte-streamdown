import { expect, test, type Page } from '@playwright/test';
import { domParityFixtureIds } from '../../../fixtures/parity/fixture-registry.js';

const referenceBaseUrl = process.env.PARITY_REFERENCE_URL ?? 'http://127.0.0.1:4173';
const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';

const expandedRenderingFixtureIds = [
	'15-composite-playground.md',
	'16-html-entities-and-cjk.md',
	'17-math-rendering.md'
] as const;

test.describe('expanded rendering parity fixtures', () => {
	test.describe.configure({ mode: 'parallel' });

	test('tracks the expanded rendering fixture set', () => {
		expect(domParityFixtureIds).toEqual([
			'01-headings-and-inline.md',
			'02-ordered-task-list.md',
			'03-gfm-table.md',
			'04-blockquote.md',
			'05-unordered-list.md',
			'06-code-fence.md',
			'07-heading-and-emphasis.md',
			'08-blockquote-plain.md',
			'09-paragraphs.md',
			'15-composite-playground.md',
			'16-html-entities-and-cjk.md',
			'17-math-rendering.md'
		]);
	});

	for (const fixtureId of expandedRenderingFixtureIds) {
		test(`matches targeted rendering parity for fixture ${fixtureId}`, async ({ browser }) => {
			const context = await browser.newContext();
			const referencePage = await context.newPage();
			const localPage = await context.newPage();
			const fixtureRoute = `/?fixture=${encodeURIComponent(fixtureId)}`;

			try {
				await Promise.all([
					openParityFixture(referencePage, `${referenceBaseUrl}${fixtureRoute}`),
					openParityFixture(localPage, `${localBaseUrl}${fixtureRoute}`)
				]);

				if (fixtureId === '15-composite-playground.md') {
					await assertCompositePlaygroundParity(referencePage, localPage);
				} else if (fixtureId === '16-html-entities-and-cjk.md') {
					await assertHtmlEntitiesAndCjkParity(referencePage, localPage);
				} else {
					await assertMathParity(referencePage, localPage);
				}
			} finally {
				await context.close();
			}
		});
	}
});

async function openParityFixture(
	page: import('@playwright/test').Page,
	url: string
): Promise<void> {
	await page.goto(url, { waitUntil: 'networkidle' });
	await expect(page.locator(renderedSelector)).toBeVisible();
}

async function assertCompositePlaygroundParity(
	referencePage: Page,
	localPage: Page
): Promise<void> {
	const expectedTextSnippets = [
		'Formatting',
		'Task List',
		'Table',
		'Code',
		'FeatureStatusNotes',
		'MarkdownReadyCommonMark + GFM',
		'PluginsReadyCode, math, mermaid, CJK',
		'values.reduce((total, value) => total + value, 0);'
	];

	for (const snippet of expectedTextSnippets) {
		await Promise.all([
			expect(referencePage.locator(renderedSelector)).toContainText(snippet),
			expect(localPage.locator(renderedSelector)).toContainText(snippet)
		]);
	}

	await Promise.all([
		expect(referencePage.locator(`${renderedSelector} input[type="checkbox"]`)).toHaveCount(3),
		expect(localPage.locator(`${renderedSelector} input[type="checkbox"]`)).toHaveCount(3),
		expect(referencePage.getByTitle('Copy table')).toHaveCount(1),
		expect(localPage.getByTitle('Copy table')).toHaveCount(1),
		expect(referencePage.getByTitle('Download table')).toHaveCount(1),
		expect(localPage.getByTitle('Download table')).toHaveCount(1),
		expect(referencePage.getByTitle('Copy Code')).toHaveCount(1),
		expect(localPage.getByTitle('Copy Code')).toHaveCount(1),
		expect(referencePage.getByTitle('Download file')).toHaveCount(1),
		expect(localPage.getByTitle('Download file')).toHaveCount(1)
	]);
}

async function assertHtmlEntitiesAndCjkParity(referencePage: Page, localPage: Page): Promise<void> {
	await Promise.all([
		expect(referencePage.locator(renderedSelector)).toContainText(
			'Entities should render as text: © 2026 — Streamdown • Built with ♥'
		),
		expect(localPage.locator(renderedSelector)).toContainText(
			'Entities should render as text: © 2026 — Streamdown • Built with ♥'
		),
		expect(referencePage.locator(renderedSelector)).toContainText('& Entity Link'),
		expect(localPage.locator(renderedSelector)).toContainText('& Entity Link'),
		expect(referencePage.locator(renderedSelector)).toContainText(
			'この文は太字になります（括弧付き）。続き'
		),
		expect(localPage.locator(renderedSelector)).toContainText(
			'この文は太字になります（括弧付き）。続き'
		),
		expect(referencePage.locator(renderedSelector)).toContainText('这是斜体文字（带括号）。后续'),
		expect(localPage.locator(renderedSelector)).toContainText('这是斜体文字（带括号）。后续'),
		expect(referencePage.locator(renderedSelector)).toContainText(
			'이 문장은 취소선입니다（괄호 포함）。계속'
		),
		expect(localPage.locator(renderedSelector)).toContainText(
			'이 문장은 취소선입니다（괄호 포함）。계속'
		)
	]);
}

async function assertMathParity(referencePage: Page, localPage: Page): Promise<void> {
	const [referenceKatexCount, localKatexCount, referenceDisplayCount, localDisplayCount] =
		await Promise.all([
			referencePage.locator(`${renderedSelector} .katex`).count(),
			localPage.locator(`${renderedSelector} .katex`).count(),
			referencePage.locator(`${renderedSelector} .katex-display`).count(),
			localPage.locator(`${renderedSelector} .katex-display`).count()
		]);

	expect(referenceKatexCount).toBeGreaterThan(0);
	expect(localKatexCount).toBeGreaterThan(0);
	expect(referenceDisplayCount).toBeGreaterThan(0);
	expect(localDisplayCount).toBeGreaterThan(0);
}
