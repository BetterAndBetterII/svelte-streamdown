import { expect } from 'vitest';
import { IncompleteMarkdownParser } from '../../../src/lib/index.js';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend inline code formatting', () => {
	testInNode('completes incomplete inline code without touching complete spans', () => {
		expect(parseIncompleteMarkdownText('Text with `code')).toBe('Text with `code`');
		expect(parseIncompleteMarkdownText('`incomplete')).toBe('`incomplete`');
		expect(parseIncompleteMarkdownText('Text with `inline code`')).toBe('Text with `inline code`');
		expect(parseIncompleteMarkdownText('`code1` and `code2`')).toBe('`code1` and `code2`');
	});

	testInNode('keeps backticks inside fenced code blocks on the frozen remend path', () => {
		expect(parseIncompleteMarkdownText('```\ncode block with `backtick\n```')).toBe(
			'```\ncode block with `backtick\n```'
		);
		expect(parseIncompleteMarkdownText('```javascript\nconst x = `template')).toBe(
			'```javascript\nconst x = `template\n```'
		);
	});

	testInNode('handles inline triple backticks and trailing inline code after fenced blocks', () => {
		expect(parseIncompleteMarkdownText('```python print("Hello, Sunnyvale!")```')).toBe(
			'```python print("Hello, Sunnyvale!")```'
		);
		expect(parseIncompleteMarkdownText('```python print("Hello, Sunnyvale!")``')).toBe(
			'```python print("Hello, Sunnyvale!")```'
		);
		expect(parseIncompleteMarkdownText('```code```')).toBe('```code```');
		expect(parseIncompleteMarkdownText('```code```\n')).toBe('```code```\n');
		expect(parseIncompleteMarkdownText('```\ncode\n```')).toBe('```\ncode\n```');
		expect(parseIncompleteMarkdownText('``````')).toBe('``````');
		expect(parseIncompleteMarkdownText('text``````')).toBe('text``````');
		expect(parseIncompleteMarkdownText('```\nblock\n```\n`inline')).toBe(
			'```\nblock\n```\n`inline`'
		);
	});

	testInNode('does not let escaped backticks or inline code leak emphasis completion', () => {
		expect(parseIncompleteMarkdownText('\\`not code\\` **bold')).toBe('\\`not code\\` **bold**');
		expect(parseIncompleteMarkdownText('\\` *italic')).toBe('\\` *italic*');
		expect(parseIncompleteMarkdownText('`**bold`')).toBe('`**bold`');
		expect(parseIncompleteMarkdownText('`*italic`')).toBe('`*italic`');
		expect(parseIncompleteMarkdownText('`~~strikethrough`')).toBe('`~~strikethrough`');
		expect(parseIncompleteMarkdownText('**bold')).toBe('**bold**');
		expect(parseIncompleteMarkdownText('*italic')).toBe('*italic*');
		expect(parseIncompleteMarkdownText('~~strike')).toBe('~~strike~~');
		expect(parseIncompleteMarkdownText('`code` **bold')).toBe('`code` **bold**');
	});
});

describeInNode('ported remend inline code without the htmlTags plugin', () => {
	testInNode('keeps the same inline-code behavior when HTML tail stripping is disabled', () => {
		const plugins = IncompleteMarkdownParser.createDefaultPlugins().filter(
			(plugin) => plugin.name !== 'htmlTags'
		);

		expect(parseIncompleteMarkdownText('Text with `code', plugins)).toBe('Text with `code`');
	});
});
