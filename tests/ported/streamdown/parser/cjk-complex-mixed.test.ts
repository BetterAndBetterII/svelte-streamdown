import { expect } from 'vitest';
import {
	describeInNode,
	getFirstTokenByType,
	getTokensByType,
	loadFixtureText,
	parseMarkdownTokens,
	testInNode
} from '../../../helpers/index.js';

interface InlineToken {
	type: string;
	text?: string;
	href?: string;
	tokens?: InlineToken[];
}

interface LinkToken extends InlineToken {
	type: 'link';
	text: string;
	href: string;
}

interface ParagraphToken {
	type: 'paragraph';
	tokens?: InlineToken[];
}

interface ListItemToken {
	type: 'list_item';
	text?: string;
	tokens?: Array<InlineToken | ListToken>;
}

interface ListToken {
	type: 'list';
	ordered?: boolean;
	tokens?: ListItemToken[];
}

interface TableCellToken {
	type: 'th' | 'td';
	text?: string;
	tokens?: InlineToken[];
}

interface TableRowToken {
	type: 'tr';
	tokens?: TableCellToken[];
}

interface TableSectionToken {
	type: 'thead' | 'tbody' | 'tfoot';
	tokens?: TableRowToken[];
}

interface TableToken {
	type: 'table';
	tokens?: TableSectionToken[];
}

interface CodeToken {
	type: 'code';
	lang?: string;
	text?: string;
}

type BlockquoteChildToken = ParagraphToken | ListToken | { type: 'space' };

function asInlineTokens(tokens: unknown): InlineToken[] {
	return Array.isArray(tokens) ? (tokens as InlineToken[]) : [];
}

function getInlineContainer(
	tokens: Array<InlineToken | ListToken> | undefined
): InlineToken | undefined {
	return tokens?.find(
		(token): token is InlineToken => token.type === 'text' || token.type === 'paragraph'
	);
}

