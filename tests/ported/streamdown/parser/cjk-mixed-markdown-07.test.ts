import { expect } from 'vitest';
import {
	describeInNode,
	getFirstTokenByType,
	loadFixtureText,
	parseMarkdownTokens,
	testInNode
} from '../../../helpers/index.js';

interface TokenLike {
	type: string;
	text?: string;
	href?: string;
	ordered?: boolean;
	tokens?: TokenLike[];
}

function getInlineContainer(tokens: TokenLike[] = []): TokenLike | undefined {
	return tokens.find((token) => token.type === 'paragraph' || token.type === 'text');
}

function getCodespanTexts(tokens: TokenLike[] = []): string[] {
	return tokens
		.filter((token): token is TokenLike & { text: string } => token.type === 'codespan')
		.map((token) => token.text);
}

function getLinks(tokens: TokenLike[] = []): Array<TokenLike & { href: string; text?: string }> {
	return tokens.filter((token): token is TokenLike & { href: string; text?: string } => {
		return token.type === 'link' && typeof token.href === 'string';
	});
}

describeInNode('ported streamdown complex CJK mixed markdown fixture', () => {
	testInNode(
		'parses the fixture with stable CJK punctuation boundaries and mixed inline structures',
		async () => {
			const markdown = await loadFixtureText('cjk-mixed-markdown-07.md');
			const tokens = parseMarkdownTokens(markdown) as TokenLike[];

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'blockquote',
				'list',
				'code',
				'table',
				'paragraph'
			]);

			const introParagraph = tokens[1];
			const introInline = introParagraph?.tokens ?? [];
			expect(getCodespanTexts(introInline)).toEqual(['README.zh-CN.md', 'pnpm test:unit']);
			expect(introInline.map((token) => token.type)).toEqual(
				expect.arrayContaining(['strong', 'em', 'del', 'link'])
			);
			expect(getLinks(introInline).map((token) => token.href)).toEqual([
				'https://example.com/spec?lang=zh-CN&case=07',
				'https://streamdown.dev/docs/cjk?from=ase-70'
			]);
			expect(introInline.at(-1)?.text).toBe('。谢谢。');

			const blockquote = getFirstTokenByType(tokens, 'blockquote') as TokenLike | undefined;
			expect(
				(blockquote?.tokens ?? [])
					.filter((token) => token.type !== 'space')
					.map((token) => token.type)
			).toEqual(['paragraph', 'list']);

			const blockquoteList = getFirstTokenByType(blockquote?.tokens ?? [], 'list') as
				| TokenLike
				| undefined;
			expect(blockquoteList?.ordered).toBe(false);
			expect(blockquoteList?.tokens).toHaveLength(3);

			const boundaryItem = getInlineContainer(blockquoteList?.tokens?.[1]?.tokens ?? []);
			const boundaryInline = boundaryItem?.tokens ?? [];
			expect(getLinks(boundaryInline)[0]?.href).toBe('https://status.example.com/path?q=中文');
			expect(boundaryInline.at(-1)?.text).toBe('。后面的句号要留在正文里。');

			const orderedList = getFirstTokenByType(tokens, 'list') as TokenLike | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(3);

			const nestedList = getFirstTokenByType(orderedList?.tokens?.[1]?.tokens ?? [], 'list') as
				| TokenLike
				| undefined;
			expect(nestedList?.ordered).toBe(false);
			expect(nestedList?.tokens).toHaveLength(3);

			const mixedInlineItem = getInlineContainer(nestedList?.tokens?.[1]?.tokens ?? []);
			expect(mixedInlineItem?.tokens?.map((token) => token.type)).toEqual([
				'text',
				'em',
				'text',
				'strong',
				'text',
				'del',
				'text'
			]);
			expect(mixedInlineItem?.tokens?.[1]?.text).toBe('hotfix');
			expect(mixedInlineItem?.tokens?.[3]?.text).toBe('patch note');
			expect(mixedInlineItem?.tokens?.[5]?.text).toBe('deprecated flag');

			const linkedSubItem = getInlineContainer(nestedList?.tokens?.[2]?.tokens ?? []);
			const linkedInline = linkedSubItem?.tokens ?? [];
			expect(getLinks(linkedInline)[0]?.href).toBe('https://example.org/cases/ase-70');
			expect(linkedInline.at(-1)?.text).toBe('，确认链接后的中文说明还在。');

			const codeBlock = getFirstTokenByType(tokens, 'code') as TokenLike | undefined;
			expect(codeBlock?.text).toContain("file: 'README.zh-CN.md'");
			expect(codeBlock?.text).toContain('console.log(`${report.file} => ${report.command}`);');

			const table = getFirstTokenByType(tokens, 'table') as TokenLike | undefined;
			const tableHead = getFirstTokenByType(table?.tokens ?? [], 'thead') as TokenLike | undefined;
			const tableBody = getFirstTokenByType(table?.tokens ?? [], 'tbody') as TokenLike | undefined;
			expect(tableHead?.tokens?.[0]?.tokens?.map((cell) => cell.text)).toEqual([
				'字段',
				'English Key',
				'说明'
			]);
			expect(tableBody?.tokens).toHaveLength(3);

			const linkCell = tableBody?.tokens?.[1]?.tokens?.[2];
			expect(getLinks(linkCell?.tokens ?? [])[0]?.href).toBe(
				'https://streamdown.dev/docs/cjk?from=table'
			);
			expect(linkCell?.tokens?.at(-1)?.text).toBe('。');

			const noteCell = tableBody?.tokens?.[2]?.tokens?.[2];
			expect(getCodespanTexts(noteCell?.tokens ?? [])).toEqual(['CHANGELOG.md']);

			const closingParagraph = tokens.at(-1);
			const closingInline = closingParagraph?.tokens ?? [];
			expect(getCodespanTexts(closingInline)).toEqual(['inline code']);
			expect(getLinks(closingInline)[0]?.href).toBe('https://example.net/final');
			expect(closingParagraph?.text).toContain('English”这一行，在渲染后仍保持原有层级与标点。');
		}
	);
});
