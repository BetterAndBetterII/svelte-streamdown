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

interface CodespanToken extends InlineTokenBase {
	type: 'codespan';
	text: string;
}

interface LinkToken extends InlineTokenBase {
	type: 'link';
	text: string;
	href: string;
}

interface TextContainerToken extends InlineTokenBase {
	type: 'text' | 'paragraph';
	text: string;
	tokens: InlineToken[];
}

type InlineToken = CodespanToken | LinkToken | TextContainerToken | InlineTokenBase;

interface ListItemToken {
	text?: string;
	tokens?: Array<InlineToken | ListToken>;
}

interface ListToken {
	type: 'list';
	ordered?: boolean;
	tokens?: ListItemToken[];
}

interface BlockquoteToken {
	type: 'blockquote';
	tokens?: Array<{
		type: 'paragraph';
		text?: string;
		tokens?: InlineToken[];
	}>;
}

interface CodeToken {
	type: 'code';
	lang?: string;
	text?: string;
}

interface TableCellToken {
	text?: string;
	tokens?: InlineToken[];
}

interface TableRowToken {
	tokens?: TableCellToken[];
}

interface TableSectionToken {
	type: 'thead' | 'tbody';
	tokens?: TableRowToken[];
}

interface TableToken {
	type: 'table';
	tokens?: TableSectionToken[];
}

function asInlineTokens(tokens?: { type: string }[]): InlineToken[] {
	return (tokens ?? []) as InlineToken[];
}

