import { expect } from 'vitest';
import {
	type ParserIrBlockNode,
	type ParserIrInline,
	buildLocalParserIr
} from '../../../contracts/parser-ir.js';
import { describeInNode, loadFixtureText, testInNode } from '../../../helpers/index.js';

function flattenInlineText(tokens: ParserIrInline[]): string {
	return tokens
		.map((token) => {
			switch (token.kind) {
				case 'text':
				case 'inlineCode':
					return token.text;
				case 'strong':
				case 'emphasis':
				case 'delete':
				case 'link':
				case 'subscript':
				case 'superscript':
					return flattenInlineText(token.children);
				case 'image':
					return token.alt;
				case 'break':
					return '\n';
				default:
					return '';
			}
		})
		.join('');
}

function expectNodeKind<TKind extends ParserIrBlockNode['kind']>(
	node: ParserIrBlockNode | undefined,
	kind: TKind
): Extract<ParserIrBlockNode, { kind: TKind }> {
	expect(node?.kind).toBe(kind);
	return node as Extract<ParserIrBlockNode, { kind: TKind }>;
}

describeInNode('ported streamdown complex CJK mixed-markdown fixture', () => {
	testInNode(
		'preserves headings, mixed inline tokens, nested lists, tables, and CJK boundary text',
		async () => {
			const markdown = await loadFixtureText('cjk-mixed-layout-05.md');
			const document = buildLocalParserIr(markdown);

			expect(document.normalization.incompleteMarkdownRepaired).toBe(false);
			expect(document.blocks.map((block) => block.nodes.map((node) => node.kind))).toEqual([
				['heading'],
				['paragraph'],
				['list'],
				['blockquote'],
				['code'],
				['table'],
				['paragraph'],
				['list']
			]);

			const heading = expectNodeKind(document.blocks[0]?.nodes[0], 'heading');
			expect(flattenInlineText(heading.inline)).toBe('复杂中文混排 Markdown 样例 05');

			const intro = expectNodeKind(document.blocks[1]?.nodes[0], 'paragraph');
			expect(intro.inline.map((token) => token.kind)).toEqual(
				expect.arrayContaining(['strong', 'emphasis', 'delete', 'inlineCode', 'link'])
			);
			expect(flattenInlineText(intro.inline)).toContain('中文加粗重点、English term、旧版字段');
			expect(flattenInlineText(intro.inline)).toContain(
				'同时保留 SvelteKit 文档 和 https://example.com/docs/case-05?lang=zh-CN，以及 emoji 😀。'
			);
			const introLinks = intro.inline.filter(
				(token): token is Extract<ParserIrInline, { kind: 'link' }> => token.kind === 'link'
			);
			expect(introLinks.map((token) => token.url)).toEqual([
				'https://kit.svelte.dev',
				'https://example.com/docs/case-05?lang=zh-CN'
			]);

			const orderedList = expectNodeKind(document.blocks[2]?.nodes[0], 'list');
			expect(orderedList.ordered).toBe(true);
			expect(orderedList.items).toHaveLength(3);

			const firstNestedList = expectNodeKind(orderedList.items[0]?.blocks[1], 'list');
			expect(firstNestedList.ordered).toBe(false);
			expect(firstNestedList.items).toHaveLength(2);
			expect(
				flattenInlineText(expectNodeKind(firstNestedList.items[1]?.blocks[0], 'paragraph').inline)
			).toContain('hotfix 标签，也不要把中文逗号，或句号。吞掉。');

			const secondNestedList = expectNodeKind(orderedList.items[1]?.blocks[1], 'list');
			expect(secondNestedList.ordered).toBe(true);
			expect(secondNestedList.items).toHaveLength(2);
			expect(
				flattenInlineText(expectNodeKind(secondNestedList.items[1]?.blocks[0], 'paragraph').inline)
			).toContain('子步骤 B：核对 issue board。');

			expect(
				flattenInlineText(expectNodeKind(orderedList.items[2]?.blocks[0], 'paragraph').inline)
			).toContain('https://example.com/case-05）；继续追踪后续说明。');

			const quote = expectNodeKind(document.blocks[3]?.nodes[0], 'blockquote');
			const quoteParagraph = expectNodeKind(quote.blocks[0], 'paragraph');
			expect(quoteParagraph.inline.map((token) => token.kind)).toEqual(
				expect.arrayContaining(['strong', 'emphasis', 'inlineCode', 'link'])
			);
			expect(flattenInlineText(quoteParagraph.inline)).toContain(
				'发布日志；否则就不是完整样例。🧪'
			);

			const code = expectNodeKind(document.blocks[4]?.nodes[0], 'code');
			expect(code.lang).toContain('ts');
			expect(code.lang).toContain('fixtures/cjk-mixed-layout-05.ts');
			expect(code.meta ?? null).toBeNull();
			expect(code.text).toContain("const summary = ['中文', 'English', 'emoji😀'].join(' / ');");

			const table = expectNodeKind(document.blocks[5]?.nodes[0], 'table');
			expect(table.headerRowCount).toBe(1);
			expect(table.rows).toHaveLength(4);
			expect(flattenInlineText(table.rows[1]?.cells[2]?.inline ?? [])).toBe(
				'保留中文与 English 的相邻边界'
			);
			expect(flattenInlineText(table.rows[2]?.cells[2]?.inline ?? [])).toContain(
				'链接后保留 ）； 与后续中文'
			);

			const outro = expectNodeKind(document.blocks[6]?.nodes[0], 'paragraph');
			expect(flattenInlineText(outro.inline)).toContain(
				'《OpenASE Guide》、tests/fixtures/cjk-mixed-layout-05.md 与 mailto:support@example.com；这里的中文冒号：和英文冒号:'
			);
			const outroLinks = outro.inline.filter(
				(token): token is Extract<ParserIrInline, { kind: 'link' }> => token.kind === 'link'
			);
			expect(outroLinks.map((token) => token.url)).toEqual(['mailto:support@example.com']);

			const closingList = expectNodeKind(document.blocks[7]?.nodes[0], 'list');
			expect(closingList.ordered).toBe(false);
			expect(closingList.items).toHaveLength(2);
			expect(
				flattenInlineText(expectNodeKind(closingList.items[1]?.blocks[0], 'paragraph').inline)
			).toContain('ordered list / unordered list 的 DOM 结构。');
		}
	);
});
