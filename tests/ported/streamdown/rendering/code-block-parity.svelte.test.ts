import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown code block rendering parity', () => {
	testInBrowser(
		'renders block code outside paragraphs while inline code stays inside paragraph content',
		async () => {
			const screen = render(Streamdown, {
				content: [
					'Here is some text.',
					'',
					'```typescript',
					'const foo = "bar";',
					'```',
					'',
					'This is a paragraph with `inline code` in it.'
				].join('\n')
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
			});

			const codeBlock = screen.container.querySelector('[data-streamdown="code-block"]');
			expect(codeBlock?.tagName).toBe('DIV');
			expect(codeBlock?.parentElement?.tagName).not.toBe('P');

			const inlineCode = screen.container.querySelector('[data-streamdown-codespan]');
			const paragraphs = [...screen.container.querySelectorAll('p')];
			expect(inlineCode?.tagName).toBe('CODE');
			expect(paragraphs.some((paragraph) => paragraph.contains(inlineCode))).toBe(true);
		}
	);

	testInBrowser('exposes the code block body language and honors line-number metadata', () => {
		const screen = render(Streamdown, {
			content: '```js startLine=5\nconst x = 1;\n```'
		});

		const body = screen.container.querySelector('[data-streamdown="code-block-body"]');
		const code = screen.container.querySelector('[data-streamdown="code-block-body"] code');
		const line = screen.container.querySelector('[data-streamdown="code-block-body"] code > span');
		expect(body?.getAttribute('data-language')).toBe('js');
		expect(code?.className).toContain('[counter-reset:line]');
		expect(code?.getAttribute('style')).toContain('counter-reset: line 4');
		expect(line?.className).toContain('before:content-[counter(line)]');

		const disabledLineNumbers = render(Streamdown, {
			content: '```js noLineNumbers\nconst x = 1;\n```',
			lineNumbers: true
		});

		expect(
			disabledLineNumbers.container.querySelector('[data-streamdown="code-block-body"] code')
				?.className ?? ''
		).not.toContain('[counter-reset:line]');
	});

	testInBrowser(
		'keeps code readable before the highlighter is ready and renders no loading spinner',
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
				const screen = render(Streamdown, {
					content: '```ts\nconst x = 1;\n```'
				});

				const body = screen.container.querySelector('[data-streamdown="code-block-body"]');
				expect(body?.textContent).toContain('const x = 1;');
				expect(screen.container.querySelector('.animate-spin')).toBeNull();

				await vi.waitFor(() => {
					expect(load).toHaveBeenCalled();
				});
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
