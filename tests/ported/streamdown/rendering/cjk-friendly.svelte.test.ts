import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown CJK-friendly rendering', () => {
	testInBrowser('splits autolinks at CJK boundary punctuation when plugins.cjk is enabled', () => {
		const screen = render(Streamdown, {
			content: '请访问 https://example.com。谢谢',
			static: true,
			plugins: {
				cjk: createCjkPlugin()
			}
		});

		const link = screen.container.querySelector('[data-streamdown-link]');
		expect(link?.textContent).toBe('https://example.com');
		expect(link?.getAttribute('href')).toBe('https://example.com/');
		expect(screen.container.textContent?.trim()).toBe('请访问 https://example.com。谢谢');
	});

	testInBrowser('matches CJK autolinks when they are wrapped in opening punctuation', () => {
		const screen = render(Streamdown, {
			content: '参考（https://example.com）了解详情',
			static: true,
			plugins: {
				cjk: createCjkPlugin()
			}
		});

		const link = screen.container.querySelector('[data-streamdown-link]');
		expect(link?.textContent).toBe('https://example.com');
		expect(link?.getAttribute('href')).toBe('https://example.com/');
		expect(screen.container.textContent?.trim()).toBe('参考（https://example.com）了解详情');
	});

	testInBrowser(
		'supports multiple CJK boundary characters without swallowing surrounding text',
		() => {
			const cases = [
				'日本語はこちら https://example.com】続き',
				'한국어 링크 https://example.com）다음',
				'中文链接 https://example.com：说明'
			];

			for (const content of cases) {
				const screen = render(Streamdown, {
					content,
					static: true,
					plugins: {
						cjk: createCjkPlugin()
					}
				});

				const link = screen.container.querySelector('[data-streamdown-link]');
				expect(link?.textContent).toBe('https://example.com');
				expect(link?.getAttribute('href')).toBe('https://example.com/');
				expect(screen.container.textContent?.trim()).toBe(content);
			}
		}
	);
});
