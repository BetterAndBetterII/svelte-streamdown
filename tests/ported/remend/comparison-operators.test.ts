import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend comparison operators', () => {
	testInNode('escapes comparison operators inside list items', () => {
		expect(parseIncompleteMarkdownText('- > 25: rich')).toBe('- \\> 25: rich');
		expect(parseIncompleteMarkdownText('* > 25: rich')).toBe('* \\> 25: rich');
		expect(parseIncompleteMarkdownText('+ > 25: rich')).toBe('+ \\> 25: rich');
		expect(parseIncompleteMarkdownText('1. > 25: rich')).toBe('1. \\> 25: rich');
		expect(parseIncompleteMarkdownText('2) > 10: high')).toBe('2) \\> 10: high');
		expect(parseIncompleteMarkdownText('  - > 25: rich')).toBe('  - \\> 25: rich');
		expect(parseIncompleteMarkdownText('- >= 10: high')).toBe('- \\>= 10: high');
		expect(parseIncompleteMarkdownText('- > $100: expensive')).toBe('- \\> $100: expensive');
	});

	testInNode('does not escape blockquotes or non-comparison list content', () => {
		expect(parseIncompleteMarkdownText('> Some blockquote')).toBe('> Some blockquote');
		expect(parseIncompleteMarkdownText('> 25 is a number')).toBe('> 25 is a number');
		expect(parseIncompleteMarkdownText('- > Some quoted text')).toBe('- > Some quoted text');
		expect(parseIncompleteMarkdownText('- > Read more about this')).toBe(
			'- > Read more about this'
		);
		expect(parseIncompleteMarkdownText('>25')).toBe('>25');
	});

	testInNode('keeps code blocks unchanged while still composing with other handlers', () => {
		const codeBlock = '```\n- > 25: in code\n```';

		expect(parseIncompleteMarkdownText(codeBlock)).toBe(codeBlock);
		expect(parseIncompleteMarkdownText('- > 25: **bold')).toBe('- \\> 25: **bold**');
	});
});
