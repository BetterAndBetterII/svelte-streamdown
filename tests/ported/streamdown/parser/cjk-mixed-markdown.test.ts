import { expect } from 'vitest';
import {
	describeInNode,
	getFirstTokenByType,
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

interface HeadingToken {
	type: 'heading';
	depth: number;
	text: string;
	tokens?: InlineToken[];
}

interface ParagraphToken {
	type: 'paragraph';
	text: string;
	tokens?: InlineToken[];
}

interface BlockquoteToken {
	type: 'blockquote';
	tokens?: Array<ParagraphToken | ListToken>;
}

interface ListItemToken {
	text?: string;
	tokens?: Array<ParagraphToken | InlineToken | ListToken>;
}

interface ListToken {
	type: 'list';
	ordered: boolean;
	tokens?: ListItemToken[];
}

interface CodeToken {
	type: 'code';
	lang?: string;
	text: string;
}

interface TableCellToken {
	text: string;
	tokens?: InlineToken[];
}

interface TableRowToken {
	tokens: TableCellToken[];
}

interface TableSectionToken {
	type: 'thead' | 'tbody' | 'tfoot';
	tokens: TableRowToken[];
}

interface TableToken {
	type: 'table';
	align: Array<string | null>;
	tokens: TableSectionToken[];
}

function findInlineToken(tokens: InlineToken[], type: string): InlineToken | undefined {
	return tokens.find((token) => token.type === type);
}

describeInNode('ported streamdown complex CJK mixed-markdown fixture', () => {
	testInNode(
		'parses headings, mixed inline formatting, nested lists, code, tables, and CJK link boundaries',
		async () => {
			const markdown = await loadFixtureText('cjk-mixed-markdown-regression-01.md');
			const tokens = parseMarkdownTokens(markdown);

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'blockquote',
				'list',
				'code',
				'table',
				'paragraph'
			]);

			const heading = getFirstTokenByType(tokens, 'heading') as HeadingToken | undefined;
			expect(heading?.depth).toBe(1);
			expect(heading?.text).toContain('复杂中文混排 Markdown 回归样例 01');

			const intro = getFirstTokenByType(tokens, 'paragraph') as ParagraphToken | undefined;
			const introTokens = intro?.tokens ?? [];
			expect(intro?.text).toContain('这些中英文边界、全角标点与 emoji 😀 都不应该吞字');
			expect(findInlineToken(introTokens, 'strong')?.text).toBe('Streamdown');
			expect(findInlineToken(introTokens, 'em')?.text).toBe('parser IR');
			expect(findInlineToken(introTokens, 'del')?.text).toBe('legacy renderer');
			expect(findInlineToken(introTokens, 'codespan')?.text).toBe('src/lib/markdown.ts');
			expect(findInlineToken(introTokens, 'link')?.href).toBe('https://example.com/release/ase-64');
			expect(intro?.text).toContain('https://example.com；这些');

			const quote = getFirstTokenByType(tokens, 'blockquote') as BlockquoteToken | undefined;
			const quoteParagraph = getFirstTokenByType(
				(quote?.tokens ?? []) as ParagraphToken[],
				'paragraph'
			) as ParagraphToken | undefined;
			const quoteTokens = quoteParagraph?.tokens ?? [];
			expect(quoteParagraph?.text).toContain('不要把中文句号“。”或冒号“：”误算进 URL');
			expect(findInlineToken(quoteTokens, 'codespan')?.text).toBe('pnpm test');
			expect(findInlineToken(quoteTokens, 'link')?.href).toBe('https://example.com/ci/ase-64');

			const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(3);

			const firstNestedList = orderedList?.tokens?.[0]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(firstNestedList?.ordered).toBe(false);
			expect(firstNestedList?.tokens?.[0]?.text).toContain('README.md');
			expect(firstNestedList?.tokens?.[0]?.text).toContain('CHANGELOG.md');
			expect(firstNestedList?.tokens?.[0]?.text).toContain('docs/cjk-note.md');
			expect(firstNestedList?.tokens?.[1]?.text).toContain('**粗体术语**');
			expect(firstNestedList?.tokens?.[1]?.text).toContain('斜体提醒');

			const secondNestedList = orderedList?.tokens?.[1]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(secondNestedList?.ordered).toBe(false);
			expect(secondNestedList?.tokens).toHaveLength(3);
			expect(secondNestedList?.tokens?.[0]?.text).toContain('legacy-parser');
			expect(secondNestedList?.tokens?.[1]?.text).toContain(
				'请打开 https://example.com/docs。然后继续'
			);

			const secondNestedOrderedList = secondNestedList?.tokens?.[2]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(secondNestedOrderedList?.ordered).toBe(true);
			expect(secondNestedOrderedList?.tokens?.[0]?.text).toContain('ASE-64');
			expect(secondNestedOrderedList?.tokens?.[1]?.text).toContain(
				'tests/fixtures/cjk-mixed-markdown-regression-01.md'
			);

			const code = getFirstTokenByType(tokens, 'code') as CodeToken | undefined;
			expect(code?.lang).toBe('ts');
			expect(code?.text).toContain("ticket: 'ASE-64'");
			expect(code?.text).toContain("fixture: 'tests/fixtures/cjk-mixed-markdown-regression-01.md'");

			const table = getFirstTokenByType(tokens, 'table') as TableToken | undefined;
			expect(table?.align).toEqual([null, null, null]);
			expect(table?.tokens).toHaveLength(2);
			expect(table?.tokens?.[0]?.type).toBe('thead');
			expect(table?.tokens?.[1]?.type).toBe('tbody');
			expect(table?.tokens?.[0]?.tokens?.[0]?.tokens.map((cell) => cell.text)).toEqual([
				'字段',
				'示例',
				'备注'
			]);
			expect(table?.tokens?.[1]?.tokens).toHaveLength(3);
			expect(table?.tokens?.[1]?.tokens?.[1]?.tokens?.[0]?.text).toBe('Link');
			expect(table?.tokens?.[1]?.tokens?.[1]?.tokens?.[1]?.text).toBe('https://example.com/spec');

			const outro = tokens.at(-1) as ParagraphToken | undefined;
			const outroTokens = outro?.tokens ?? [];
			expect(outro?.text).toContain(
				'English 单词贴着中文全角逗号、顿号、括号（例如 parser、renderer）出现'
			);
			expect(findInlineToken(outroTokens, 'codespan')?.text).toBe('codespan');
			expect(findInlineToken(outroTokens, 'link')?.href).toBe(
				'https://example.com/spec/detail'
			);
		}
	);
});
