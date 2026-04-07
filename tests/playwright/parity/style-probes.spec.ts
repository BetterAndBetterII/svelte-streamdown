import { expect, test, type Browser, type Page } from '@playwright/test';
import { buildParityRoute } from '../../../apps/parity-shared/query.js';

const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';
const renderedSelector = '[data-parity-rendered]';
const viewport = {
	width: 1280,
	height: 900
} as const;

const styleProbeMarkdown = [
	'# Style Probe Heading',
	'',
	'Paragraph with [probe link](https://example.com), `inline code`, **strong text**, *emphasis text*, and ~~deleted text~~.',
	'',
	'> Blockquote with `quoted code` and supporting copy.',
	'',
	'| Left | Right |',
	'| :--- | ----: |',
	'| `x`  | **y** |',
	'',
	'```ts',
	'const answer = 42;',
	'```',
	'',
	'```mermaid',
	'flowchart LR',
	'  Start --> Finish',
	'```'
].join('\n');

const styleProbeRoute = buildParityRoute({
	markdown: styleProbeMarkdown
});

const computedStyleProperties = [
	'display',
	'position',
	'color',
	'background-color',
	'border-top-color',
	'border-right-color',
	'border-bottom-color',
	'border-left-color',
	'border-top-style',
	'border-right-style',
	'border-bottom-style',
	'border-left-style',
	'border-top-width',
	'border-right-width',
	'border-bottom-width',
	'border-left-width',
	'border-top-left-radius',
	'border-top-right-radius',
	'border-bottom-right-radius',
	'border-bottom-left-radius',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'min-width',
	'min-height',
	'font-family',
	'font-size',
	'font-style',
	'font-weight',
	'line-height',
	'letter-spacing',
	'text-align',
	'text-decoration-line',
	'text-decoration-color',
	'text-transform',
	'box-shadow',
	'opacity',
	'top',
	'overflow-x',
	'overflow-y'
] as const;

test.describe('rendering style probes', () => {
	test.describe.configure({ mode: 'parallel' });

	for (const colorScheme of ['light', 'dark'] as const) {
		test(`keeps local computed style probes stable across repeated renders in ${colorScheme} mode`, async ({
			browser
		}) => {
			const context = await createParityContext(browser, colorScheme);
			const firstPage = await context.newPage();
			const secondPage = await context.newPage();

			try {
				await Promise.all([
					openStyleProbePage(firstPage, `${localBaseUrl}${styleProbeRoute}`),
					openStyleProbePage(secondPage, `${localBaseUrl}${styleProbeRoute}`)
				]);

				const [firstSnapshot, secondSnapshot] = await Promise.all([
					readStyleProbeSnapshot(firstPage),
					readStyleProbeSnapshot(secondPage)
				]);

				expect(
					secondSnapshot,
					`Expected local computed style probes to stay stable across repeated renders in ${colorScheme} mode.`
				).toEqual(firstSnapshot);
			} finally {
				await context.close();
			}
		});
	}

	test('switches dark-aware local style probes between light and dark', async ({ browser }) => {
		const lightContext = await createParityContext(browser, 'light');
		const darkContext = await createParityContext(browser, 'dark');
		const localLightPage = await lightContext.newPage();
		const localDarkPage = await darkContext.newPage();

		try {
			await Promise.all([
				openStyleProbePage(localLightPage, `${localBaseUrl}${styleProbeRoute}`),
				openStyleProbePage(localDarkPage, `${localBaseUrl}${styleProbeRoute}`)
			]);

			const [localLightSnapshot, localDarkSnapshot] = await Promise.all([
				readStyleProbeSnapshot(localLightPage),
				readStyleProbeSnapshot(localDarkPage)
			]);

			expect(localLightSnapshot).not.toEqual(localDarkSnapshot);
		} finally {
			await Promise.all([lightContext.close(), darkContext.close()]);
		}
	});

	for (const colorScheme of ['light', 'dark'] as const) {
		test(`renders table shell surfaces with visible border and background in ${colorScheme} mode`, async ({
			browser
		}) => {
			const context = await createParityContext(browser, colorScheme);
			const page = await context.newPage();

			try {
				await openStyleProbePage(page, `${localBaseUrl}${styleProbeRoute}`);
				const snapshot = (await readStyleProbeSnapshot(page)) as StyleProbeSnapshot;

				expectVisibleSurface(snapshot.tableWrapper, 'table wrapper');
				expectVisibleSurface(snapshot.tableToolbar, 'table toolbar');
			} finally {
				await context.close();
			}
		});
	}

	for (const colorScheme of ['light', 'dark'] as const) {
		test(`renders code actions in a sticky shell in ${colorScheme} mode`, async ({ browser }) => {
			const context = await createParityContext(browser, colorScheme);
			const page = await context.newPage();

			try {
				await openStyleProbePage(page, `${localBaseUrl}${styleProbeRoute}`);
				const snapshot = (await readStyleProbeSnapshot(page)) as StyleProbeSnapshot;

				expect(snapshot.codeActionsShell.styles.position).toBe('sticky');
				expect(snapshot.codeActionsShell.styles.top).not.toBe('auto');
				expect(snapshot.codeActionsShell.styles.top).not.toBe('');
				expect(snapshot.codeActionsShell.styles['background-color']).toBe('rgba(0, 0, 0, 0)');
				expectVisibleSurface(snapshot.codeActions, 'code actions');
			} finally {
				await context.close();
			}
		});
	}
});

