import { describe, expect, test } from 'vitest';
import { parseMarkdownBlocks } from '../helpers/index.js';

const loadReferenceParseBlocks = async (): Promise<(markdown: string) => string[]> => {
	const module = await import(
		'../../references/streamdown/packages/streamdown/lib/parse-blocks.tsx'
	);
	return module.parseMarkdownIntoBlocks as (markdown: string) => string[];
};

const normalizeBlocks = (blocks: string[]): string[] =>
	blocks.filter((block) => block.trim().length > 0);

describe('parser block splitting parity', () => {
	const cases = [
		{
			name: 'keeps thematic breaks as standalone blocks without empty neighbors',
			markdown: 'Before\n\n---\n\nAfter'
		},
		{
			name: 'does not mis-detect regex character classes inside fenced code as footnotes',
			markdown: [
				'# Regex Examples',
				'',
				'```perl',
				'# Match URLs',
				'https?://[^\\s<>"{}|\\\\^`\\[\\]]+',
				'```',
				'',
				'More text after the code block.'
			].join('\n')
		},
		{
			name: 'merges multiline html blocks before later paragraphs',
			markdown: '<details>\n<summary>Title</summary>\n\nBody\n</details>\n\nNext paragraph'
		},
		{
			name: 'keeps block math together when interior lines resemble setext headings',
			markdown: '$$\na =\n2\n$$\n\nAfter'
		},
		{
			name: 'keeps real footnote documents in a single block',
			markdown: 'Here is a footnote[^1].\n\n[^1]: This is the footnote content.'
		}
	] as const;

	for (const { name, markdown } of cases) {
		test(name, async () => {
			const parseReferenceBlocks = await loadReferenceParseBlocks();

			expect(normalizeBlocks(parseMarkdownBlocks(markdown))).toEqual(
				normalizeBlocks(parseReferenceBlocks(markdown))
			);
		});
	}
});
