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
		'renders the complex mixed CJK fixture with stable hierarchy and boundary-safe links',
		async () => {
			const content = await loadFixtureText('cjk-mixed-layout-05.md');
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

			expect(screen.container.querySelector('h1')?.textContent).toBe(
				'复杂中文混排 Markdown 样例 05'
			);

			const orderedList = screen.container.querySelector('ol');
			expect(orderedList?.children.length).toBe(3);
			expect(orderedList?.children[0]?.querySelector('ul')?.children.length).toBe(2);
			expect(orderedList?.children[1]?.querySelector('ol')?.children.length).toBe(2);

			const trailingList = [...screen.container.querySelectorAll('ul')].at(-1);
			expect(trailingList?.children.length).toBe(2);

			expect(screen.container.querySelector('blockquote')?.textContent).toContain(
				'引用块里也要支持 加粗、斜体、code span 与 发布日志'
			);
			expect(screen.container.querySelector('pre code')?.textContent).toContain('emoji😀');
			expect(screen.container.querySelectorAll('table tr')).toHaveLength(4);

			const links = [...screen.container.querySelectorAll('[data-streamdown-link]')];
			expect(links.map((link) => link.textContent)).toEqual(
				expect.arrayContaining([
					'SvelteKit 文档',
					'https://example.com/docs/case-05?lang=zh-CN',
					'issue board',
					'https://example.com/case-05',
					'发布日志',
					'mailto:support@example.com'
				])
			);

			const boundaryLink = links.find((link) => link.textContent === 'https://example.com/case-05');
			expect(boundaryLink?.getAttribute('href')).toBe('https://example.com/case-05');
			expect(screen.container.textContent).toContain(
				'请打开 https://example.com/case-05）；继续追踪后续说明。'
			);
		}
	);

	testInBrowser(
		'renders the complex CJK mixed layout fixture without swallowing punctuation or list structure',
		async () => {
			const content = await loadFixtureText('complex-cjk-mixed-layout-06.md');
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

			const orderedLists = [...screen.container.querySelectorAll('ol')];
			const unorderedLists = [...screen.container.querySelectorAll('ul')];

			expect(screen.container.querySelector('h1')?.textContent).toBe('复杂中文混排回归样例 06');
			expect(orderedLists[0]?.querySelectorAll(':scope > li')).toHaveLength(2);
			expect(unorderedLists[0]?.querySelectorAll(':scope > li')).toHaveLength(2);
			expect(orderedLists[1]?.querySelectorAll(':scope > li')).toHaveLength(2);
			expect(screen.container.querySelector('blockquote')?.textContent).toContain(
				'确认句号。不会进链接里。'
			);
			expect(screen.container.querySelector('pre code')?.textContent).toContain(
				"reviewer: 'ops-bot'"
			);
			expect(screen.container.querySelectorAll('table tbody tr')).toHaveLength(3);
			expect(screen.container.textContent).toContain(
				'（https://example.com/release-notes）后面的中文没有被吞掉。'
			);
			expect(screen.container.textContent).toContain('https://status.example.com/ops?lang=zh-CN。');

			const renderedLinks = [...screen.container.querySelectorAll('[data-streamdown-link]')].map(
				(link) => ({
					text: link.textContent,
					href: link.getAttribute('href')
				})
			);

			expect(renderedLinks).toEqual(
				expect.arrayContaining([
					{
						text: 'https://status.example.com/ops?lang=zh-CN',
						href: 'https://status.example.com/ops?lang=zh-CN'
					},
					{
						text: '新版说明',
						href: 'https://example.com/docs/zh/release-plan'
					},
					{
						text: 'https://status.example.com/ops?id=42',
						href: 'https://status.example.com/ops?id=42'
					}
				])
			);
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
