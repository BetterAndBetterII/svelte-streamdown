import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown complex CJK mixed markdown fixture 03 rendering', () => {
	testInBrowser(
		'renders mixed Chinese markdown without collapsing punctuation or list structure',
		async () => {
			const content = await loadFixtureText('cjk-mixed-markdown-03.md');
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

			const rootText = screen.container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			const renderedLinks = [...screen.container.querySelectorAll('[data-streamdown-link]')].map(
				(link) => link.textContent?.trim()
			);

			expect(rootText).toContain('发布回顾：Streamdown 中文混排样例 03');
			expect(rootText).toContain('https://streamdown.app/docs/start-here，以及 emoji 😀');
			expect(rootText).toContain('Look good，直接 merge 吧。');
			expect(rootText).toContain('访问 https://streamdown.app/changelog；不要吞掉句号。');

			expect(screen.container.querySelectorAll('ol > li')).toHaveLength(3);
			expect(screen.container.querySelectorAll('ol > li > ul > li')).toHaveLength(6);

			expect(screen.container.querySelector('blockquote [data-streamdown-link]')?.textContent).toBe(
				'发布检查表'
			);
			expect(screen.container.querySelector('blockquote')?.textContent).toContain(
				'README.md、deploy.sh 和 发布检查表 在中文句子里并排出现时'
			);

			expect(
				screen.container.querySelector('[data-streamdown="code-block-body"]')?.textContent
			).toContain(
				'pnpm exec vitest --run --project server tests/ported/streamdown/parser/cjk-mixed-markdown-03.test.ts'
			);
			expect(screen.container.querySelectorAll('[data-streamdown="table"] tbody tr')).toHaveLength(
				3
			);
			expect(
				screen.container.querySelector('[data-streamdown="table"] tbody tr:last-child')?.textContent
			).toContain('访问 https://streamdown.app/changelog；不要吞掉句号。');

			expect(renderedLinks).toContain('https://streamdown.app/docs/start-here');
			expect(renderedLinks).toContain('https://streamdown.app/zh-CN/getting-started');
			expect(renderedLinks).toContain('https://status.streamdown.app/incidents/ase-66');
			expect(renderedLinks).toContain('https://example.com/guide?id=ase-66');
		}
	);
});
