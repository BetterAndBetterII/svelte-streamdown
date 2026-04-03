import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend streaming behavior', () => {
	testInNode('handles nested formatting cut mid-stream', () => {
		expect(parseIncompleteMarkdownText('This is **bold with *ital')).toBe(
			'This is **bold with *ital*'
		);
		expect(parseIncompleteMarkdownText('**bold _und')).toBe('**bold _und_**');
	});

	testInNode('handles headings, blockquotes, tables, and mixed incomplete formats', () => {
		expect(parseIncompleteMarkdownText('# Main Title\n## Subtitle with **emph')).toBe(
			'# Main Title\n## Subtitle with **emph**'
		);
		expect(parseIncompleteMarkdownText('> Quote with **bold')).toBe('> Quote with **bold**');
		expect(parseIncompleteMarkdownText('| Col1 | Col2 |\n|------|------|\n| **dat')).toBe(
			'| Col1 | Col2 |\n|------|------|\n| **dat**'
		);
		expect(parseIncompleteMarkdownText('Text **bold `code')).toBe('Text **bold `code**`');
	});

	testInNode('matches the chunk-by-chunk real-world streaming expectations', () => {
		const chunks = [
			'Here is',
			'Here is a **bold',
			'Here is a **bold statement',
			'Here is a **bold statement** about',
			'Here is a **bold statement** about `code',
			'Here is a **bold statement** about `code`.'
		];

		expect(parseIncompleteMarkdownText(chunks[0])).toBe('Here is');
		expect(parseIncompleteMarkdownText(chunks[1])).toBe('Here is a **bold**');
		expect(parseIncompleteMarkdownText(chunks[2])).toBe('Here is a **bold statement**');
		expect(parseIncompleteMarkdownText(chunks[3])).toBe('Here is a **bold statement** about');
		expect(parseIncompleteMarkdownText(chunks[4])).toBe(
			'Here is a **bold statement** about `code`'
		);
		expect(parseIncompleteMarkdownText(chunks[5])).toBe(chunks[5]);
	});
});