describeInNode('ported streamdown complex CJK mixed fixture', () => {
	testInNode(
		'parses mixed Chinese markdown without swallowing punctuation or inline structure boundaries',
		async () => {
			const markdown = await loadFixtureText('cjk-complex-mixed.md');
			const tokens = parseMarkdownTokens(markdown);

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'blockquote',
				'heading',
				'list',
				'code',
				'heading',
				'table',
				'paragraph'
			]);

			const paragraphs = getTokensByType(tokens, 'paragraph');
			expect(paragraphs).toHaveLength(2);

			const introParagraph = paragraphs[0];
			const introInlineTokens = asInlineTokens(introParagraph?.tokens);
			expect(introInlineTokens.map((token) => token.type)).toEqual([
				'text',
				'codespan',
				'text',
				'codespan',
				'text',
				'codespan',
				'text',
				'strong',
				'text',
				'em',
				'text',
				'del',
				'text',
				'codespan',
				'text',
				'link',
				'text',
				'link',
				'text'
			]);

			const introLinks = introInlineTokens.filter(
				(token): token is LinkToken =>
					token.type === 'link' && typeof token.text === 'string' && typeof token.href === 'string'
			);
			expect(
				introLinks.map((token) => ({
					text: token.text,
					href: token.href
				}))
			).toEqual([
				{
					text: '发布说明',
					href: 'https://example.com/release-notes?lang=zh-CN'
				},
				{
					text: 'https://example.com/runbook',
					href: 'https://example.com/runbook'
				}
			]);
			expect(introInlineTokens[16]?.text).toBe(' 都能稳定解析；如果要人工复查，也可以打开 ');
			expect(introInlineTokens[18]?.text).toBe('。🙂');

			const blockquote = getFirstTokenByType(tokens, 'blockquote') as
				| { tokens?: BlockquoteChildToken[] }
				| undefined;
			const blockquoteTokens = (blockquote?.tokens ?? []) as BlockquoteChildToken[];
			const quoteParagraph = blockquoteTokens.find(
				(token): token is ParagraphToken => token.type === 'paragraph'
			);
			const quoteInlineTokens = asInlineTokens(quoteParagraph?.tokens);
			expect(quoteInlineTokens.map((token) => token.type)).toEqual([
				'text',
				'codespan',
				'text',
				'link',
				'text'
			]);
			expect(quoteInlineTokens[4]?.text).toBe(' 后面的句号。都不应该丢失。');

			const quoteList = blockquoteTokens.find((token): token is ListToken => token.type === 'list');
			expect(quoteList?.ordered).toBe(false);
			expect(quoteList?.tokens?.map((item) => item.text)).toEqual([
				'复查 `README.zh-CN.md`',
				'记录 emoji：🚀'
			]);

			const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(3);

			const firstNestedList = getFirstTokenByType(
				orderedList?.tokens?.[0]?.tokens as ListToken[],
				'list'
			) as ListToken | undefined;
			expect(firstNestedList?.ordered).toBe(false);
			expect(firstNestedList?.tokens).toHaveLength(3);

			const firstNestedStrong = getInlineContainer(firstNestedList?.tokens?.[1]?.tokens);
			expect(firstNestedStrong?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'strong',
				'text'
			]);
			expect(firstNestedStrong?.tokens?.[0]?.text).toBe('在「');
			expect(firstNestedStrong?.tokens?.[1]?.text).toBe('Hotfix Ready');
			expect(firstNestedStrong?.tokens?.[2]?.text).toBe('」标签后补一句：已同步 staging。');

			const firstNestedEmphasis = getInlineContainer(firstNestedList?.tokens?.[2]?.tokens);
			expect(firstNestedEmphasis?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'em',
				'text'
			]);
			expect(firstNestedEmphasis?.tokens?.[2]?.text).toBe('，不要立刻合并。');

			const secondNestedList = getFirstTokenByType(
				orderedList?.tokens?.[1]?.tokens as ListToken[],
				'list'
			) as ListToken | undefined;
			expect(secondNestedList?.ordered).toBe(false);
			expect(secondNestedList?.tokens).toHaveLength(3);

			const autolinkItem = getInlineContainer(secondNestedList?.tokens?.[0]?.tokens);
			expect(autolinkItem?.tokens?.map((token) => token.type)).toEqual(['text', 'link', 'text']);
			expect(autolinkItem?.tokens?.[1]?.text).toBe('https://example.com/changelog');
			expect(autolinkItem?.tokens?.[2]?.text).toBe('；后面的分号和“后面的中文”要保留。');

			const linkAndCodeItem = getInlineContainer(secondNestedList?.tokens?.[1]?.tokens);
			expect(linkAndCodeItem?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'link',
				'text',
				'codespan',
				'text'
			]);
			expect(linkAndCodeItem?.tokens?.[1]?.text).toBe('API diff');
			expect(linkAndCodeItem?.tokens?.[3]?.text).toBe('renderInline()');

			const nestedDetailListItem = secondNestedList?.tokens?.[2];
			const nestedDetailList = getFirstTokenByType(
				nestedDetailListItem?.tokens as ListToken[],
				'list'
			) as ListToken | undefined;
			expect(nestedDetailList?.ordered).toBe(true);
			expect(nestedDetailList?.tokens).toHaveLength(2);

			const nestedDetailSecondItem = getInlineContainer(nestedDetailList?.tokens?.[1]?.tokens);
			expect(nestedDetailSecondItem?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'del',
				'text'
			]);
			expect(nestedDetailSecondItem?.tokens?.[1]?.text).toBe('legacy path');

			const codeToken = getFirstTokenByType(tokens, 'code') as CodeToken | undefined;
			expect(codeToken?.lang).toBe('ts');
			expect(codeToken?.text).toContain("title: '中文 mixed Markdown 不吞全角标点'");
			expect(codeToken?.text).toContain("command: 'pnpm test -- --run'");

			const table = getFirstTokenByType(tokens, 'table') as TableToken | undefined;
			expect(table?.tokens?.map((section) => section.type)).toEqual(['thead', 'tbody']);

			const tbody = table?.tokens?.[1];
			expect(tbody?.type).toBe('tbody');
			expect(tbody?.tokens).toHaveLength(4);

			const fileRemarkCell = tbody?.tokens?.[0]?.tokens?.[2];
			expect(fileRemarkCell?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'strong',
				'text'
			]);
			expect(fileRemarkCell?.tokens?.[1]?.text).toBe('粗体');

			const runbookCell = tbody?.tokens?.[1]?.tokens?.[1];
			expect(runbookCell?.tokens?.map((token) => token.type)).toEqual(['link']);
			expect(runbookCell?.tokens?.[0]?.text).toBe('Runbook');
			expect(runbookCell?.tokens?.[0]?.href).toBe('https://example.com/runbook');

			const opsCell = tbody?.tokens?.[2]?.tokens?.[1];
			expect(opsCell?.tokens?.map((token) => token.type)).toEqual(['link']);
			expect(opsCell?.tokens?.[0]?.text).toBe('https://example.com/ops');

			const emojiCell = tbody?.tokens?.[3]?.tokens?.[1];
			expect(emojiCell?.tokens?.map((token) => token.type)).toEqual(['codespan', 'text']);
			expect(emojiCell?.tokens?.[0]?.text).toBe(':rocket:');
			expect(emojiCell?.tokens?.[1]?.text).toBe(' / 🚀');

			const finalParagraph = paragraphs[1];
			const finalInlineTokens = asInlineTokens(finalParagraph?.tokens);
			expect(finalInlineTokens.map((token) => token.type)).toEqual(['text', 'codespan', 'text']);
			expect(finalInlineTokens[0]?.text).toBe('最后，请把 “done” 记录到 ');
			expect(finalInlineTokens[1]?.text).toBe('notes/release.log');
			expect(finalInlineTokens[2]?.text).toBe(
				'，并确认中英混排、列表层级、表格和引用块的可读性没有回退。'
			);
		}
	);
});
