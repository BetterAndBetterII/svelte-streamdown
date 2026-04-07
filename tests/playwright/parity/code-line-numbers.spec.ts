import { expect, test, type Page } from '@playwright/test';
import { buildParityRoute } from '../../../apps/parity-shared/query.js';

const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';

test.describe('code line number rendering', () => {
	test('renders startLine labels in separate non-overlapping rows', async ({ page }) => {
		const route = buildParityRoute({
			markdown: createCodeProbeMarkdown({
				startLine: 1,
				lineCount: 13
			})
		});

		await openParityFixture(page, `${localBaseUrl}${route}`);
		await assertLineNumberLayout(page, {
			lineCount: 13,
			startLine: 1
		});
	});
});

function createCodeProbeMarkdown({
	startLine,
	lineCount
}: {
	startLine: number;
	lineCount: number;
}): string {
	const lines = Array.from(
		{ length: lineCount },
		(_value, index) => `const v${index + 1} = ${index + 1};`
	);
	return `\`\`\`js startLine=${startLine}\n${lines.join('\n')}\n\`\`\``;
}

async function openParityFixture(page: Page, url: string): Promise<void> {
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.evaluate(async () => {
		if ('fonts' in document) {
			await document.fonts.ready;
		}
	});
	await expect(page.locator(renderedSelector)).toBeVisible();
}

async function assertLineNumberLayout(
	page: Page,
	{
		lineCount,
		startLine
	}: {
		lineCount: number;
		startLine: number;
	}
): Promise<void> {
	const lineLayout = await page.locator(renderedSelector).evaluate((root, expectedLineCount) => {
		const code = root.querySelector<HTMLElement>('[data-streamdown="code-block-body"] code');
		const lineElements = [...root.querySelectorAll<HTMLElement>('.sd-code-line')];

		if (!code || lineElements.length !== expectedLineCount) {
			throw new Error(
				`Expected ${expectedLineCount} rendered code lines for the line number probe.`
			);
		}

		return {
			codeHasLineNumbers: code.classList.contains('sd-line-numbers'),
			codeStyle: code.getAttribute('style') ?? '',
			linePaddingLeft: Number.parseFloat(getComputedStyle(lineElements[0]).paddingLeft) || 0,
			before: {
				content: getComputedStyle(lineElements[0], '::before').content.replaceAll('"', ''),
				position: getComputedStyle(lineElements[0], '::before').position,
				top: getComputedStyle(lineElements[0], '::before').top,
				left: getComputedStyle(lineElements[0], '::before').left,
				width: Number.parseFloat(getComputedStyle(lineElements[0], '::before').width) || 0,
				textAlign: getComputedStyle(lineElements[0], '::before').textAlign
			},
			lines: lineElements.map((line) => {
				const rect = line.getBoundingClientRect();
				return {
					top: rect.top,
					bottom: rect.bottom
				};
			})
		};
	}, lineCount);

	expect(lineLayout.codeHasLineNumbers).toBe(true);
	if (startLine > 1) {
		expect(lineLayout.codeStyle).toContain(`counter-reset: sd-line ${startLine - 1}`);
	} else {
		expect(lineLayout.codeStyle).toBe('');
	}
	expect(lineLayout.before.content).toBe('counter(sd-line)');
	expect(lineLayout.before.position).toBe('absolute');
	expect(lineLayout.before.top).toBe('0px');
	expect(lineLayout.before.left).toBe('0px');
	expect(lineLayout.before.textAlign).toBe('right');
	expect(lineLayout.before.width).toBeGreaterThan(0);
	expect(lineLayout.linePaddingLeft).toBeGreaterThanOrEqual(lineLayout.before.width);
	for (let index = 0; index < lineLayout.lines.length - 1; index += 1) {
		expect(lineLayout.lines[index].bottom).toBeLessThanOrEqual(lineLayout.lines[index + 1].top);
	}
}