describeInNode('ported streamdown complex CJK mixed markdown fixture 03', () => {
	testInNode(
		'keeps mixed inline tokens and nested structures stable across the fixture',
		async () => {
			const markdown = await loadFixtureText('cjk-mixed-markdown-03.md');
			const tokens = parseMarkdownTokens(markdown);

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'heading',
				'list',
				'blockquote',
				'code',
				'table',
				'paragraph'
			]);

			const headings = getTokensByType(tokens, 'heading');
			const headingInlineTokens = asInlineTokens(headings[0]?.tokens);
			expect(headings).toHaveLength(2);
			expect(headingInlineTokens.map((token) => token.type)).toEqual(['text', 'codespan', 'text']);
			expect((headingInlineTokens[1] as CodespanToken | undefined)?.text).toBe('Streamdown');
			expect(headings[1]?.text).toBe('复盘清单');

			const paragraphs = getTokensByType(tokens, 'paragraph');
			const introInlineTokens = asInlineTokens(paragraphs[0]?.tokens);
			const outroInlineTokens = asInlineTokens(paragraphs[1]?.tokens);
			expect(paragraphs).toHaveLength(2);
			expect(introInlineTokens.map((token) => token.type)).toEqual([
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
				'text'
			]);
			expect(
				introInlineTokens
					.filter((token): token is CodespanToken => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['README.md', 'src/routes/playground/+page.svelte', 'pnpm test:unit']);
			const introLink = getFirstTokenByType(introInlineTokens, 'link');
			expect(introLink?.text).toBe('https://streamdown.app/docs/start-here');
			expect(introLink?.href).toBe('https://streamdown.app/docs/start-here');
			expect((introInlineTokens.at(-1) as InlineTokenBase | undefined)?.text).toContain(
				'，以及 emoji 😀 挤在一起时'
			);

			const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(3);

			const firstItemLead = orderedList?.tokens?.[0]?.tokens?.find(
				(token): token is TextContainerToken => token.type === 'text'
			);
			expect(firstItemLead?.tokens.map((token) => token.type)).toEqual([
				'text',
				'codespan',
				'text',
				'strong',
				'text'
			]);

			const firstNestedList = orderedList?.tokens?.[0]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(firstNestedList?.ordered).toBe(false);
			expect(firstNestedList?.tokens).toHaveLength(2);
			expect(
				(firstNestedList?.tokens?.[1]?.tokens?.[0] as TextContainerToken | undefined)?.tokens
					?.filter((token): token is CodespanToken => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['pnpm verify:clean-build', 'pnpm test:contracts']);

			const secondNestedList = orderedList?.tokens?.[1]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(secondNestedList?.tokens).toHaveLength(2);
			expect(
				(secondNestedList?.tokens?.[0]?.tokens?.[0] as TextContainerToken | undefined)?.tokens?.map(
					(token) => token.type
				)
			).toEqual(['text', 'link', 'text']);
			expect(
				(secondNestedList?.tokens?.[0]?.tokens?.[0] as TextContainerToken | undefined)?.tokens?.[2]
					?.text
			).toBe('。');
			expect(
				(secondNestedList?.tokens?.[1]?.tokens?.[0] as TextContainerToken | undefined)?.tokens?.[1]
			).toMatchObject({
				type: 'link',
				text: 'https://status.streamdown.app/incidents/ase-66'
			});

			const thirdNestedList = orderedList?.tokens?.[2]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(thirdNestedList?.tokens).toHaveLength(2);
			expect(
				(thirdNestedList?.tokens?.[0]?.tokens?.[0] as TextContainerToken | undefined)?.tokens?.map(
					(token) => token.type
				)
			).toEqual(['text', 'em', 'text', 'codespan', 'text']);
			expect(
				(thirdNestedList?.tokens?.[1]?.tokens?.[0] as TextContainerToken | undefined)?.tokens?.map(
					(token) => token.type
				)
			).toEqual(['text', 'del', 'text']);
			expect(
				(thirdNestedList?.tokens?.[1]?.tokens?.[0] as TextContainerToken | undefined)?.tokens?.[2]
					?.text
			).toContain('“中文（含括号）English”拆坏。');

			const blockquote = getFirstTokenByType(tokens, 'blockquote') as BlockquoteToken | undefined;
			const quoteParagraph = blockquote?.tokens?.[0];
			expect(quoteParagraph?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'codespan',
				'text',
				'codespan',
				'text',
				'link',
				'text'
			]);
			expect(
				(quoteParagraph?.tokens ?? [])
					.filter((token): token is CodespanToken => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['README.md', 'deploy.sh']);
			expect((quoteParagraph?.tokens?.[5] as LinkToken | undefined)?.href).toBe(
				'https://example.com/release-checklist'
			);
			expect(quoteParagraph?.tokens?.at(-1)?.text).toContain('必要时还要保留 🙂。');

			const codeBlock = getFirstTokenByType(tokens, 'code') as CodeToken | undefined;
			expect(codeBlock).toMatchObject({
				type: 'code',
				lang: 'bash'
			});
			expect(codeBlock?.text).toContain('pnpm exec vitest --run --project server');
			expect(codeBlock?.text).toContain('echo "done"');

			const table = getFirstTokenByType(tokens, 'table') as TableToken | undefined;
			expect(table?.tokens?.map((token) => token.type)).toEqual(['thead', 'tbody']);
			const tbody = table?.tokens?.[1];
			expect(tbody?.tokens).toHaveLength(3);
			expect(tbody?.tokens?.[1]?.tokens?.[1]?.tokens?.map((token) => token.type)).toEqual([
				'codespan',
				'text',
				'codespan'
			]);
			expect(tbody?.tokens?.[2]?.tokens?.[2]?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'link',
				'text'
			]);
			expect(tbody?.tokens?.[2]?.tokens?.[2]?.tokens?.[2]?.text).toBe('；不要吞掉句号。');

			expect(outroInlineTokens.map((token) => token.type)).toEqual([
				'text',
				'codespan',
				'text',
				'link',
				'text',
				'link',
				'text'
			]);
			expect((outroInlineTokens[3] as LinkToken | undefined)?.href).toBe(
				'https://example.com/internal?lang=zh-CN'
			);
			expect((outroInlineTokens[5] as LinkToken | undefined)?.text).toBe(
				'https://example.com/guide?id=ase-66'
			);
			expect((outroInlineTokens.at(-1) as InlineTokenBase | undefined)?.text).toContain(
				'中文引号“”、顿号、冒号，都应该保持原样。'
			);
		}
	);
});
