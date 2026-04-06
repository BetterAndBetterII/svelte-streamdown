import { describe, expect, test } from 'vitest';
import { parseBlocks } from '../lib/marked/index.js';

describe('streaming block segmentation parity', () => {
	test('keeps footnote references and definitions in a single block', () => {
		const markdown = 'Paragraph with ref[^note]\n\n[^note]: Footnote body';

		expect(parseBlocks(markdown)).toEqual([markdown]);
	});

	test('merges multiline html blocks before continuing with later paragraphs', () => {
		const markdown = '<details>\n<summary>Title</summary>\n\nBody\n</details>\n\nNext paragraph';
		const blocks = parseBlocks(markdown);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toContain('<details>');
		expect(blocks[0]).toContain('</details>');
		expect(blocks[1].trim()).toBe('Next paragraph');
	});

	test('keeps block math content together when interior lines look like setext markers', () => {
		const markdown = '$$\na =\n2\n$$\n\nAfter';
		const blocks = parseBlocks(markdown);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toContain('$$\na =\n2\n$$');
		expect(blocks[1].trim()).toBe('After');
	});

	test('does not treat double dollars inside fenced code blocks as math delimiters', () => {
		const markdown = [
			'```bash',
			'# Process tree',
			'pstree -p $$',
			'echo $$',
			'```',
			'',
			'Some text after.'
		].join('\n');
		const blocks = parseBlocks(markdown);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toContain('pstree -p $$');
		expect(blocks[0]).toContain('echo $$');
		expect(blocks.find((block) => block.trim() === '$$')).toBeUndefined();
		expect(blocks[1].trim()).toBe('Some text after.');
	});

	test('keeps a fenced code block separate from a following math block', () => {
		const markdown = ['```bash', 'echo $$', '```', '', '$$', 'math here', '$$'].join('\n');
		const blocks = parseBlocks(markdown);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toContain('echo $$');
		expect(blocks[1].trim()).toBe('$$\nmath here\n$$');
	});

	test('treats void html tags as self-contained blocks instead of merging later content into them', () => {
		const breakMarkdown = '<br>\n\nSome text after the break.';
		expect(parseBlocks(breakMarkdown).join('')).toContain('Some text after the break.');

		const imageMarkdown = '<img src="test.png">\n\nParagraph after image.';
		expect(parseBlocks(imageMarkdown).join('')).toContain('Paragraph after image.');

		const ruleMarkdown = '<hr>\n\nContent after hr.';
		expect(parseBlocks(ruleMarkdown).join('')).toContain('Content after hr.');
	});
});
