import { expect } from 'vitest';
import {
	describeInNode,
	getFirstTokenByType,
	getTokensByType,
	loadFixtureText,
	parseMarkdownBlocks,
	parseMarkdownTokens,
	testInNode
} from '../../../helpers/index.js';

interface TokenLike {
	type: string;
	text?: string;
	href?: string | null;
	depth?: number;
	lang?: string;
	ordered?: boolean;
	align?: string | null;
	tokens?: TokenLike[];
}

interface ListItemToken extends TokenLike {
	tokens?: TokenLike[];
}

interface ListToken extends TokenLike {
	type: 'list';
	ordered?: boolean;
	tokens?: ListItemToken[];
}

function getContainerToken(tokens: TokenLike[] | undefined): TokenLike | undefined {
	return tokens?.find((token) => token.type === 'paragraph' || token.type === 'text');
}

describeInNode('ported streamdown complex CJK mixed-markdown fixture', () => {
	testInNode('keeps top-level block order stable for the mixed layout fixture', async () => {
		const markdown = await loadFixtureText('cjk-mixed-layout-08.md');
		const blocks = parseMarkdownBlocks(markdown);
		const tokens = parseMarkdownTokens(markdown);

		expect(blocks).toHaveLength(7);
		expect(tokens.map((token) => token.type)).toEqual([
			'heading',
			'paragraph',
			'blockquote',
			'list',
			'code',
			'table',
			'paragraph'
		]);

		const heading = getFirstTokenByType(tokens, 'heading') as TokenLike | undefined;
		expect(heading?.depth).toBe(1);
		expect(heading?.text).toBe('发布前检查：复杂中文 mixed Markdown 样例 08');

		const codeBlock = getFirstTokenByType(tokens, 'code') as TokenLike | undefined;
		expect(codeBlock?.lang).toBe('ts');
		expect(codeBlock?.text).toContain("summary: '中文 mixed Markdown 保持稳定'");

		expect(blocks[3]).toContain('1. 准备阶段');
		expect(blocks[5]).toContain('监控链接');
	});

	testInNode('preserves inline CJK boundaries, nested lists, and autolinks', async () => {
		const markdown = await loadFixtureText('cjk-mixed-layout-08.md');
		const tokens = parseMarkdownTokens(markdown);

		const paragraphs = getTokensByType(tokens, 'paragraph') as TokenLike[];
		expect(paragraphs).toHaveLength(2);

		const introParagraph = paragraphs[0];
		expect(introParagraph.text).toContain('emoji 🙂');

		const introInlineTypes = (introParagraph.tokens ?? []).map((token) => token.type);
		expect(introInlineTypes).toContain('codespan');
		expect(introInlineTypes).toContain('strong');
		expect(introInlineTypes).toContain('link');

		const introCode = getFirstTokenByType(introParagraph.tokens ?? [], 'codespan') as
			| TokenLike
			| undefined;
		expect(introCode?.text).toBe('src/routes/+page.svelte');

		const introStrongIndex = (introParagraph.tokens ?? []).findIndex(
			(token) => token.type === 'strong'
		);
		expect(introStrongIndex).toBeGreaterThan(0);
		expect(introParagraph.tokens?.[introStrongIndex + 1]?.text).toContain('，请先记录到');

		const introLink = getFirstTokenByType(introParagraph.tokens ?? [], 'link') as
			| TokenLike
			| undefined;
		expect(introLink?.href).toBe('https://example.com/releases/08?lang=zh-CN');
		expect(introLink?.text).toBe('发布面板');

		const blockquote = getFirstTokenByType(tokens, 'blockquote') as TokenLike | undefined;
		const quoteParagraph = getFirstTokenByType(blockquote?.tokens ?? [], 'paragraph') as
			| TokenLike
			| undefined;
		expect((quoteParagraph?.tokens ?? []).map((token) => token.type)).toEqual([
			'text',
			'em',
			'text',
			'codespan',
			'text',
			'del',
			'text',
			'link',
			'text'
		]);
		expect(quoteParagraph?.tokens?.[8]?.text).toContain('并继续观察。');

		const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
		expect(orderedList?.ordered).toBe(true);
		expect(orderedList?.tokens).toHaveLength(3);

		const secondItem = orderedList?.tokens?.[1];
		const secondItemContainer = getContainerToken(secondItem?.tokens);
		expect((secondItemContainer?.tokens ?? []).map((token) => token.type)).toEqual([
			'text',
			'strong',
			'text',
			'em',
			'text',
			'del',
			'text',
			'codespan',
			'text'
		]);
		expect(secondItemContainer?.tokens?.[1]?.text).toBe('API 文案');
		expect(secondItemContainer?.tokens?.[3]?.text).toBe('fallback');
		expect(secondItemContainer?.tokens?.[5]?.text).toBe('旧注释');
		expect(secondItemContainer?.tokens?.[7]?.text).toBe('/healthz');
		expect(secondItemContainer?.tokens?.[8]?.text).toContain('）而断裂。');

		const secondNestedList = getFirstTokenByType(secondItem?.tokens ?? [], 'list') as
			| ListToken
			| undefined;
		expect(secondNestedList?.ordered).toBe(false);
		expect(secondNestedList?.tokens).toHaveLength(2);

		const autolinkItemContainer = getContainerToken(secondNestedList?.tokens?.[1]?.tokens);
		const autolink = getFirstTokenByType(autolinkItemContainer?.tokens ?? [], 'link') as
			| TokenLike
			| undefined;
		expect(autolink?.href).toBe('https://status.example.com/release/08/logs');
		expect(autolink?.text).toBe('https://status.example.com/release/08/logs');

		const thirdNestedList = getFirstTokenByType(orderedList?.tokens?.[2]?.tokens ?? [], 'list') as
			| ListToken
			| undefined;
		expect(thirdNestedList?.ordered).toBe(true);
		expect(thirdNestedList?.tokens).toHaveLength(2);
	});

	testInNode(
		'parses table links and closing paragraph boundaries without swallowing CJK text',
		async () => {
			const markdown = await loadFixtureText('cjk-mixed-layout-08.md');
			const tokens = parseMarkdownTokens(markdown);

			const table = getFirstTokenByType(tokens, 'table') as TokenLike | undefined;
			const thead = getFirstTokenByType(table?.tokens ?? [], 'thead') as TokenLike | undefined;
			const tbody = getFirstTokenByType(table?.tokens ?? [], 'tbody') as TokenLike | undefined;

			expect(thead?.tokens?.[0]?.tokens?.map((cell) => cell.text)).toEqual([
				'项目',
				'当前值',
				'备注'
			]);
			expect(tbody?.tokens).toHaveLength(3);
			expect(tbody?.tokens?.[0]?.tokens?.[1]?.tokens?.[0]?.text).toBe('ready');

			const statusLinkCell = tbody?.tokens?.[1]?.tokens?.[1];
			const statusLink = getFirstTokenByType(statusLinkCell?.tokens ?? [], 'link') as
				| TokenLike
				| undefined;
			expect(statusLink?.href).toBe('https://status.example.com/release/08');
			expect(statusLink?.text).toBe('Status');

			const closingParagraph = getTokensByType(tokens, 'paragraph')[1] as TokenLike | undefined;
			expect(closingParagraph?.text).toContain('中文：English');
			expect(closingParagraph?.text).toContain('全角（brackets）');

			const closingLinks = getTokensByType(closingParagraph?.tokens ?? [], 'link') as TokenLike[];
			expect(closingLinks.map((token) => token.href)).toEqual([
				'https://docs.example.com/release-08?lang=zh-CN'
			]);

			const closingCodespans = getTokensByType(
				closingParagraph?.tokens ?? [],
				'codespan'
			) as TokenLike[];
			expect(closingCodespans.map((token) => token.text)).toEqual([
				'packages/rendering/parser.ts',
				'CHANGELOG.zh-CN.md'
			]);
		}
	);
});
