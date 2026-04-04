import { expect, test, type Page, type TestInfo } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { parityFixtureIds } from '../../../fixtures/parity/fixture-registry.js';
import { assertDomParity } from './assert-dom-parity.js';

const referenceBaseUrl = process.env.PARITY_REFERENCE_URL ?? 'http://127.0.0.1:4173';
const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';

const renderedSelector = '[data-parity-rendered]';
const viewport = {
	width: 1280,
	height: 900
} as const;
const screenshotOptions = {
	animations: 'disabled',
	caret: 'hide',
	scale: 'css'
} as const;
const pixelmatchThreshold = 0.1;
const defaultMaxDiffPixelRatio = 0.001;
const fixtureMaxDiffPixelRatios: Partial<Record<string, number>> = {
	'05-unordered-list.md': 0.005,
	'07-heading-and-emphasis.md': 0.025,
	'08-blockquote-plain.md': 0.003
};
const visualParityFixtureIds = parityFixtureIds.filter((fixtureId) =>
	[
		'05-unordered-list.md',
		'07-heading-and-emphasis.md',
		'08-blockquote-plain.md',
		'09-paragraphs.md'
	].includes(fixtureId)
);

/*
 * Known flake sources for screenshot parity:
 * - remote assets and browser-rendered diagrams can add raster noise, so this suite stays on local
 *   text/table/code fixtures for now
 * - host font availability can shift line wrapping, so the parity harness pins shared sans/mono fonts
 * - hover/focus/caret states are excluded by forcing reduced motion and hiding the caret in captures
 * - GitHub-hosted Ubuntu runners still produce stable subpixel text rasterization drift on a few
 *   typography-only fixtures even after DOM parity is clean, so those fixtures use explicit visual
 *   budgets instead of the stricter default ratio
 */

test.describe('visual parity secondary signal', () => {
	test.describe.configure({ mode: 'parallel' });

	for (const fixtureId of visualParityFixtureIds) {
		test(`matches the reference screenshot for fixture ${fixtureId} after DOM parity`, async ({
			browser
		}, testInfo) => {
			const context = await browser.newContext({
				colorScheme: 'light',
				deviceScaleFactor: 1,
				reducedMotion: 'reduce',
				timezoneId: 'UTC',
				viewport
			});
			const referencePage = await context.newPage();
			const localPage = await context.newPage();
			const fixtureRoute = `/?fixture=${encodeURIComponent(fixtureId)}`;

			try {
				await Promise.all([
					openParityFixture(referencePage, `${referenceBaseUrl}${fixtureRoute}`),
					openParityFixture(localPage, `${localBaseUrl}${fixtureRoute}`)
				]);

				const referenceLocator = referencePage.locator(renderedSelector);
				const localLocator = localPage.locator(renderedSelector);

				await assertDomParity(referenceLocator, localLocator, { fixtureId });

				const [referenceScreenshot, localScreenshot] = await Promise.all([
					captureRenderedScreenshot(referencePage),
					captureRenderedScreenshot(localPage)
				]);

				await assertVisualParity(referenceScreenshot, localScreenshot, testInfo, fixtureId);
			} finally {
				await context.close();
			}
		});
	}

	test('matches code-block dark-theme styles for fixture 06-code-fence.md', async ({ browser }) => {
		const fixtureRoute = '/?fixture=06-code-fence.md';
		const createContext = (colorScheme: 'light' | 'dark') =>
			browser.newContext({
				colorScheme,
				deviceScaleFactor: 1,
				reducedMotion: 'reduce',
				timezoneId: 'UTC',
				viewport
			});
		const [lightContext, darkContext] = await Promise.all([
			createContext('light'),
			createContext('dark')
		]);
		const [referenceLightPage, localLightPage] = await Promise.all([
			lightContext.newPage(),
			lightContext.newPage()
		]);
		const [referenceDarkPage, localDarkPage] = await Promise.all([
			darkContext.newPage(),
			darkContext.newPage()
		]);

		try {
			await Promise.all([
				openParityFixture(referenceLightPage, `${referenceBaseUrl}${fixtureRoute}`),
				openParityFixture(localLightPage, `${localBaseUrl}${fixtureRoute}`),
				openParityFixture(referenceDarkPage, `${referenceBaseUrl}${fixtureRoute}`),
				openParityFixture(localDarkPage, `${localBaseUrl}${fixtureRoute}`)
			]);

			const [referenceLightStyles, localLightStyles, referenceDarkStyles, localDarkStyles] =
				await Promise.all([
					readCodeBlockColors(referenceLightPage),
					readCodeBlockColors(localLightPage),
					readCodeBlockColors(referenceDarkPage),
					readCodeBlockColors(localDarkPage)
				]);

			expect(referenceDarkStyles).toEqual(localDarkStyles);
			expect(localLightStyles).not.toEqual(localDarkStyles);
			expect(referenceLightStyles).not.toEqual(referenceDarkStyles);
		} finally {
			await Promise.all([lightContext.close(), darkContext.close()]);
		}
	});
});

