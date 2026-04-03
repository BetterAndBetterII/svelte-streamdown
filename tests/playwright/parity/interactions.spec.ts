import { expect, test, type Page } from '@playwright/test';
import { interactionParityFixtureIds } from '../../../fixtures/parity/fixture-registry.js';

const referenceBaseUrl = process.env.PARITY_REFERENCE_URL ?? 'http://127.0.0.1:4173';
const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';

type DownloadCapture = {
	filename: string;
	size: number;
	text: string | null;
};

type ClipboardCapture = {
	htmlText: string | null;
	plainText: string | null;
};

type DownloadProbeRecord = {
	error: string | null;
	filename: string | null;
	mimeType: string | null;
	size: number | null;
	status: 'failed' | 'pending' | 'ready';
	text: string | null;
};

test.describe('interaction parity fixtures', () => {
	test.describe.configure({ mode: 'parallel' });

	test('tracks the planned interaction fixture set', () => {
		expect(interactionParityFixtureIds).toEqual([
			'10-code-actions.md',
			'11-table-actions.md',
			'12-mermaid-actions.md',
			'13-blocked-link-and-image.md',
			'14-footnote-interaction.md'
		]);
	});

	test('matches code copy and download intent', async ({ browser }) => {
		const context = await browser.newContext({ acceptDownloads: true });
		const referencePage = await context.newPage();
		const localPage = await context.newPage();

		try {
			await Promise.all([
				openParityFixture(referencePage, referenceBaseUrl, '10-code-actions.md'),
				openParityFixture(localPage, localBaseUrl, '10-code-actions.md')
			]);

			await Promise.all([
				referencePage.getByTitle('Copy Code').click(),
				localPage.getByTitle('Copy Code').click()
			]);

			const [referenceClipboard, localClipboard] = await Promise.all([
				waitForClipboardWrite(referencePage),
				waitForClipboardWrite(localPage)
			]);

			expect(normalizeCopiedText(referenceClipboard.plainText)).toBe(
				"console.log('parity-actions');"
			);
			expect(normalizeCopiedText(localClipboard.plainText)).toBe(
				normalizeCopiedText(referenceClipboard.plainText)
			);

			const [referenceDownload, localDownload] = await Promise.all([
				captureDownload(referencePage, () =>
					getByExactTitle(referencePage, 'Download file').click()
				),
				captureDownload(localPage, () => getByExactTitle(localPage, 'Download file').click())
			]);

			expect(normalizeTextDownload(referenceDownload)).toEqual({
				filename: 'file.js',
				text: "console.log('parity-actions');"
			});
			expect(normalizeTextDownload(localDownload)).toEqual(
				normalizeTextDownload(referenceDownload)
			);
		} finally {
			await context.close();
		}
	});

	test('matches table copy and download outcomes for shared formats', async ({ browser }) => {
		const context = await browser.newContext({ acceptDownloads: true });
		const referencePage = await context.newPage();
		const localPage = await context.newPage();

		try {
			await Promise.all([
				openParityFixture(referencePage, referenceBaseUrl, '11-table-actions.md'),
				openParityFixture(localPage, localBaseUrl, '11-table-actions.md')
			]);

			await copyFromTableMenu(referencePage, 'Copy table as Markdown');
			await copyFromTableMenu(localPage, 'Copy table as Markdown');

			const [referenceMarkdownCopy, localMarkdownCopy] = await Promise.all([
				waitForClipboardWrite(referencePage),
				waitForClipboardWrite(localPage)
			]);

			expect(referenceMarkdownCopy.plainText).toContain('| Name | Value |');
			expect(localMarkdownCopy.plainText).toBe(referenceMarkdownCopy.plainText);

			await copyFromTableMenu(referencePage, 'Copy table as CSV');
			await copyFromTableMenu(localPage, 'Copy table as CSV');

			const [referenceCsvCopy, localCsvCopy] = await Promise.all([
				waitForClipboardWrite(referencePage, 1),
				waitForClipboardWrite(localPage, 1)
			]);

			expect(referenceCsvCopy.plainText).toBe('Name,Value\nFoo,Bar\nBaz,42');
			expect(localCsvCopy.plainText).toBe(referenceCsvCopy.plainText);

			const [referenceMarkdownDownload, localMarkdownDownload] = await Promise.all([
				captureDownload(referencePage, () =>
					downloadFromTableMenu(referencePage, 'Download table as Markdown')
				),
				captureDownload(localPage, () =>
					downloadFromTableMenu(localPage, 'Download table as Markdown')
				)
			]);

			expect(normalizeTextDownload(referenceMarkdownDownload)).toEqual({
				filename: 'table.md',
				text: '| Name | Value |\n| --- | --- |\n| Foo | Bar |\n| Baz | 42 |'
			});
			expect(normalizeTextDownload(localMarkdownDownload)).toEqual(
				normalizeTextDownload(referenceMarkdownDownload)
			);

			const [referenceCsvDownload, localCsvDownload] = await Promise.all([
				captureDownload(referencePage, () =>
					downloadFromTableMenu(referencePage, 'Download table as CSV')
				),
				captureDownload(localPage, () => downloadFromTableMenu(localPage, 'Download table as CSV'))
			]);

			expect(normalizeTextDownload(referenceCsvDownload)).toEqual({
				filename: 'table.csv',
				text: 'Name,Value\nFoo,Bar\nBaz,42'
			});
			expect(normalizeTextDownload(localCsvDownload)).toEqual(
				normalizeTextDownload(referenceCsvDownload)
			);
		} finally {
			await context.close();
		}
	});

	test('matches mermaid download formats, zoom controls, and fullscreen state', async ({
		browser
	}) => {
		const context = await browser.newContext({ acceptDownloads: true });
		const referencePage = await context.newPage();
		const localPage = await context.newPage();

		try {
			await Promise.all([
				openParityFixture(referencePage, referenceBaseUrl, '12-mermaid-actions.md'),
				openParityFixture(localPage, localBaseUrl, '12-mermaid-actions.md')
			]);

			await Promise.all([waitForMermaidReady(referencePage), waitForMermaidReady(localPage)]);

			const [referenceMmd, localMmd] = await Promise.all([
				captureDownload(referencePage, () =>
					downloadFromMermaidMenu(referencePage, 'Download diagram as MMD')
				),
				captureDownload(localPage, () =>
					downloadFromMermaidMenu(localPage, 'Download diagram as MMD')
				)
			]);

			expect(normalizeTextDownload(referenceMmd)).toEqual({
				filename: 'diagram.mmd',
				text: 'flowchart LR\n  Start --> Finish'
			});
			expect(normalizeTextDownload(localMmd)).toEqual(normalizeTextDownload(referenceMmd));

			const [referenceSvg, localSvg] = await Promise.all([
				captureDownload(referencePage, () =>
					downloadFromMermaidMenu(referencePage, 'Download diagram as SVG')
				),
				captureDownload(localPage, () =>
					downloadFromMermaidMenu(localPage, 'Download diagram as SVG')
				)
			]);

			expect(referenceSvg.filename).toBe('diagram.svg');
			expect(localSvg.filename).toBe(referenceSvg.filename);
			expect(referenceSvg.text).toContain('<svg');
			expect(localSvg.text).toContain('<svg');

			const [referencePng, localPng] = await Promise.all([
				captureDownload(referencePage, () =>
					downloadFromMermaidMenu(referencePage, 'Download diagram as PNG')
				),
				captureDownload(localPage, () =>
					downloadFromMermaidMenu(localPage, 'Download diagram as PNG')
				)
			]);

			expect(referencePng.filename).toBe('diagram.png');
			expect(localPng.filename).toBe(referencePng.filename);
			expect(referencePng.size).toBeGreaterThan(0);
			expect(localPng.size).toBeGreaterThan(0);

			const [referenceBeforeZoom, localBeforeZoom] = await Promise.all([
				readTransform(referencePage, '[data-streamdown="mermaid"] [role="application"]'),
				readTransform(localPage, '[data-streamdown-mermaid] [data-mermaid-svg]')
			]);

			await Promise.all([
				referencePage.getByTitle('Zoom in').click(),
				localPage.getByTitle('Zoom in').click()
			]);

			const [referenceAfterZoom, localAfterZoom] = await Promise.all([
				readTransform(referencePage, '[data-streamdown="mermaid"] [role="application"]'),
				readTransform(localPage, '[data-streamdown-mermaid] [data-mermaid-svg]')
			]);

			expect(referenceAfterZoom).not.toBe(referenceBeforeZoom);
			expect(localAfterZoom).not.toBe(localBeforeZoom);

			await Promise.all([
				referencePage.getByTitle('View fullscreen').click(),
				localPage.getByTitle('View fullscreen').click()
			]);

			await Promise.all([
				expect(referencePage.getByTitle('Exit fullscreen')).toBeVisible(),
				expect(localPage.getByTitle('Exit fullscreen')).toBeVisible()
			]);
		} finally {
			await context.close();
		}
	});

	test('matches blocked-link rendering and preserves the current blocked-image drift as evidence', async ({
		browser
	}) => {
		const context = await browser.newContext();
		const referencePage = await context.newPage();
		const localPage = await context.newPage();

		try {
			await Promise.all([
				openParityFixture(referencePage, referenceBaseUrl, '13-blocked-link-and-image.md'),
				openParityFixture(localPage, localBaseUrl, '13-blocked-link-and-image.md')
			]);

			await expect(referencePage.locator(renderedSelector)).toContainText('[blocked]');
			await expect(localPage.locator(renderedSelector)).toContainText('[blocked]');

			await expect(referencePage.locator(`${renderedSelector} a[href^="javascript:"]`)).toHaveCount(
				0
			);
			await expect(localPage.locator(`${renderedSelector} a[href^="javascript:"]`)).toHaveCount(0);

			await expect(referencePage.locator(`${renderedSelector} img`)).toHaveCount(0);
			await expect(localPage.locator('[data-streamdown-image-blocked]')).toHaveCount(1);
		} finally {
			await context.close();
		}
	});

	test('captures the approved footnote interaction drift between reference and local', async ({
		browser
	}) => {
		const context = await browser.newContext();
		const referencePage = await context.newPage();
		const localPage = await context.newPage();

		try {
			await Promise.all([
				openParityFixture(referencePage, referenceBaseUrl, '14-footnote-interaction.md'),
				openParityFixture(localPage, localBaseUrl, '14-footnote-interaction.md')
			]);

			await expect(
				referencePage.locator(`${renderedSelector} section[data-footnotes]`)
			).toHaveCount(1);
			await expect(localPage.locator('[data-streamdown-footnote-ref]')).toHaveCount(1);

			await localPage.locator('[data-streamdown-footnote-ref]').click();
			await expect(localPage.locator('[data-streamdown-footnote-popover]')).toContainText(
				'Footnote content for parity interaction.'
			);
		} finally {
			await context.close();
		}
	});
});

