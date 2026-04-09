import { expect } from 'vitest';
import {
	describeInNode,
	getFirstTokenByType,
	getTokensByType,
	loadFixtureText,
	parseMarkdownTokens,
	testInNode
} from '../../../helpers/index.js';

interface InlineTokenBase {
	type: string;
	text?: string;
	href?: string;
	tokens?: InlineToken[];
}

interface LinkToken extends InlineTokenBase {
	type: 'link';
	href: string;
	text: string;
}

interface CodespanToken extends InlineTokenBase {
	type: 'codespan';
	text: string;
}

type InlineToken = LinkToken | CodespanToken | InlineTokenBase;

interface ParagraphToken {
	type: 'paragraph';
	text?: string;
	raw?: string;
	tokens?: InlineToken[];
}

interface HeadingToken {
	type: 'heading';
	depth: number;
	text?: string;
}

interface CodeToken {
	type: 'code';
	text?: string;
	lang?: string;
}

interface TableToken {
	type: 'table';
	raw?: string;
}

interface ListItemToken {
	text?: string;
	tokens?: Array<InlineToken | ParagraphToken | ListToken>;
}

interface ListToken {
	type: 'list';
	ordered?: boolean;
	tokens?: ListItemToken[];
}

function getNestedList(item?: ListItemToken): ListToken | undefined {
	return item?.tokens?.find((token): token is ListToken => token.type === 'list');
}

describeInNode('ported streamdown complex CJK mixed markdown fixture 02', () => {
	testInNode('keeps mixed inline tokens and nested structures stable', async () => {
		const markdown = await loadFixtureText('cjk-mixed-markdown-02.md');
		const tokens = parseMarkdownTokens(markdown);

		expect(tokens.map((token) => token.type)).toEqual(
			expect.arrayContaining(['heading', 'paragraph', 'blockquote', 'list', 'code', 'table'])
		);

		const headings = getTokensByType(tokens, 'heading') as HeadingToken[];
		expect(headings.map((heading) => [heading.depth, heading.text])).toEqual([
			[1, '版本回归记录：中文、English 与符号边界'],
			[2, '处理步骤'],
			[3, '补充引用']
		]);

		const paragraphs = getTokensByType(tokens, 'paragraph') as ParagraphToken[];
		expect(paragraphs).toHaveLength(2);

		const introTokens = paragraphs[0]?.tokens ?? [];
		expect(introTokens.map((token) => token.type)).toEqual(
			expect.arrayContaining(['codespan', 'strong', 'em', 'del', 'link'])
		);
		expect(
			introTokens.find((token): token is CodespanToken => token.type === 'codespan')?.text
		).toBe('docs/release-notes.md');
		expect(introTokens.find((token): token is LinkToken => token.type === 'link')?.href).toBe(
			'https://status.example.com/streamdown'
		);
		expect(paragraphs[0]?.text).toContain(
			'https://status.example.com/streamdown，别把全角逗号吞掉'
		);

		const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
		expect(orderedList?.ordered).toBe(true);
		expect(orderedList?.tokens).toHaveLength(3);

		const firstNestedList = getNestedList(orderedList?.tokens?.[0]);
		expect(firstNestedList?.ordered).toBe(false);
		expect(firstNestedList?.tokens).toHaveLength(2);
		expect(firstNestedList?.tokens?.[0]?.text).toContain('第一层备注');
		expect(firstNestedList?.tokens?.[1]?.text).toContain('第二层备注');

		const secondNestedList = getNestedList(firstNestedList?.tokens?.[1]);
		expect(secondNestedList?.ordered).toBe(false);
		expect(secondNestedList?.tokens).toHaveLength(2);
		expect(secondNestedList?.tokens?.[0]?.text).toContain('https://example.com/spec，确认链接后的');
		expect(secondNestedList?.tokens?.[1]?.text).toContain('发布说明');

		const codeBlock = getFirstTokenByType(tokens, 'code') as CodeToken | undefined;
		expect(codeBlock?.lang).toBe('ts');
		expect(codeBlock?.text).toContain('tests/fixtures/cjk-mixed-markdown-02.md');
		expect(codeBlock?.text).toContain('pnpm exec vitest --run');

		const table = getFirstTokenByType(tokens, 'table') as TableToken | undefined;
		expect(table?.raw).toContain('token.type === "link"');
		expect(table?.raw).toContain('https://example.com/cases/cjk：后面还有说明');
		expect(table?.raw).toContain('全角冒号要留在正文里');

		const finalTokens = paragraphs[1]?.tokens ?? [];
		const finalLinks = finalTokens.filter((token): token is LinkToken => token.type === 'link');
		expect(finalLinks.map((token) => token.href)).toEqual([
			'https://intra.example.com/ase-65',
			'https://example.com/public/ase-65'
		]);
		expect(paragraphs[1]?.text).toContain(
			'https://example.com/public/ase-65）这一页，别把右括号也吃进去。'
		);
	});
});
