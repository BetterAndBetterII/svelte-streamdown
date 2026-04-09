import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown complex CJK mixed markdown fixture 02 rendering', () => {
	testInBrowser(
		'renders headings, nested lists, code blocks, tables, and CJK link boundaries',
		async () => {
			const content = await loadFixtureText('cjk-mixed-markdown-02.md');
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

			const textContent = screen.container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			const headings = [...screen.container.querySelectorAll('h1, h2, h3')].map((node) =>
				node.textContent?.trim()
			);
			const links = [...screen.container.querySelectorAll('a')].map((link) => ({
				href: link.getAttribute('href'),
				text: link.textContent?.trim()
			}));
			const orderedItems = [...screen.container.querySelectorAll('ol > li')];
			const tableRows = [...screen.container.querySelectorAll('tbody tr')];

			expect(headings).toEqual(['版本回归记录：中文、English 与符号边界', '处理步骤', '补充引用']);
			expect(screen.container.querySelectorAll('blockquote ul > li')).toHaveLength(3);
			expect(orderedItems).toHaveLength(3);
			expect(orderedItems[0]?.textContent).toContain(
				'https://example.com/spec，确认链接后的 ， 仍然留在正文里。'
			);
			expect(orderedItems[0]?.textContent).toContain('发布说明（含括号）是否还是一个完整链接。');

			expect(screen.container.querySelectorAll('pre code')).toHaveLength(1);
			expect(screen.container.querySelector('pre code')?.textContent).toContain(
				'tests/fixtures/cjk-mixed-markdown-02.md'
			);
			expect(tableRows).toHaveLength(3);
			expect(screen.container.querySelector('table')?.textContent).toContain(
				'全角冒号要留在正文里'
			);

			expect(links.map((link) => link.href)).toEqual(
				expect.arrayContaining([
					'https://status.example.com/streamdown',
					'https://example.com/dashboard?tab=cjk&view=nightly',
					'https://example.com/spec',
					'https://example.com/release-notes',
					'https://example.com/cases/cjk',
					'https://intra.example.com/ase-65',
					'https://example.com/public/ase-65'
				])
			);

			expect(textContent).toContain('https://status.example.com/streamdown，别把全角逗号吞掉。');
			expect(textContent).toContain('https://example.com/cases/cjk：后面还有说明');
			expect(textContent).toContain(
				'https://example.com/public/ase-65）这一页，别把右括号也吃进去。'
			);
		}
	);
});
