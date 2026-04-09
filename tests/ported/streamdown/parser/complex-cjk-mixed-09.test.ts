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
	text?: string;
	tokens?: InlineToken[];
}

interface TextContainerToken {
	type: 'text';
	text?: string;
	tokens?: InlineToken[];
}

interface ListItemToken {
	text?: string;
	tokens?: Array<ParagraphToken | TextContainerToken | ListToken>;
}

interface ListToken {
	type: 'list';
	ordered?: boolean;
	tokens?: ListItemToken[];
}

interface CodeToken {
	type: 'code';
	lang?: string;
	text: string;
}

interface TableCellToken {
	type: 'th' | 'td';
	text: string;
	tokens?: InlineToken[];
}

interface TableRowToken {
	type: 'tr';
	tokens: TableCellToken[];
}

interface TableSectionToken {
	type: 'thead' | 'tbody';
	tokens: TableRowToken[];
}

interface TableToken {
	type: 'table';
	tokens: TableSectionToken[];
}

type ListContainerToken = ParagraphToken | TextContainerToken;

function getListItemContainer(item: ListItemToken): ListContainerToken | undefined {
	return item.tokens?.find(
		(token): token is ListContainerToken => token.type === 'paragraph' || token.type === 'text'
	);
}

describeInNode('ported streamdown complex CJK mixed markdown fixture 09', () => {
	testInNode(
		'parses mixed CJK punctuation, nested structures, links, code, and tables without swallowing text',
		async () => {
			const markdown = await loadFixtureText('complex-cjk-mixed-09.md');
			const tokens = parseMarkdownTokens(markdown);

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'blockquote',
				'list',
				'code',
				'table'
			]);

			const heading = getFirstTokenByType(tokens, 'heading') as HeadingToken | undefined;
			expect(heading?.depth).toBe(1);
			expect(heading?.text).toBe('发布说明：`deploy.sh` 与 API 巡检');
			expect(
				(heading?.tokens ?? [])
					.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['deploy.sh']);

			const intro = getFirstTokenByType(tokens, 'paragraph') as ParagraphToken | undefined;
			expect(intro?.text).toContain(
				'中文标点（例如“全角冒号：”、句号。）和 English words 相邻时，渲染不要吞字。🙂'
			);
			expect(
				(intro?.tokens ?? [])
					.filter((token) => ['strong', 'em', 'del', 'codespan', 'link'].includes(token.type))
					.map((token) => token.type)
			).toEqual(['strong', 'em', 'del', 'codespan', 'codespan', 'link']);
			expect(
				(intro?.tokens ?? [])
					.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['README.zh-CN.md', 'pnpm test -- --run']);

			const docsLink = (intro?.tokens ?? []).find(
				(token) => token.type === 'link' && token.href?.includes('/docs/streamdown')
			);
			expect(docsLink?.href).toBe('https://example.com/docs/streamdown?lang=zh-CN');
			expect(docsLink?.text).toBe('https://example.com/docs/streamdown?lang=zh-CN');

			const blockquote = getFirstTokenByType(tokens, 'blockquote') as
				| { tokens?: ParagraphToken[] }
				| undefined;
			const quoteParagraphs = (blockquote?.tokens ?? []).filter(
				(token): token is ParagraphToken => token.type === 'paragraph'
			);
			expect(quoteParagraphs).toHaveLength(2);
			expect(
				(quoteParagraphs[0]?.tokens ?? [])
					.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['WARN_render_timeout', 'src/lib/markdown.ts']);
			expect(
				(quoteParagraphs[0]?.tokens ?? [])
					.filter((token) => token.type === 'link')
					.map((token) => ({ href: token.href, text: token.text }))
			).toEqual([
				{
					href: 'https://example.com/runbook/cjk-layout',
					text: 'Runbook（内部版）'
				},
				{
					href: 'https://status.example.com/incidents/ase-72',
					text: 'https://status.example.com/incidents/ase-72'
				}
			]);
			expect(quoteParagraphs[1]?.text).toContain('句尾要保留中文分号；以及 emoji 🚀。');
			expect(
				(quoteParagraphs[1]?.tokens ?? [])
					.filter((token) => ['em', 'strong', 'codespan'].includes(token.type))
					.map((token) => token.type)
			).toEqual(['em', 'strong', 'codespan']);

			const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(3);

			const firstNestedList = orderedList?.tokens?.[0]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(firstNestedList?.ordered).toBe(false);
			expect(firstNestedList?.tokens).toHaveLength(3);
			expect(
				(firstNestedList?.tokens?.[0]
					? getListItemContainer(firstNestedList.tokens[0])?.tokens
					: []
				)
					?.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['src/routes/+page.svelte', 'src/lib/Streamdown.svelte']);
			expect(getListItemContainer(firstNestedList?.tokens?.[1] as ListItemToken)?.text).toContain(
				'版本号 v3.0.3：已发布'
			);
			expect(
				(getListItemContainer(firstNestedList?.tokens?.[2] as ListItemToken)?.tokens ?? [])
					.filter((token) => token.type === 'em')
					.map((token) => token.text)
			).toEqual(['强调文本（含括号）']);

			const secondNestedList = orderedList?.tokens?.[1]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(secondNestedList?.ordered).toBe(true);
			expect(secondNestedList?.tokens).toHaveLength(2);
			expect(
				secondNestedList?.tokens?.[0]
					? getListItemContainer(secondNestedList.tokens[0])
							?.tokens?.filter((token) => token.type === 'codespan')
							.map((token) => token.text)
					: []
			).toEqual(['tests/fixtures/complex-cjk-mixed-09.md']);

			const secondNestedSecondItem = getListItemContainer(
				secondNestedList?.tokens?.[1] as ListItemToken
			);
			expect(
				(secondNestedSecondItem?.tokens ?? [])
					.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['code span']);
			expect(
				(secondNestedSecondItem?.tokens ?? [])
					.filter((token) => token.type === 'link')
					.map((token) => token.href)
			).toEqual(['https://example.com/path?q=cjk&from=fixture']);
			expect(
				(secondNestedSecondItem?.tokens ?? [])
					.filter((token) => token.type === 'del')
					.map((token) => token.text)
			).toEqual(['过期说明']);

			const thirdNestedList = orderedList?.tokens?.[2]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(thirdNestedList?.ordered).toBe(false);
			expect(thirdNestedList?.tokens).toHaveLength(2);
			expect(
				(thirdNestedList?.tokens?.[0]
					? getListItemContainer(thirdNestedList.tokens[0])?.tokens
					: []
				)
					?.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['notes/ase-72.md']);
			expect(
				(thirdNestedList?.tokens?.[1]
					? getListItemContainer(thirdNestedList.tokens[1])?.tokens
					: []
				)
					?.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['node scripts/report.js --case ase-72', 'artifacts/cjk-layout.log']);

			const codeBlock = getFirstTokenByType(tokens, 'code') as CodeToken | undefined;
			expect(codeBlock?.lang).toBe('ts');
			expect(codeBlock?.text).toContain('案例 ${name}：CJK mixed layout stable');

			const table = getFirstTokenByType(tokens, 'table') as TableToken | undefined;
			const tableHead = table?.tokens.find(
				(token): token is TableSectionToken => token.type === 'thead'
			);
			const tableBody = table?.tokens.find(
				(token): token is TableSectionToken => token.type === 'tbody'
			);
			expect(tableHead?.tokens[0]?.tokens.map((cell) => cell.text)).toEqual(['项目', '值', '备注']);
			expect(tableBody?.tokens).toHaveLength(3);
			expect(tableBody?.tokens[0]?.tokens.map((cell) => cell.text)).toEqual([
				'环境',
				'staging',
				'中文说明与 English label 混排'
			]);
			expect(
				(tableBody?.tokens[1]?.tokens[1]?.tokens ?? [])
					.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['pnpm test -- --run']);
			expect(
				(tableBody?.tokens[2]?.tokens[1]?.tokens ?? [])
					.filter((token) => token.type === 'link')
					.map((token) => token.href)
			).toEqual(['https://example.com/help/cjk-layout']);
			expect(tableBody?.tokens[2]?.tokens[2]?.text).toBe('自动链接后面要保留句号。');
		}
	);
});
