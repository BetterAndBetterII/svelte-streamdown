import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown complex CJK mixed markdown fixture 09 rendering', () => {
	testInBrowser(
		'renders mixed Chinese markdown structure with stable punctuation, links, lists, code, and table output',
		async () => {
			const content = await loadFixtureText('complex-cjk-mixed-09.md');
			const screen = render(Streamdown, {
				content,
				mode: 'static',
				linkSafety: {
					enabled: false
				},
				plugins: {
					cjk: createCjkPlugin()
				}
			});

			expect(screen.container.querySelector('h1')?.textContent).toBe(
				'发布说明：deploy.sh 与 API 巡检'
			);
			expect(screen.container.querySelector('p')?.textContent).toContain(
				'中文标点（例如“全角冒号：”、句号。）和 English words 相邻时，渲染不要吞字。🙂'
			);

			const links = [...screen.container.querySelectorAll('[data-streamdown-link]')];
			expect(links.map((link) => link.textContent)).toEqual(
				expect.arrayContaining([
					'https://example.com/docs/streamdown?lang=zh-CN',
					'Runbook（内部版）',
					'https://status.example.com/incidents/ase-72',
					'https://example.com/path?q=cjk&from=fixture',
					'https://example.com/help/cjk-layout'
				])
			);

			const docsLink = links.find((link) =>
				link.textContent?.includes('https://example.com/docs/streamdown?lang=zh-CN')
			);
			expect(docsLink?.getAttribute('href')).toBe('https://example.com/docs/streamdown?lang=zh-CN');

			const topLevelOrderedList = screen.container.querySelector('ol');
			expect(topLevelOrderedList).toBeTruthy();
			expect(topLevelOrderedList?.querySelectorAll(':scope > li')).toHaveLength(3);

			const firstTopLevelItem = topLevelOrderedList?.querySelector(
				':scope > li:nth-child(1)'
			) as HTMLLIElement | null;
			const secondTopLevelItem = topLevelOrderedList?.querySelector(
				':scope > li:nth-child(2)'
			) as HTMLLIElement | null;
			const thirdTopLevelItem = topLevelOrderedList?.querySelector(
				':scope > li:nth-child(3)'
			) as HTMLLIElement | null;

			expect(firstTopLevelItem?.querySelectorAll('ul > li')).toHaveLength(3);
			expect(secondTopLevelItem?.querySelectorAll('ol > li')).toHaveLength(2);
			expect(thirdTopLevelItem?.querySelectorAll('ul > li')).toHaveLength(2);
			expect(screen.container.textContent).toContain(
				'例如“版本号 v3.0.3：已发布”，冒号前后文字都要在。'
			);

			expect(screen.container.querySelector('blockquote')?.textContent).toContain(
				'句尾要保留中文分号；以及 emoji 🚀。'
			);

			expect(screen.container.querySelector('pre code')?.textContent).toContain(
				'案例 ${name}：CJK mixed layout stable'
			);

			const table = screen.container.querySelector('table');
			expect(table).toBeTruthy();
			expect(table?.querySelectorAll('tbody tr')).toHaveLength(3);
			expect(table?.textContent).toContain('中文说明与 English label 混排');
			expect(table?.textContent).toContain('pnpm test -- --run');
			expect(table?.textContent).toContain('自动链接后面要保留句号。');
		}
	);
});