async function openParityFixture(page: Page, baseUrl: string, fixtureId: string): Promise<void> {
	await installInteractionProbes(page);
	const route = `/?fixture=${encodeURIComponent(fixtureId)}`;
	await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
	await expect(page.locator(renderedSelector)).toBeVisible();
}

async function installInteractionProbes(page: Page): Promise<void> {
	await page.addInitScript(() => {
		type ClipboardRecord = {
			htmlText: string | null;
			plainText: string | null;
		};

		type DownloadRecord = {
			error: string | null;
			filename: string | null;
			mimeType: string | null;
			size: number | null;
			status: 'failed' | 'pending' | 'ready';
			text: string | null;
		};

		const captures = {
			clipboardWrites: [] as ClipboardRecord[],
			downloads: [] as DownloadRecord[]
		};
		const downloadBlobs = new Map<string, Blob>();

		Object.defineProperty(window, '__streamdownInteractionCapture', {
			configurable: true,
			value: captures
		});

		const originalClipboard = navigator.clipboard ?? {};
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				...originalClipboard,
				writeText: async (text: string) => {
					captures.clipboardWrites.push({
						plainText: text,
						htmlText: null
					});
				},
				write: async (items: ClipboardItem[]) => {
					const item = items[0];
					const plainText = item
						? await item.getType('text/plain').then((blob) => blob.text())
						: null;
					const htmlText = item
						? await item
								.getType('text/html')
								.then((blob) => blob.text())
								.catch(() => null)
						: null;
					captures.clipboardWrites.push({
						plainText,
						htmlText
					});
				}
			}
		});

		const originalCreateObjectURL = URL.createObjectURL.bind(URL);
		const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);

		Object.defineProperty(URL, 'createObjectURL', {
			configurable: true,
			value: (object: unknown) => {
				const url = originalCreateObjectURL(object as Blob | MediaSource);
				if (object instanceof Blob) {
					downloadBlobs.set(url, object);
				}
				return url;
			}
		});

		Object.defineProperty(URL, 'revokeObjectURL', {
			configurable: true,
			value: (url: string) => {
				downloadBlobs.delete(url);
				return originalRevokeObjectURL(url);
			}
		});

		const originalAnchorClick = HTMLAnchorElement.prototype.click;
		HTMLAnchorElement.prototype.click = function clickPatched() {
			const filename = this.download || null;
			const blob = filename ? downloadBlobs.get(this.href) : undefined;

			if (!(filename && blob)) {
				return originalAnchorClick.call(this);
			}

			const record: DownloadRecord = {
				error: null,
				filename,
				mimeType: blob.type || null,
				size: null,
				status: 'pending',
				text: null
			};
			captures.downloads.push(record);

			void blob
				.arrayBuffer()
				.then((buffer) => {
					record.size = buffer.byteLength;

					if (
						/^text\//.test(blob.type) ||
						blob.type === 'image/svg+xml' ||
						/\.(?:txt|js|md|csv|svg|mmd)$/i.test(filename)
					) {
						record.text = new TextDecoder().decode(buffer);
					}

					record.status = 'ready';
				})
				.catch((error: unknown) => {
					record.error = error instanceof Error ? error.message : String(error);
					record.status = 'failed';
				});
		};
	});
}

