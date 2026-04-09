import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown complex CJK mixed markdown rendering', () => {
	testInBrowser(
		'renders the complex fixture with stable nesting and punctuation-aware links',
		async () => {
			const content = await loadFixtureText('cjk-mixed-markdown-07.md');
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

			const anchors = [...screen.container.querySelectorAll<HTMLAnchorElement>('a')];
			const introParagraph = screen.container.querySelector('p');
			const blockquote = screen.container.querySelector('blockquote');
			const orderedItems = [...screen.container.querySelectorAll('ol > li')];
			const tableRows = [...screen.container.querySelectorAll('tbody tr')];
			const codeBlock = screen.container.querySelector('pre code');
			const closingParagraph = [...screen.container.querySelectorAll('p')].at(-1);

			expect(screen.container.querySelector('h1')?.textContent).toBe(
				'发布说明：Streamdown 中文混排演练 07'
			);
			expect(introParagraph?.textContent).toContain(
				'https://streamdown.dev/docs/cjk?from=ase-70。谢谢。'
			);
			expect(blockquote?.querySelectorAll('ul > li')).toHaveLength(3);
			expect(blockquote?.textContent).toContain(
				'https://status.example.com/path?q=中文。后面的句号要留在正文里。'
			);
			expect(orderedItems).toHaveLength(3);
			expect(orderedItems[1]?.querySelectorAll('ul > li')).toHaveLength(3);
			expect(orderedItems[1]?.textContent).toContain(
				'hotfix、patch note、deprecated flag 是否保持原顺序。'
			);
			expect(codeBlock?.textContent).toContain("file: 'README.zh-CN.md'");
			expect(codeBlock?.textContent).toContain(
				'console.log(`${report.file} => ${report.command}`);'
			);
			expect(tableRows).toHaveLength(3);
			expect(tableRows[1]?.textContent).toContain('https://streamdown.dev/docs/cjk?from=table。');
			expect(tableRows[2]?.textContent).toContain('CHANGELOG.md');
			expect(closingParagraph?.textContent).toContain('中文 + inline code + 链接 + English');

			const specLink = anchors.find((anchor) => anchor.textContent === '回归说明');
			const introAutolink = anchors.find((anchor) =>
				anchor.textContent?.includes('https://streamdown.dev/docs/cjk?from=ase-70')
			);
			const nestedAutolink = anchors.find((anchor) =>
				anchor.textContent?.includes('https://example.org/cases/ase-70')
			);

			expect(anchors).toHaveLength(6);
			expect(specLink?.getAttribute('href')).toBe('https://example.com/spec?lang=zh-CN&case=07');
			expect(introAutolink?.getAttribute('href')).toContain(
				'https://streamdown.dev/docs/cjk?from=ase-70'
			);
			expect(nestedAutolink?.getAttribute('href')).toContain('https://example.org/cases/ase-70');
		}
	);
});
