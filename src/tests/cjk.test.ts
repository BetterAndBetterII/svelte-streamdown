import { describe, expect, test } from 'vitest';
import { lex } from '../lib/marked/index.js';

function getParagraphTokens(markdown: string) {
	const [paragraphToken] = lex(markdown);
	expect(paragraphToken?.type).toBe('paragraph');
	return (paragraphToken as { tokens?: any[] }).tokens ?? [];
}

describe('CJK-friendly tokenization', () => {
	test('parses strong text when CJK punctuation is followed by adjacent text', () => {
		const tokens = getParagraphTokens('**这是粗体文字（带括号）。**后续');

		expect(tokens.map((token) => token.type)).toEqual(['strong', 'text']);
		expect(tokens[0].text).toBe('这是粗体文字（带括号）。');
		expect(tokens[1].text).toBe('后续');
	});

	test('parses emphasis text when CJK punctuation is followed by adjacent text', () => {
		const tokens = getParagraphTokens('*这是斜体文字（带括号）。*后续');

		expect(tokens.map((token) => token.type)).toEqual(['em', 'text']);
		expect(tokens[0].text).toBe('这是斜体文字（带括号）。');
		expect(tokens[1].text).toBe('后续');
	});

	test('parses nested emphasis for triple asterisks with CJK punctuation', () => {
		const tokens = getParagraphTokens('***重要信息（详情）***后续');

		expect(tokens.map((token) => token.type)).toEqual(['em', 'text']);
		expect(tokens[0].text).toBe('**重要信息（详情）**');
		expect(tokens[0].tokens?.map((token: { type: string }) => token.type)).toEqual(['strong']);
		expect(tokens[0].tokens?.[0]?.text).toBe('重要信息（详情）');
		expect(tokens[1].text).toBe('后续');
	});

	test('parses strikethrough text when CJK punctuation is followed by adjacent text', () => {
		const tokens = getParagraphTokens('~~删除的文字（带括号）。~~后续');

		expect(tokens.map((token) => token.type)).toEqual(['del', 'text']);
		expect(tokens[0].text).toBe('删除的文字（带括号）。');
		expect(tokens[1].text).toBe('后续');
	});

	test('splits autolinks at ideographic full stop boundaries', () => {
		const tokens = getParagraphTokens('请访问 https://example.com。谢谢');

		expect(tokens.map((token) => token.type)).toEqual(['text', 'link', 'text']);
		expect(tokens[1].href).toBe('https://example.com');
		expect(tokens[1].text).toBe('https://example.com');
		expect(tokens[2].text).toBe('。谢谢');
	});

	test('splits autolinks at CJK colon boundaries', () => {
		const tokens = getParagraphTokens('链接：https://example.com：后面的文字');

		expect(tokens.map((token) => token.type)).toEqual(['text', 'link', 'text']);
		expect(tokens[0].text).toBe('链接：');
		expect(tokens[1].href).toBe('https://example.com');
		expect(tokens[2].text).toBe('：后面的文字');
	});

	test('splits mailto autolinks at CJK punctuation boundaries', () => {
		const tokens = getParagraphTokens('邮件：mailto:test@example.com。谢谢');

		expect(tokens.map((token) => token.type)).toEqual(['text', 'link', 'text']);
		expect(tokens[1].href).toBe('mailto:test@example.com');
		expect(tokens[2].text).toBe('。谢谢');
	});

	test('splits www autolinks at CJK punctuation boundaries', () => {
		const tokens = getParagraphTokens('访问 www.example.com。谢谢');

		expect(tokens.map((token) => token.type)).toEqual(['text', 'link', 'text']);
		expect(tokens[1].href).toBe('http://www.example.com');
		expect(tokens[1].text).toBe('www.example.com');
		expect(tokens[2].text).toBe('。谢谢');
	});
});
