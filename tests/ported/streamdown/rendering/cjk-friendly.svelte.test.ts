import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown CJK-friendly rendering', () => {
	testInBrowser(
		'renders emphasis and strikethrough text with CJK punctuation when plugins.cjk is enabled',
		() => {
			const cases = [
				'**この文は太字になります（This sentence will be bolded）。**この文が後に続いても大丈夫です。',
				'*这是斜体文字（带括号）。*后续内容',
				'***重要な情報（詳細）***続き',
				'~~削除されたテキスト（括弧付き）。~~'
			];

			for (const content of cases) {
				const screen = render(Streamdown, {
					content,
					static: true,
					plugins: {
						cjk: createCjkPlugin()
					}
				});

				expect(screen.container.textContent?.trim()).toBe(
					content.replaceAll('**', '').replaceAll('*', '').replaceAll('~~', '')
				);
			}
		}
	);

	testInBrowser('splits autolinks at CJK boundary punctuation when plugins.cjk is enabled', () => {
		const screen = render(Streamdown, {
			content: '请访问 https://example.com。谢谢',
			static: true,
			linkSafety: {
				enabled: false
			},
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
			linkSafety: {
				enabled: false
			},
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
		'renders mixed CJK commentary markdown with nested lists and inline code intact',
		async () => {
			const content = await loadFixtureText('cjk-commentary.md');
			const screen = render(Streamdown, {
				content,
				static: true,
				plugins: {
					cjk: createCjkPlugin()
				}
			});

			const orderedItems = [...screen.container.querySelectorAll('ol > li')];
			expect(orderedItems).toHaveLength(4);
			expect(screen.container.querySelectorAll('code')).toHaveLength(10);
			expect(orderedItems[0]?.textContent).toContain('文件头部注释：说明文件功能、作者和日期');
			expect(orderedItems[2]?.textContent).toContain(
				'函数注释：为 xxxx() 和 main() 加了文档说明：'
			);
			expect(orderedItems[2]?.querySelectorAll('ul > li')).toHaveLength(4);
			expect(orderedItems[3]?.querySelectorAll('ul > li')).toHaveLength(7);
			expect(screen.container.textContent).toContain('注释采用中英文混合方式');
		}
	);

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
					linkSafety: {
						enabled: false
					},
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
