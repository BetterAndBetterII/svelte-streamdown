import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { buildParityRoute } from '../../../apps/parity-shared/query.js';

const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';
const screenshotOptions = {
	animations: 'disabled',
	caret: 'hide',
	scale: 'css'
} as const;
const pixelmatchThreshold = 0.1;
const maxDiffPixelRatio = 0.015;

test.describe('code line number rendering', () => {
	test('renders startLine labels in separate non-overlapping rows', async ({ page }, testInfo) => {
		const route = buildParityRoute({
			markdown: createCodeProbeMarkdown({
				startLine: 1,
				lineCount: 13
			})
		});

		await openParityFixture(page, `${localBaseUrl}${route}`);
		await assertLineNumberMirror(page, testInfo, {
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

async function assertLineNumberMirror(
	page: Page,
	testInfo: TestInfo,
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
	for (let index = 0; index < lineLayout.lines.length - 1; index += 1) {
		expect(lineLayout.lines[index].bottom).toBeLessThanOrEqual(lineLayout.lines[index + 1].top);
	}

	const bodyLocator = page.locator(`${renderedSelector} [data-streamdown="code-block-body"]`);
	const actualBodyScreenshot = await bodyLocator.screenshot(screenshotOptions);
	const actualBodyImage = PNG.sync.read(actualBodyScreenshot);
	const bodyMetrics = await page.locator(renderedSelector).evaluate((root) => {
		const body = root.querySelector<HTMLElement>('[data-streamdown="code-block-body"]');
		const line = root.querySelector<HTMLElement>('.sd-code-line');

		if (!body || !line) {
			throw new Error('Could not read the body metrics for the line-number probe.');
		}

		const bodyStyle = getComputedStyle(body);
		return {
			bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop) || 0,
			bodyPaddingBottom: Number.parseFloat(bodyStyle.paddingBottom) || 0,
			bodyPaddingLeft: Number.parseFloat(bodyStyle.paddingLeft) || 0,
			gutterWidth: Number.parseFloat(getComputedStyle(line).paddingLeft) || 48
		};
	});
	const cropWidth = Math.round(bodyMetrics.bodyPaddingLeft + bodyMetrics.gutterWidth);
	const expectedMirror = await createExpectedGutterMirror(page, {
		width: cropWidth,
		height: actualBodyImage.height,
		lineCount,
		startLine,
		bodyPaddingTop: bodyMetrics.bodyPaddingTop,
		bodyPaddingBottom: bodyMetrics.bodyPaddingBottom,
		bodyPaddingLeft: bodyMetrics.bodyPaddingLeft,
		gutterWidth: bodyMetrics.gutterWidth
	});
	const expectedScreenshot = await expectedMirror.screenshot(screenshotOptions);
	const actualScreenshot = cropPng(actualBodyScreenshot, {
		x: 0,
		y: 0,
		width: cropWidth,
		height: actualBodyImage.height
	});

	await assertImageSimilarity(actualScreenshot, expectedScreenshot, testInfo);
}

async function createExpectedGutterMirror(
	page: Page,
	{
		width,
		height,
		lineCount,
		startLine,
		bodyPaddingTop,
		bodyPaddingBottom,
		bodyPaddingLeft,
		gutterWidth
	}: {
		width: number;
		height: number;
		lineCount: number;
		startLine: number;
		bodyPaddingTop: number;
		bodyPaddingBottom: number;
		bodyPaddingLeft: number;
		gutterWidth: number;
	}
): Promise<Locator> {
	await page.locator(renderedSelector).evaluate(
		(root, options) => {
			const code = root.querySelector<HTMLElement>('[data-streamdown="code-block-body"] code');
			const codeBody = root.querySelector<HTMLElement>('[data-streamdown="code-block-body"]');
			const lines = [...root.querySelectorAll<HTMLElement>('.sd-code-line')];

			if (!code || !codeBody || lines.length === 0) {
				throw new Error('Could not build the line-number mirror without a visible code block.');
			}

			const lineStyle = getComputedStyle(lines[0]);
			const beforeStyle = getComputedStyle(lines[0], '::before');
			const numberWidth = Number.parseFloat(beforeStyle.width) || 32;
			const lineHeight =
				beforeStyle.lineHeight === 'normal' ? lineStyle.lineHeight : beforeStyle.lineHeight;

			document.querySelector('[data-expected-line-gutter]')?.remove();

			const mirror = document.createElement('div');
			mirror.setAttribute('data-expected-line-gutter', 'true');
			mirror.style.position = 'fixed';
			mirror.style.left = '0px';
			mirror.style.top = '0px';
			mirror.style.width = `${options.width}px`;
			mirror.style.height = `${options.height}px`;
			mirror.style.background = getComputedStyle(codeBody).backgroundColor;
			mirror.style.pointerEvents = 'none';
			mirror.style.zIndex = '2147483647';
			mirror.style.paddingTop = `${options.bodyPaddingTop}px`;
			mirror.style.paddingLeft = `${options.bodyPaddingLeft}px`;
			mirror.style.boxSizing = 'border-box';

			const contentHeight = options.height - options.bodyPaddingTop - options.bodyPaddingBottom;

			Array.from({ length: options.lineCount }).forEach((_, index) => {
				const row = document.createElement('div');
				row.style.position = 'relative';
				row.style.display = 'block';
				row.style.height = `${contentHeight / options.lineCount}px`;
				row.style.paddingLeft = `${options.gutterWidth}px`;

				const number = document.createElement('span');
				number.textContent = String(index + options.startLine);
				number.style.position = 'absolute';
				number.style.left = '0px';
				number.style.top = '0px';
				number.style.width = `${numberWidth}px`;
				number.style.textAlign = 'right';
				number.style.fontFamily = beforeStyle.fontFamily;
				number.style.fontSize = beforeStyle.fontSize;
				number.style.fontWeight = beforeStyle.fontWeight;
				number.style.lineHeight = lineHeight;
				number.style.color = beforeStyle.color;
				number.style.userSelect = 'none';
				row.append(number);
				mirror.append(row);
			});

			document.body.append(mirror);
		},
		{
			width,
			height,
			lineCount,
			startLine,
			bodyPaddingTop,
			bodyPaddingBottom,
			bodyPaddingLeft,
			gutterWidth
		}
	);

	return page.locator('[data-expected-line-gutter="true"]');
}

function cropPng(
	buffer: Buffer,
	{
		x,
		y,
		width,
		height
	}: {
		x: number;
		y: number;
		width: number;
		height: number;
	}
): Buffer {
	const image = PNG.sync.read(buffer);
	const cropped = new PNG({ width, height });

	for (let row = 0; row < height; row += 1) {
		for (let column = 0; column < width; column += 1) {
			const sourceIndex = ((row + y) * image.width + (column + x)) * 4;
			const targetIndex = (row * width + column) * 4;
			cropped.data[targetIndex] = image.data[sourceIndex];
			cropped.data[targetIndex + 1] = image.data[sourceIndex + 1];
			cropped.data[targetIndex + 2] = image.data[sourceIndex + 2];
			cropped.data[targetIndex + 3] = image.data[sourceIndex + 3];
		}
	}

	return PNG.sync.write(cropped);
}

async function assertImageSimilarity(
	actualScreenshot: Buffer,
	expectedScreenshot: Buffer,
	testInfo: TestInfo
): Promise<void> {
	const actualImage = PNG.sync.read(actualScreenshot);
	const expectedImage = PNG.sync.read(expectedScreenshot);

	expect(actualImage.width).toBe(expectedImage.width);
	expect(actualImage.height).toBe(expectedImage.height);

	const diffImage = new PNG({
		width: actualImage.width,
		height: actualImage.height
	});
	const diffPixelCount = pixelmatch(
		expectedImage.data,
		actualImage.data,
		diffImage.data,
		actualImage.width,
		actualImage.height,
		{
			includeAA: false,
			threshold: pixelmatchThreshold
		}
	);
	const totalPixels = actualImage.width * actualImage.height;
	const diffRatio = diffPixelCount / totalPixels;

	if (diffRatio <= maxDiffPixelRatio) {
		return;
	}

	await Promise.all([
		testInfo.attach('line-number-actual.png', {
			body: actualScreenshot,
			contentType: 'image/png'
		}),
		testInfo.attach('line-number-expected.png', {
			body: expectedScreenshot,
			contentType: 'image/png'
		}),
		testInfo.attach('line-number-diff.png', {
			body: PNG.sync.write(diffImage),
			contentType: 'image/png'
		})
	]);

	expect(
		diffRatio,
		`Expected rendered line numbers to match the mirrored 5/6/7 gutter, but ${diffPixelCount}/${totalPixels} pixels differed.`
	).toBeLessThanOrEqual(maxDiffPixelRatio);
}