async function waitForClipboardWrite(page: Page, index = 0): Promise<ClipboardCapture> {
	await page.waitForFunction(
		(expectedIndex) =>
			((
				window as typeof window & {
					__streamdownInteractionCapture?: {
						clipboardWrites: ClipboardCapture[];
					};
				}
			).__streamdownInteractionCapture?.clipboardWrites.length ?? 0) > expectedIndex,
		index
	);

	return page.evaluate(
		(expectedIndex) =>
			(
				window as typeof window & {
					__streamdownInteractionCapture: {
						clipboardWrites: ClipboardCapture[];
					};
				}
			).__streamdownInteractionCapture.clipboardWrites[expectedIndex],
		index
	);
}

async function captureDownload(page: Page, action: () => Promise<void>): Promise<DownloadCapture> {
	const index = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__streamdownInteractionCapture?: {
						downloads: DownloadProbeRecord[];
					};
				}
			).__streamdownInteractionCapture?.downloads.length ?? 0
	);

	await action();

	await page.waitForFunction((expectedIndex) => {
		const download = (
			window as typeof window & {
				__streamdownInteractionCapture?: {
					downloads: DownloadProbeRecord[];
				};
			}
		).__streamdownInteractionCapture?.downloads[expectedIndex];
		return download ? download.status !== 'pending' : false;
	}, index);

	const download = await page.evaluate(
		(expectedIndex) =>
			(
				window as typeof window & {
					__streamdownInteractionCapture: {
						downloads: DownloadProbeRecord[];
					};
				}
			).__streamdownInteractionCapture.downloads[expectedIndex],
		index
	);

	if (download.status === 'failed') {
		throw new Error(download.error ?? `Download capture failed for index ${index}.`);
	}

	return {
		filename: download.filename ?? '',
		size: download.size ?? 0,
		text: download.text
	};
}

