import { expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const tinyGifDataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

describeInBrowser('ported streamdown remaining aggregate closeout', () => {
	testInBrowser(
		'keeps standalone images out of paragraphs and reveals streamed footnotes only after content arrives',
		async () => {
			const screen = render(Streamdown, {
				content: [
					'Inline ![Inline pixel](' + tinyGifDataUri + ') image.',
					'',
					'![Standalone pixel](' + tinyGifDataUri + ')',
					'',
					'Footnote ref[^1].',
					'',
					'[^1]:'
				].join('\n'),
				mode: 'streaming'
			});

			expect(screen.container.querySelector('p img[alt="Inline pixel"]')).toBeTruthy();
			expect(
				screen.container.querySelector('img[alt="Standalone pixel"]')?.closest('p')
			).toBeNull();
			expect(screen.container.querySelector('section[data-footnotes]')).toBeNull();

			await screen.rerender({
				content: [
					'Inline ![Inline pixel](' + tinyGifDataUri + ') image.',
					'',
					'![Standalone pixel](' + tinyGifDataUri + ')',
					'',
					'Footnote ref[^1].',
					'',
					'[^1]: Streamed footnote content.'
				].join('\n'),
				mode: 'streaming'
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('section[data-footnotes]')?.textContent).toContain(
					'Streamed footnote content.'
				);
			});
		}
	);

	testInBrowser(
		'keeps code readable while the highlighter loads and combines allowedElements with urlTransform',
		async () => {
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
				const codeScreen = render(Streamdown, {
					content: '```ts\nconst readiness = "visible";\n```',
					static: true
				});

				expect(codeScreen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
				expect(
					codeScreen.container.querySelector('[data-streamdown="code-block-body"]')?.textContent
				).toContain('const readiness = "visible";');

				await vi.waitFor(() => {
					expect(load).toHaveBeenCalledWith(expect.any(String), 'ts');
				});

				const filterScreen = render(Streamdown, {
					allowedElements: ['p', 'strong', 'a'],
					content: '**bold** and *italic* with [link](https://example.com/path)',
					linkSafety: {
						enabled: false
					},
					static: true,
					urlTransform: (url: string) => `${url}?proxied=1`
				});

				expect(filterScreen.container.querySelector('strong')?.textContent).toBe('bold');
				expect(filterScreen.container.querySelector('em')).toBeNull();
				expect(filterScreen.container.querySelector('a')?.getAttribute('href')).toBe(
					'https://example.com/path?proxied=1'
				);
			} finally {
				if (previousHighlighter === undefined) {
					delete win.STREAMDOWN_HIGHLIGHTER;
				} else {
					win.STREAMDOWN_HIGHLIGHTER = previousHighlighter;
				}
			}
		}
	);
});
