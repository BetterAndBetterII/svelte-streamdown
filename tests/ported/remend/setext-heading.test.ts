import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend setext heading handling', () => {
	testInNode('guards streamed single and double underline markers with a zero-width space', () => {
		expect(parseIncompleteMarkdownText('here is a list\n-')).toBe('here is a list\n-\u200B');
		expect(parseIncompleteMarkdownText('Some text\n--')).toBe('Some text\n--\u200B');
		expect(parseIncompleteMarkdownText('Some text\n=')).toBe('Some text\n=\u200B');
		expect(parseIncompleteMarkdownText('Some text\n==')).toBe('Some text\n==\u200B');
		expect(parseIncompleteMarkdownText('Some text\n  -')).toBe('Some text\n  -\u200B');
	});

	testInNode(
		'does not modify complete list items or valid setext and horizontal-rule markers',
		() => {
			expect(parseIncompleteMarkdownText('Some text\n---')).toBe('Some text\n---');
			expect(parseIncompleteMarkdownText('Heading\n===')).toBe('Heading\n===');
			expect(parseIncompleteMarkdownText('-')).toBe('-');
			expect(parseIncompleteMarkdownText('\n-')).toBe('\n-');
			expect(parseIncompleteMarkdownText('Some text\n- Item 1\n- Item 2')).toBe(
				'Some text\n- Item 1\n- Item 2'
			);
			expect(parseIncompleteMarkdownText('Some text\n-x')).toBe('Some text\n-x');
			expect(parseIncompleteMarkdownText('Some text\n----')).toBe('Some text\n----');
		}
	);

	testInNode('only guards the final streamed line', () => {
		expect(parseIncompleteMarkdownText('Text 1\n-\nText 2\n-')).toBe('Text 1\n-\nText 2\n-\u200B');
		expect(parseIncompleteMarkdownText('**bold text**\n-')).toBe('**bold text**\n-\u200B');
		expect(parseIncompleteMarkdownText('*italic text*\n-')).toBe('*italic text*\n-\u200B');
		expect(parseIncompleteMarkdownText('`code`\n-')).toBe('`code`\n-\u200B');
	});
});
