import { expect } from 'vitest';
import {
	describeInNode,
	testInNode,
	parseMarkdownBlocks,
	parseIncompleteMarkdownText
} from '../../../helpers/index.js';

describeInNode('ported streamdown LaTeX \\begin block (#54)', () => {
	testInNode('correctly processes blocks when \\begin{} math is split by block lexer', () => {
		const content = `$$
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
$$`;

		const blocks = parseMarkdownBlocks(content);
		expect(blocks.length).toBeGreaterThan(0);

		// The math block should be parseable, and parseIncompleteMarkdown should not
		// corrupt any of the resulting blocks
		for (const block of blocks) {
			const result = parseIncompleteMarkdownText(block);
			expect(typeof result).toBe('string');
		}
	});

	testInNode('handles incomplete LaTeX block with \\begin without adding extra $$', () => {
		const content = `$$
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
$$`;

		const result = parseIncompleteMarkdownText(content);

		// Should not produce $$$$ (four dollar signs)
		expect(result).not.toContain('$$$$');
		// The content should still be present
		expect(result).toContain('\\begin{pmatrix}');
		expect(result).toContain('\\end{pmatrix}');
	});

	testInNode('handles complete LaTeX block with multiple \\begin environments', () => {
		const content = `$$
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
a \\\\
b
\\end{pmatrix}
$$`;

		const result = parseIncompleteMarkdownText(content);

		// Both environments should be present
		expect(result).toContain('\\begin{pmatrix}');
		expect(result).toContain('\\end{pmatrix}');
	});

	testInNode('handles incomplete LaTeX block ending with equals sign', () => {
		const content = `$$
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=`;

		const result = parseIncompleteMarkdownText(content);

		// The content should be present (parser completes the block math)
		expect(result).toContain('\\begin{pmatrix}');
		expect(result).toContain('x');
		expect(result).toContain('y');
	});
});
