import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createMathPlugin, math } from '../../../../src/lib/index.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const tinyGifDataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

describeInBrowser('remaining parity closeout evidence', () => {
	testInBrowser(
		'defaults to streaming mode and lets the static alias force the static path',
		() => {
			const defaultScreen = render(Streamdown, {
				content: 'Text with **incomplete bold'
			});
			const staticAliasScreen = render(Streamdown, {
				content: 'Text with **incomplete bold',
				mode: 'streaming',
				static: true
			});

			expect(defaultScreen.container.querySelector('strong')).toBeTruthy();
			expect(staticAliasScreen.container.querySelector('strong')).toBeNull();
			expect(staticAliasScreen.container.textContent).toContain('**incomplete bold');
		}
	);

	testInBrowser('supports explicit and auto direction wrappers on the rendered DOM', () => {
		const explicitRtl = render(Streamdown, {
			content: 'Hello world',
			mode: 'static',
			dir: 'rtl'
		});
		const explicitLtr = render(Streamdown, {
			content: 'مرحبا بالعالم',
			mode: 'static',
			dir: 'ltr'
		});
		const auto = render(Streamdown, {
			content: 'مرحبا بالعالم\n\nHello world',
			mode: 'streaming',
			dir: 'auto'
		});

		expect(explicitRtl.container.querySelector('[dir]')?.getAttribute('dir')).toBe('rtl');
		expect(explicitLtr.container.querySelector('[dir]')?.getAttribute('dir')).toBe('ltr');
		expect(
			[...auto.container.querySelectorAll('[dir]')].map((element) => element.getAttribute('dir'))
		).toContain('rtl');
		expect(
			[...auto.container.querySelectorAll('[dir]')].map((element) => element.getAttribute('dir'))
		).toContain('ltr');
	});

	testInBrowser(
		'renders headings, lists, links, tables, code, HTML, and footnotes on the shared markdown surface',
		async () => {
			const screen = render(Streamdown, {
				content: [
					'# Closeout heading',
					'',
					'Paragraph with [Link](https://example.com), `inline code`, and **bold text**.',
					'',
					'- first item',
					'- second item',
					'',
					'| Name | Value |',
					'| --- | --- |',
					'| Foo | Bar |',
					'',
					'```ts',
					'const parity = true;',
					'```',
					'',
					'<details open><summary>Raw HTML</summary><p>Safe HTML</p></details>',
					'',
					'Footnote ref[^1].',
					'',
					'[^1]: Footnote body'
				].join('\n'),
				mode: 'static',
				linkSafety: {
					enabled: false
				}
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('h1')?.textContent).toBe('Closeout heading');
				expect(screen.container.querySelectorAll('ul li')).toHaveLength(2);
				expect(screen.container.querySelector('a')?.getAttribute('href')).toBe(
					'https://example.com/'
				);
				expect(screen.container.querySelector('[data-streamdown="table"]')).toBeTruthy();
				expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
				expect(screen.container.querySelector('details[open] summary')?.textContent).toBe(
					'Raw HTML'
				);
				expect(screen.container.querySelector('section[data-footnotes]')).toBeTruthy();
			});
		}
	);

	testInBrowser('keeps code readable while highlighting is still loading', async () => {
		const win = window as Window & {
			STREAMDOWN_HIGHLIGHTER?: {
				isReady: (theme: string, language: string | undefined) => boolean;
				load: (theme: string, language: string | undefined) => Promise<void>;
				highlightCode: (code: string, language: string | undefined, theme: string) => unknown;
				additionalThemes: Record<string, unknown>;
				languageLoaders: Map<string, () => Promise<unknown>>;
				customLanguages: Set<string>;
			};
		};
		const previousHighlighter = win.STREAMDOWN_HIGHLIGHTER;
		const load = vi.fn().mockResolvedValue(undefined);

		win.STREAMDOWN_HIGHLIGHTER = {
			isReady: vi.fn(() => false),
			load,
			highlightCode: vi.fn(() => []),
			additionalThemes: {},
			languageLoaders: new Map(),
			customLanguages: new Set()
		};

		try {
			const screen = render(Streamdown, {
				content: '```ts\nconst parity = true;\n```',
				mode: 'static'
			});

			expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
			expect(
				screen.container.querySelector('[data-streamdown="code-block-header"]')?.textContent
			).toContain('ts');
			expect(
				screen.container.querySelector('[data-streamdown="code-block-body"]')?.textContent
			).toContain('const parity = true;');
			expect(screen.container.querySelector('.animate-spin')).toBeNull();

			await vi.waitFor(() => {
				expect(load).toHaveBeenCalledWith(expect.any(String), 'ts');
			});
		} finally {
			if (previousHighlighter === undefined) {
				delete win.STREAMDOWN_HIGHLIGHTER;
			} else {
				win.STREAMDOWN_HIGHLIGHTER = previousHighlighter;
			}
		}
	});

	testInBrowser(
		'renders mermaid, math, table wrappers, and hydrated image controls on the public browser surface',
		async () => {
			const inlineMath = createMathPlugin({ singleDollarTextMath: true });
			const initialize = vi.fn();
			const renderDiagram = vi.fn().mockResolvedValue({
				svg: '<svg width="120" height="80"><text>Parity graph</text></svg>'
			});

			const screen = render(Streamdown, {
				content: [
					'Inline $E = mc^2$ with ![Inline pixel](' + tinyGifDataUri + ').',
					'',
					'![Standalone pixel](' + tinyGifDataUri + ')',
					'',
					'$$',
					'x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}',
					'$$',
					'',
					'```mermaid',
					'flowchart TD; Start-->Finish',
					'```',
					'',
					'| Name | Value |',
					'| --- | --- |',
					'| Foo | Bar |'
				].join('\n'),
				mode: 'static',
				plugins: {
					math: inlineMath,
					mermaid: {
						name: 'mermaid',
						type: 'diagram',
						language: 'mermaid',
						getMermaid: (config) => {
							initialize(config);
							return {
								initialize,
								render: renderDiagram
							};
						}
					}
				}
			});

			for (const image of screen.container.querySelectorAll('img')) {
				image.dispatchEvent(new Event('load'));
			}

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown-inline-math] .katex')).toBeTruthy();
				expect(
					screen.container.querySelector('[data-streamdown-block-math] .katex-display')
				).toBeTruthy();
				expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
				expect(screen.container.textContent).toContain('Parity graph');
				expect(screen.container.querySelector('[data-streamdown="table-wrapper"]')).toBeTruthy();
				expect(screen.container.querySelector('button[title="Copy table"]')).toBeTruthy();
				expect(screen.container.querySelector('button[title="Download table"]')).toBeTruthy();
				expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
				expect(
					screen.container.querySelectorAll('button[title="Download image"]').length
				).toBeGreaterThan(0);
			});

			expect(screen.container.querySelector('p img[alt="Inline pixel"]')).toBeTruthy();
			expect(
				screen.container.querySelector('img[alt="Standalone pixel"]')?.closest('p')
			).toBeNull();
			expect(initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					securityLevel: 'strict'
				})
			);
		}
	);
});
