import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend broken markdown variants', () => {
	testInNode('matches rapid formatting switches and half-closed markers', () => {
		expect(parseIncompleteMarkdownText('**bold then *italic then ~~strike')).toBe(
			'**bold then *italic then ~~strike*~~'
		);
		expect(parseIncompleteMarkdownText('~~strike **bold *italic')).toBe(
			'~~strike **bold *italic*~~'
		);
		expect(parseIncompleteMarkdownText('*italic **bold ~~strike `code')).toBe(
			'*italic **bold ~~strike `code***`~~'
		);
		expect(parseIncompleteMarkdownText('**bold ~~strike')).toBe('**bold ~~strike**~~');
		expect(parseIncompleteMarkdownText('*italic **bold')).toBe('*italic **bold***');
		expect(parseIncompleteMarkdownText('text*')).toBe('text*');
		expect(parseIncompleteMarkdownText('text~')).toBe('text~');
		expect(parseIncompleteMarkdownText('text$')).toBe('text$');
		expect(parseIncompleteMarkdownText('**bold*')).toBe('**bold**');
		expect(parseIncompleteMarkdownText('~~strike~')).toBe('~~strike~~');
		expect(parseIncompleteMarkdownText('$$formula$')).toBe('$$formula$$');
	});

	testInNode(
		'handles escapes, incomplete links, blockquotes, tasks, tables, html, and katex tails',
		() => {
			expect(parseIncompleteMarkdownText('\\*not italic')).toBe('\\*not italic');
			expect(parseIncompleteMarkdownText('\\\\*actually italic')).toBe('\\\\*actually italic');
			expect(parseIncompleteMarkdownText('\\**not bold')).toBe('\\**not bold**');
			expect(parseIncompleteMarkdownText('\\*escaped\\* but *real italic')).toBe(
				'\\*escaped\\* but *real italic*'
			);
			expect(parseIncompleteMarkdownText('[link1 and [link2')).toBe(
				'[link1 and [link2](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('[first](url1) and [second')).toBe(
				'[first](url1) and [second](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('[outer [inner]')).toBe(
				'[outer [inner]](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('[**bold link**](incomplete-url')).toBe(
				'[**bold link**](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('[*italic link*](incomplete')).toBe(
				'[*italic link*](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('[`code link`](incomplete')).toBe(
				'[`code link`](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('[**bold link')).toBe(
				'[**bold link](streamdown:incomplete-link)'
			);
			expect(parseIncompleteMarkdownText('> > **deeply nested bold')).toBe(
				'> > **deeply nested bold**'
			);
			expect(parseIncompleteMarkdownText('> * list with **bold')).toBe('> * list with **bold**');
			expect(parseIncompleteMarkdownText('> > > triple nested *italic')).toBe(
				'> > > triple nested *italic*'
			);
			expect(parseIncompleteMarkdownText('> ~~struck text')).toBe('> ~~struck text~~');
			expect(parseIncompleteMarkdownText('- [ ] **bold task')).toBe('- [ ] **bold task**');
			expect(parseIncompleteMarkdownText('- [x] completed ~~struck~~')).toBe(
				'- [x] completed ~~struck~~'
			);
			expect(parseIncompleteMarkdownText('- [ ] *italic task')).toBe('- [ ] *italic task*');
			expect(parseIncompleteMarkdownText('- [ ] `code task')).toBe('- [ ] `code task`');
			expect(parseIncompleteMarkdownText('| **bold | next |')).toBe('| **bold | next |**');
			expect(parseIncompleteMarkdownText('| `code | next |')).toBe('| `code | next |`');
			expect(parseIncompleteMarkdownText('| **bold** | next |')).toBe('| **bold** | next |');
			expect(parseIncompleteMarkdownText('text <!-- incomplete comment')).toBe(
				'text <!-- incomplete comment'
			);
			expect(parseIncompleteMarkdownText("text <script>alert('")).toBe("text <script>alert('");
			expect(parseIncompleteMarkdownText('text <div class="test')).toBe('text');
			expect(parseIncompleteMarkdownText('text <br>')).toBe('text <br>');
			expect(parseIncompleteMarkdownText('text <!-- comment -->')).toBe('text <!-- comment -->');
			expect(parseIncompleteMarkdownText('$$\\frac{x}{y')).toBe('$$\\frac{x}{y$$');
			expect(parseIncompleteMarkdownText('$$\\begin{matrix} a')).toBe('$$\\begin{matrix} a$$');
			expect(parseIncompleteMarkdownText('The price is $50 and $100')).toBe(
				'The price is $50 and $100'
			);
		}
	);
});
