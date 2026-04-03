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
const maxDiffPixelRatio = 0.001;
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

async function assertVisualParity(
	referenceScreenshot: Buffer,
	localScreenshot: Buffer,
	testInfo: TestInfo,
	fixtureId: string
): Promise<void> {
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