type StyleProbeElementSnapshot = {
	label: string;
	tag: string;
	className: string;
	title: string | null;
	role: string | null;
	href: string | null;
	text: string;
	childElementCount: number;
	styles: Record<(typeof computedStyleProperties)[number], string>;
};

type StyleProbeSnapshot = {
	tableWrapper: StyleProbeElementSnapshot;
	tableToolbar: StyleProbeElementSnapshot;
	codeActionsShell: StyleProbeElementSnapshot;
	codeActions: StyleProbeElementSnapshot;
} & Record<string, unknown>;

function expectVisibleSurface(element: StyleProbeElementSnapshot, label: string): void {
	expect
		.soft(element.styles['border-top-width'], `Expected ${label} to keep a visible top border.`)
		.not.toBe('0px');
	expect
		.soft(
			element.styles['background-color'],
			`Expected ${label} to keep a non-transparent background.`
		)
		.not.toBe('rgba(0, 0, 0, 0)');
}

async function createParityContext(browser: Browser, colorScheme: 'light' | 'dark') {
	return browser.newContext({
		colorScheme,
		deviceScaleFactor: 1,
		reducedMotion: 'reduce',
		timezoneId: 'UTC',
		viewport
	});
}

async function openStyleProbePage(page: Page, url: string): Promise<void> {
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.evaluate(async () => {
		if ('fonts' in document) {
			await document.fonts.ready;
		}
	});

	await expect(page.locator(renderedSelector)).toBeVisible();
	await expect(page.locator(`${renderedSelector} h1`)).toContainText('Style Probe Heading');
	expect(
		await page.locator(`${renderedSelector} [data-streamdown="link"]`).count()
	).toBeGreaterThan(0);
	expect(await page.locator(`${renderedSelector} p code`).count()).toBeGreaterThan(0);
	expect(await page.locator(`${renderedSelector} blockquote code`).count()).toBeGreaterThan(0);
	expect(await page.locator(`${renderedSelector} table code`).count()).toBeGreaterThan(0);
	await expect(page.locator(`${renderedSelector} [data-streamdown="table-wrapper"]`)).toHaveCount(
		1
	);
	await expect(page.locator(`${renderedSelector} [data-streamdown="table-toolbar"]`)).toHaveCount(
		1
	);
	await expect(page.locator(`${renderedSelector} [data-streamdown="code-block"]`)).toHaveCount(1);
	expect(
		await page.locator(`${renderedSelector} button[title="Copy Code"]`).count()
	).toBeGreaterThan(0);
	expect(
		await page.locator(`${renderedSelector} button[title="Download file"]`).count()
	).toBeGreaterThan(0);
	await expect(page.locator(`${renderedSelector} [data-streamdown="table"] thead`)).toHaveCount(1);
	expect(
		await page.locator(`${renderedSelector} [data-streamdown="code-block-actions"] button`).count()
	).toBeGreaterThanOrEqual(2);
	expect(
		await page.locator(`${renderedSelector} [data-streamdown="code-block-actions-shell"]`).count()
	).toBeGreaterThanOrEqual(1);
	await expect(page.locator(`${renderedSelector} button[title="Copy table"]`)).toHaveCount(1);
	await expect(page.locator(`${renderedSelector} button[title="Download table"]`)).toHaveCount(1);
	await expect(page.locator(`${renderedSelector} button[title="Reset zoom and pan"]`)).toHaveCount(
		1
	);
	await expect(page.locator(`${renderedSelector} button[title="Zoom in"]`)).toHaveCount(1);
	await expect(page.locator(`${renderedSelector} button[title="Zoom out"]`)).toHaveCount(1);
	await expect(page.locator(`${renderedSelector} button[title="View fullscreen"]`)).toHaveCount(2);
	await expect(page.locator(`${renderedSelector} button[title="Download diagram"]`)).toHaveCount(1);
	await expect(page.locator(`${renderedSelector} [aria-label="Mermaid chart"] svg`)).toHaveCount(1);
}

