import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createCjkPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, loadFixtureText, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown mixed CJK markdown rendering fixture 04', () => {
	testInBrowser(
		'renders mixed Chinese markdown with stable structure and CJK link boundaries',
		async () => {
			const content = await loadFixtureText('cjk-mixed-markdown-04.md');
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

			expect(
				screen.container.querySelector('h1[data-streamdown-heading-1]')?.textContent?.trim()
			).toBe('复杂中文混排巡检 04：发布前回归记录');
			expect(screen.container.querySelectorAll('ol[data-streamdown-ol] > li')).toHaveLength(3);
			expect(
				screen.container.querySelectorAll('ol[data-streamdown-ol] > li:nth-child(1) ul > li')
			).toHaveLength(2);
			expect(
				screen.container.querySelectorAll('ol[data-streamdown-ol] > li:nth-child(2) ul > li')
			).toHaveLength(3);
			expect(
				screen.container.querySelectorAll('blockquote[data-streamdown-blockquote]')
			).toHaveLength(1);
			expect(screen.container.querySelectorAll('tbody[data-streamdown-tbody] > tr')).toHaveLength(
				3
			);
			const codespanTexts = [
				...screen.container.querySelectorAll<HTMLElement>('[data-streamdown-codespan]')
			].map((node) => node.textContent?.trim());
			expect(codespanTexts).toHaveLength(15);
			expect(codespanTexts).toEqual(
				expect.arrayContaining([
					'README.zh-CN.md',
					'PLAN.md',
					'Streamdown.render()',
					'token.type === "link"',
					'inline code',
					'stable',
					'beta'
				])
			);

			const linkHrefs = [
				...screen.container.querySelectorAll<HTMLAnchorElement>('[data-streamdown-link]')
			].map((link) => link.getAttribute('href'));
			expect(linkHrefs).toEqual([
				'https://example.com/release-notes?lang=zh-CN',
				'https://status.example.com/streamdown',
				'https://example.com/spec/plan',
				'https://review.example.com/ase-67',
				'https://ops.example.com/runbook',
				'https://dash.example.com/streamdown',
				'https://example.com/cjk-boundary',
				'https://example.com/dashboard?view=zh-CN'
			]);

			const normalizedText = screen.container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			expect(normalizedText).toContain(
				'https://ops.example.com/runbook。请确认全角句号不进入 URL。'
			);
			expect(normalizedText).toContain(
				'https://example.com/cjk-boundary。然后打开 监控面板（含 beta 标签）；'
			);
			expect(normalizedText).toContain(
				'“OK✅”，说明中英混排、全角标点、列表层级与代码块都保持稳定。'
			);
			expect(screen.container.querySelector('pre code')?.textContent).toContain(
				'const summary = `处理中: ${reportFile}`;'
			);
		}
	);
});