async function copyFromTableMenu(page: Page, title: string): Promise<void> {
	await getByExactTitle(page, 'Copy table').click();
	await getByExactTitle(page, title).click();
}

async function downloadFromTableMenu(page: Page, title: string): Promise<void> {
	await getByExactTitle(page, 'Download table').click();
	await getByExactTitle(page, title).click();
}

async function downloadFromMermaidMenu(page: Page, title: string): Promise<void> {
	await getByExactTitle(page, 'Download diagram').click();
	await getByExactTitle(page, title).click();
}

async function waitForMermaidReady(page: Page): Promise<void> {
	const mermaidSvg = page.locator(
		'[data-streamdown="mermaid"] [role="img"] > svg, [data-streamdown-mermaid] [data-mermaid-svg]'
	);
	await expect(mermaidSvg.first()).toBeVisible();
}

async function readTransform(page: Page, selector: string): Promise<string | null> {
	const locator = page.locator(selector).first();
	await expect(locator).toBeVisible();
	return locator.evaluate((node) => node.getAttribute('style'));
}

function getByExactTitle(page: Page, title: string) {
	return page.getByTitle(title, { exact: true });
}

function normalizeTextDownload(download: DownloadCapture): {
	filename: string;
	text: string;
} {
	return {
		filename: download.filename,
		text: normalizeDownloadedText(download.text ?? '')
	};
}

function stripUtf8Bom(value: string): string {
	return value.replace(/^\uFEFF/, '');
}

function normalizeCopiedText(value: string | null): string | null {
	return value ? value.replace(/\r\n/g, '\n').replace(/\n$/, '') : value;
}

function normalizeDownloadedText(value: string): string {
	return stripUtf8Bom(value).replace(/\r\n/g, '\n').replace(/\n$/, '');
}