async function readStyleProbeSnapshot(page: Page): Promise<StyleProbeSnapshot> {
	return page.locator(renderedSelector).evaluate(
		(root, properties) => {
			const normalizeText = (value: string | null | undefined): string =>
				(value ?? '').replace(/\s+/g, ' ').trim();
			const normalizeProbeText = (value: string | null | undefined, label: string): string => {
				const normalizedText = normalizeText(value);
				void label;
				return normalizedText.replace(/mermaid-\d+-\d+-[a-z0-9]+/gi, 'mermaid-ref');
			};

			const readElement = (element: Element, label: string) => {
				const style = getComputedStyle(element);
				const styles = Object.fromEntries(
					properties.map((property) => [property, style.getPropertyValue(property)])
				) as Record<(typeof computedStyleProperties)[number], string>;
				return {
					label,
					tag: element.tagName.toLowerCase(),
					className:
						typeof element.className === 'string'
							? element.className
							: (element.getAttribute('class') ?? ''),
					title: element.getAttribute('title'),
					role: element.getAttribute('role'),
					href: element.getAttribute('href'),
					text: normalizeProbeText(element.textContent, label),
					childElementCount: element.childElementCount,
					styles
				};
			};

			const query = (selector: string, label: string, index = 0) => {
				const element = root.querySelectorAll(selector).item(index);
				if (!(element instanceof Element)) {
					throw new Error(`Style probe selector "${selector}" (${label}) did not resolve.`);
				}

				return readElement(element, label);
			};

			const queryWithin = (scope: Element, selector: string, label: string, index = 0) => {
				const element = scope.querySelectorAll(selector).item(index);
				if (!(element instanceof Element)) {
					throw new Error(`Style probe selector "${selector}" (${label}) did not resolve.`);
				}

				return readElement(element, label);
			};

			const findMermaidShellElement = () => {
				const zoomButton = root.querySelector('button[title="Reset zoom and pan"]');
				if (!(zoomButton instanceof Element)) {
					throw new Error('Style probe mermaid zoom button did not resolve.');
				}

				let current = zoomButton.parentElement;
				while (current) {
					const hasMermaidSvg = current.querySelector('[aria-label="Mermaid chart"] svg');
					const hasFullscreenButton = current.querySelector('button[title="View fullscreen"]');
					if (hasMermaidSvg && hasFullscreenButton) {
						return current;
					}

					current = current.parentElement;
				}

				throw new Error('Style probe mermaid shell did not resolve.');
			};

			return {
				renderedRoot: readElement(root, 'renderedRoot'),
				heading: query('h1', 'heading'),
				paragraph: query('p', 'paragraph'),
				link: query('[data-streamdown="link"]', 'link'),
				inlineCode: query('p code', 'inlineCode'),
				strong: query('p [data-streamdown-strong]', 'strong'),
				emphasis: query('p em', 'emphasis'),
				deleted: query('p del', 'deleted'),
				blockquote: query('blockquote', 'blockquote'),
				blockquoteInlineCode: query('blockquote code', 'blockquoteInlineCode'),
				tableToolbar: query('[data-streamdown="table-toolbar"]', 'tableToolbar'),
				tableCopyButton: query('button[title="Copy table"]', 'tableCopyButton'),
				tableDownloadButton: query('button[title="Download table"]', 'tableDownloadButton'),
				tableWrapper: query('[data-streamdown="table-wrapper"]', 'tableWrapper'),
				tableElement: query('[data-streamdown="table"]', 'tableElement'),
				tableHead: query('[data-streamdown="table"] thead', 'tableHead'),
				tableHeaderCell: query('[data-streamdown="table"] th', 'tableHeaderCell'),
				tableDataCell: query('[data-streamdown="table"] td', 'tableDataCell'),
				tableInlineCode: query('[data-streamdown="table"] code', 'tableInlineCode'),
				tableStrong: query('[data-streamdown="table"] [data-streamdown-strong]', 'tableStrong'),
				codeBlockShell: query('[data-streamdown="code-block"]', 'codeBlockShell'),
				codeBlockHeader: query('[data-streamdown="code-block-header"]', 'codeBlockHeader'),
				codeActionsShell: query('[data-streamdown="code-block-actions-shell"]', 'codeActionsShell'),
				codeLanguage: query('[data-streamdown="code-block-header"] span', 'codeLanguage'),
				codeActions: query('[data-streamdown="code-block-actions"]', 'codeActions'),
				codeCopyButton: query('button[title="Copy Code"]', 'codeCopyButton'),
				codeDownloadButton: query('button[title="Download file"]', 'codeDownloadButton'),
				codeBody: query('[data-streamdown="code-block-body"]', 'codeBody'),
				codeToken: query('[data-streamdown="code-block-body"] .sd-code-line span', 'codeToken'),
				tableFullscreenButton: query('button[title="View fullscreen"]', 'tableFullscreenButton'),
				mermaidShell: readElement(findMermaidShellElement(), 'mermaidShell'),
				mermaidActionBar: readElement(
					querySelectorParent(root, 'button[title="Reset zoom and pan"]'),
					'mermaidActionBar'
				),
				mermaidActionButton: query('button[title="Reset zoom and pan"]', 'mermaidActionButton'),
				mermaidZoomInButton: query('button[title="Zoom in"]', 'mermaidZoomInButton'),
				mermaidZoomOutButton: query('button[title="Zoom out"]', 'mermaidZoomOutButton'),
				mermaidFullscreenButton: queryWithin(
					findMermaidShellElement(),
					'button[title="View fullscreen"]',
					'mermaidFullscreenButton'
				),
				mermaidDownloadButton: query('button[title="Download diagram"]', 'mermaidDownloadButton'),
				mermaidSvg: query('[aria-label="Mermaid chart"] svg', 'mermaidSvg')
			};

			function querySelectorParent(scope: Element, selector: string): Element {
				const element = scope.querySelector(selector);
				if (!(element instanceof Element) || !(element.parentElement instanceof Element)) {
					throw new Error(`Style probe parent for selector "${selector}" did not resolve.`);
				}

				return element.parentElement;
			}
		},
		[...computedStyleProperties]
	);
}
