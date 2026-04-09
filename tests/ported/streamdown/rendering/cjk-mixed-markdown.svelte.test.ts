import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown complex CJK mixed-markdown rendering', () => {
	testInBrowser(
		'renders the complex CJK regression fixture without swallowing punctuation or list structure',
		async () => {
			const content = await loadFixtureText('cjk-mixed-markdown-regression-01.md');
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

			expect(screen.container.querySelector('h1')?.textContent).toContain(
				'复杂中文混排 Markdown 回归样例 01'
			);

			const anchors = [...screen.container.querySelectorAll('a')];
			const releaseLink = anchors.find(
				(anchor) => anchor.getAttribute('href') === 'https://example.com/release/ase-64'
			);
			const ciLink = anchors.find(
				(anchor) => anchor.getAttribute('href') === 'https://example.com/ci/ase-64'
			);
			const rootAutolink = anchors.find((anchor) => anchor.textContent === 'https://example.com');
			const docsAutolink = anchors.find(
				(anchor) => anchor.textContent === 'https://example.com/docs'
			);

			expect(releaseLink?.textContent).toBe('回归记录');
			expect(ciLink?.textContent).toBe('CI 面板');
			expect(rootAutolink?.getAttribute('href')).toBe('https://example.com/');
			expect(docsAutolink?.getAttribute('href')).toBe('https://example.com/docs');

			const orderedItems = [...screen.container.querySelectorAll('ol > li')];
			expect(orderedItems).toHaveLength(5);
			expect(orderedItems[0]?.textContent).toContain('发布前核对');
			expect(orderedItems[1]?.textContent).toContain('异常复盘');
			expect(orderedItems[2]?.textContent).toContain('记录 ASE-64');
			expect(orderedItems[3]?.textContent).toContain(
				'检查 tests/fixtures/cjk-mixed-markdown-regression-01.md'
			);
			expect(orderedItems[4]?.textContent).toContain('数据摘录');

			const topLevelOrderedList = screen.container.querySelector('ol');
			expect(topLevelOrderedList?.querySelectorAll(':scope > li')).toHaveLength(3);
			expect(
				topLevelOrderedList?.querySelectorAll(':scope > li')[0]?.querySelectorAll('ul > li')
			).toHaveLength(2);
			expect(
				topLevelOrderedList?.querySelectorAll(':scope > li')[1]?.querySelectorAll('ul > li')
			).toHaveLength(3);
			expect(
				topLevelOrderedList
					?.querySelectorAll(':scope > li')[1]
					?.querySelectorAll('ul > li')[2]
					?.querySelectorAll('ol > li')
			).toHaveLength(2);

			expect(screen.container.querySelector('blockquote')?.textContent).toContain(
				'不要把中文句号“。”或冒号“：”误算进 URL'
			);
			expect(screen.container.querySelector('pre code')?.textContent).toContain(
				"fixture: 'tests/fixtures/cjk-mixed-markdown-regression-01.md'"
			);

			const table = screen.container.querySelector('table');
			expect(table).toBeTruthy();
			expect(table?.querySelectorAll('tr')).toHaveLength(4);
			expect([...table!.querySelectorAll('th')].map((cell) => cell.textContent?.trim())).toEqual([
				'字段',
				'示例',
				'备注'
			]);

			expect(screen.container.textContent).toContain('https://example.com；这些中英文边界');
			expect(screen.container.textContent).toContain('请打开 https://example.com/docs。然后继续');
			expect(screen.container.textContent).toContain(
				'如果 codespan、链接详情 和 English 单词贴着中文全角逗号、顿号、括号'
			);
		}
	);
});