async function openParityFixture(page: Page, url: string): Promise<void> {
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.evaluate(async () => {
		if ('fonts' in document) {
			await document.fonts.ready;
		}
	});
	await expect(page.locator(renderedSelector)).toBeVisible();
}

async function captureRenderedScreenshot(page: Page): Promise<Buffer> {
	const locator = page.locator(renderedSelector);
	await locator.scrollIntoViewIfNeeded();
	return locator.screenshot(screenshotOptions);
}

async function readCodeBlockColors(page: Page): Promise<{
	bodyBackgroundColor: string;
	bodyBorderColor: string;
	tokenColor: string;
}> {
	return page.locator(renderedSelector).evaluate((root) => {
		const body = root.querySelector('[data-streamdown="code-block-body"]');
		const token =
			root.querySelector('[style*="--sdm-c"]') ?? root.querySelector('.sd-code-line span');

		if (!body || !token) {
			throw new Error('No visible code block found in rendered parity output.');
		}

		const bodyStyle = getComputedStyle(body);
		const tokenStyle = getComputedStyle(token);
		return {
			bodyBackgroundColor: bodyStyle.backgroundColor,
			bodyBorderColor: bodyStyle.borderColor,
			tokenColor: tokenStyle.color
		};
	});
}

async function assertVisualParity(
	referenceScreenshot: Buffer,
	localScreenshot: Buffer,
	testInfo: TestInfo,
	fixtureId: string
): Promise<void> {
	const maxDiffPixelRatio = fixtureMaxDiffPixelRatios[fixtureId] ?? defaultMaxDiffPixelRatio;
	const referenceImage = PNG.sync.read(referenceScreenshot);
	const localImage = PNG.sync.read(localScreenshot);

	if (referenceImage.width !== localImage.width || referenceImage.height !== localImage.height) {
		await attachBaseScreenshots(testInfo, referenceScreenshot, localScreenshot);
		throw new Error(
			`Visual parity mismatch for fixture ${fixtureId}: screenshot dimensions differ ` +
				`(${referenceImage.width}x${referenceImage.height} reference vs ` +
				`${localImage.width}x${localImage.height} local).`
		);
	}

	const diffImage = new PNG({
		width: referenceImage.width,
		height: referenceImage.height
	});
	const diffPixelCount = pixelmatch(
		referenceImage.data,
		localImage.data,
		diffImage.data,
		referenceImage.width,
		referenceImage.height,
		{
			includeAA: false,
			threshold: pixelmatchThreshold
		}
	);
	const totalPixels = referenceImage.width * referenceImage.height;
	const diffRatio = diffPixelCount / totalPixels;

	if (diffRatio <= maxDiffPixelRatio) {
		return;
	}

	await attachBaseScreenshots(testInfo, referenceScreenshot, localScreenshot);
	await testInfo.attach('visual-diff.png', {
		body: PNG.sync.write(diffImage),
		contentType: 'image/png'
	});

	expect(
		diffRatio,
		`Visual parity mismatch for fixture ${fixtureId}: ${diffPixelCount}/${totalPixels} ` +
			`pixels differ (${(diffRatio * 100).toFixed(3)}%), exceeding the ${(maxDiffPixelRatio * 100).toFixed(3)}% budget.`
	).toBeLessThanOrEqual(maxDiffPixelRatio);
}

async function attachBaseScreenshots(
	testInfo: TestInfo,
	referenceScreenshot: Buffer,
	localScreenshot: Buffer
): Promise<void> {
	await Promise.all([
		testInfo.attach('reference.png', {
			body: referenceScreenshot,
			contentType: 'image/png'
		}),
		testInfo.attach('local.png', {
			body: localScreenshot,
			contentType: 'image/png'
		})
	]);
}
