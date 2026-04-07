import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createMathPlugin, math, parseBlocks } from '../../../../src/lib/index.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown math rendering', () => {
	testInBrowser('renders block KaTeX output with display classes', async () => {
		const screen = render(Streamdown, {
			content: '$$\nL = \\\\frac{1}{2} \\\\rho v^2 S C_L\n$$',
			plugins: { math }
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('.katex-display .katex')).toBeTruthy();
		});
		expect(screen.container.textContent).toContain('L');
	});

	testInBrowser('renders inline and block math with the local math plugin contract', async () => {
		const inlineMath = createMathPlugin({ singleDollarTextMath: true });
		const screen = render(Streamdown, {
			content: 'Inline $E = mc^2$ plus:\n\n$$\nx = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}\n$$',
			plugins: { math: inlineMath }
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-streamdown-inline-math] .katex')).toBeTruthy();
			expect(
				screen.container.querySelector('[data-streamdown-block-math] .katex-display')
			).toBeTruthy();
		});
	});

	testInBrowser('renders inline math immediately while streaming is active', async () => {
		const inlineMath = createMathPlugin({ singleDollarTextMath: true });
		const screen = render(Streamdown, {
			content: 'Inline $E = mc^2$ while streaming',
			isAnimating: true,
			plugins: { math: inlineMath }
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-streamdown-inline-math] .katex')).toBeTruthy();
		});
		expect(screen.container.textContent).not.toContain('$E = mc^2$');
	});

	testInBrowser('keeps matrix equations intact when preceded by text', () => {
		const content = `For example:
$$
A \\\\vec{v} =
\\\\begin{pmatrix} 1 & 2 \\\\\\\\ 3 & 4 \\\\end{pmatrix}
\\\\begin{pmatrix} 5 \\\\\\\\ 6 \\\\end{pmatrix}
=
\\\\begin{pmatrix} 17 \\\\\\\\ 39 \\\\end{pmatrix}
$$`;

		const blocks = parseBlocks(content);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toContain('pmatrix');
	});

	testInBrowser('renders matrix equations even when the closing $$ is incomplete', async () => {
		const screen = render(Streamdown, {
			content: `$$
\\\\begin{bmatrix}
1 & 2 & 3 \\\\\\\\
4 & 5 & 6 \\\\\\\\
7 & 8 & 9
\\\\end{bmatrix}
=
\\\\begin{bmatrix}
a \\\\\\\\
b \\\\\\\\
c
\\\\end{bmatrix}`,
			parseIncompleteMarkdown: true,
			plugins: { math }
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-streamdown-block-math]')).toBeTruthy();
		});
		expect(
			screen.container.querySelector('.katex-display, .katex, [data-streamdown-block-math]')
		).toBeTruthy();
	});
});
