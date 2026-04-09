import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown complex CJK mixed rendering', () => {
	testInBrowser(
		'renders the complex Chinese fixture with stable text boundaries and nesting',
		async () => {
			const content = await loadFixtureText('cjk-complex-mixed.md');
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

			const headings = [...screen.container.querySelectorAll('h1, h2')].map((heading) =>
				heading.textContent?.trim()
			);
			expect(headings).toEqual(['发布复盘：Streamdown 中文混排回归', '检查清单', '差异摘要']);

			const blockquote = screen.container.querySelector('blockquote');
			expect(blockquote?.textContent).toContain('issue #128 后面的句号。都不应该丢失。');
			expect(blockquote?.querySelectorAll('ul > li')).toHaveLength(2);

			const orderedLists = screen.container.querySelectorAll('ol');
			expect(orderedLists).toHaveLength(2);

			const mainOrderedList = orderedLists[0];
			const topLevelOrderedItems = mainOrderedList
				? [...mainOrderedList.children].filter((child) => child.tagName === 'LI')
				: [];
			expect(topLevelOrderedItems).toHaveLength(3);

			const firstNestedList = topLevelOrderedItems[0]?.querySelector('ul');
			const firstNestedItems = firstNestedList
				? [...firstNestedList.children].filter((child) => child.tagName === 'LI')
				: [];
			expect(firstNestedItems).toHaveLength(3);
			expect(firstNestedItems[1]?.textContent).toContain(
				'在「Hotfix Ready」标签后补一句：已同步 staging。'
			);

			const secondNestedList = topLevelOrderedItems[1]?.querySelector('ul');
			const secondNestedItems = secondNestedList
				? [...secondNestedList.children].filter((child) => child.tagName === 'LI')
				: [];
			expect(secondNestedItems).toHaveLength(3);
			expect(secondNestedItems[0]?.textContent).toContain(
				'https://example.com/changelog；后面的分号和“后面的中文”要保留。'
			);
			expect(secondNestedItems[1]?.textContent).toContain(
				'Markdown 链接 API diff 与 renderInline() 之间不能串位。'
			);

			const deepOrderedList = secondNestedItems[2]?.querySelector('ol');
			const deepOrderedItems = deepOrderedList
				? [...deepOrderedList.children].filter((child) => child.tagName === 'LI')
				: [];
			expect(deepOrderedItems).toHaveLength(2);
			expect(deepOrderedItems[1]?.textContent).toContain('再确认 legacy path 已下线');

			const codeBlock = screen.container.querySelector('[data-streamdown="code-block"] code');
			expect(codeBlock?.textContent).toContain("title: '中文 mixed Markdown 不吞全角标点'");
			expect(codeBlock?.textContent).toContain("command: 'pnpm test -- --run'");

			const tableRows = screen.container.querySelectorAll('table tr');
			expect(tableRows).toHaveLength(5);
			expect(screen.container.querySelectorAll('table code')).toHaveLength(2);

			const links = [...screen.container.querySelectorAll('[data-streamdown-link]')].map(
				(link) => ({
					text: link.textContent,
					href: link.getAttribute('href')
				})
			);
			expect(links).toEqual(
				expect.arrayContaining([
					{
						text: '发布说明',
						href: 'https://example.com/release-notes?lang=zh-CN'
					},
					{
						text: 'https://example.com/runbook',
						href: 'https://example.com/runbook'
					},
					{
						text: 'https://example.com/changelog',
						href: 'https://example.com/changelog'
					},
					{
						text: 'API diff',
						href: 'https://example.com/api-diff'
					},
					{
						text: 'Runbook',
						href: 'https://example.com/runbook'
					},
					{
						text: 'https://example.com/ops',
						href: 'https://example.com/ops'
					}
				])
			);

			expect(screen.container.textContent).toContain('https://example.com/runbook。🙂');
			expect(screen.container.textContent).toContain(
				'https://example.com/changelog；后面的分号和“后面的中文”要保留。'
			);
			expect(screen.container.textContent).toContain(
				'最后，请把 “done” 记录到 notes/release.log，并确认中英混排、列表层级、表格和引用块的可读性没有回退。'
			);
		}
	);
});
