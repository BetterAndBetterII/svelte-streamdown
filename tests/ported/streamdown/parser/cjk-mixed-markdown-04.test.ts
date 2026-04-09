import { expect } from 'vitest';
import {
	describeInNode,
	getFirstTokenByType,
	getTokensByType,
	loadFixtureText,
	parseMarkdownTokens,
	testInNode
} from '../../../helpers/index.js';

interface TokenLike {
	type: string;
	text?: string;
	href?: string;
	depth?: number;
	lang?: string;
	ordered?: boolean;
	tokens?: TokenLike[];
}

interface TableCellToken extends TokenLike {
	type: 'th' | 'td';
	tokens: TokenLike[];
}

interface TableRowToken extends TokenLike {
	type: 'tr';
	tokens: TableCellToken[];
}

interface TableSectionToken extends TokenLike {
	type: 'thead' | 'tbody';
	tokens: TableRowToken[];
}

function collectTokensByType(tokens: TokenLike[], type: string): TokenLike[] {
	const matches: TokenLike[] = [];

	for (const token of tokens) {
		if (token.type === type) {
			matches.push(token);
		}

		if (Array.isArray(token.tokens)) {
			matches.push(...collectTokensByType(token.tokens, type));
		}
	}

	return matches;
}

describeInNode('ported streamdown mixed CJK markdown fixture 04', () => {
	testInNode(
		'parses mixed Chinese markdown blocks and preserves inline token boundaries',
		async () => {
			const markdown = await loadFixtureText('cjk-mixed-markdown-04.md');
			const tokens = parseMarkdownTokens(markdown) as TokenLike[];

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'list',
				'blockquote',
				'table',
				'code',
				'paragraph'
			]);

			const heading = getFirstTokenByType(tokens, 'heading') as TokenLike | undefined;
			expect(heading?.depth).toBe(1);
			expect(heading?.text).toBe('复杂中文混排巡检 04：发布前回归记录');

			const paragraphs = getTokensByType(tokens, 'paragraph') as TokenLike[];
			expect(paragraphs).toHaveLength(2);

			const introParagraph = paragraphs[0];
			expect(
				collectTokensByType(introParagraph.tokens ?? [], 'codespan').map((token) => token.text)
			).toEqual(['README.zh-CN.md', 'src/lib/markdown.ts', 'pnpm test', 'release-note']);
			expect(
				collectTokensByType(introParagraph.tokens ?? [], 'strong').map((token) => token.text)
			).toEqual(['高优先级提醒（beta）']);
			expect(
				collectTokensByType(introParagraph.tokens ?? [], 'em').map((token) => token.text)
			).toEqual(['灰度说明（draft）']);
			expect(
				collectTokensByType(introParagraph.tokens ?? [], 'del').map((token) => token.text)
			).toEqual(['旧版 checklist']);
			const introLinks = collectTokensByType(introParagraph.tokens ?? [], 'link');
			expect(introLinks.map((token) => token.href)).toEqual([
				'https://example.com/release-notes?lang=zh-CN',
				'https://status.example.com/streamdown'
			]);
			expect(introLinks[0]?.text).toBe('发布说明（含 `release-note` 标签）');
			expect(introLinks[1]?.text).toBe('https://status.example.com/streamdown');
			expect(introParagraph.text).toContain('emoji 😀 紧贴英文，也不应该吞字。');

			const orderedList = getFirstTokenByType(tokens, 'list') as TokenLike | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(3);
			expect(orderedList?.tokens?.[0]?.text).toContain(
				'准备阶段：确认 `docs/发布流程.md` 已更新。'
			);
			expect(orderedList?.tokens?.[1]?.text).toContain('验证阶段：记录以下观察。');
			expect(orderedList?.tokens?.[2]?.text).toContain(
				'收尾阶段：把结果同步到 `reports/ase-67.md`，并提醒 reviewer 查看 <https://review.example.com/ase-67>。'
			);

			const prepNestedList = getFirstTokenByType(orderedList?.tokens?.[0]?.tokens ?? [], 'list') as
				| TokenLike
				| undefined;
			expect(prepNestedList?.ordered).toBe(false);
			expect(prepNestedList?.tokens).toHaveLength(2);
			expect(
				collectTokensByType(prepNestedList?.tokens ?? [], 'link').map((token) => token.href)
			).toEqual(['https://example.com/spec/plan']);
			expect(
				collectTokensByType(prepNestedList?.tokens ?? [], 'codespan').map((token) => token.text)
			).toEqual(['PLAN.md', 'fixtures/cases/cjk-04.json']);

			const verifyNestedList = getFirstTokenByType(
				orderedList?.tokens?.[1]?.tokens ?? [],
				'list'
			) as TokenLike | undefined;
			expect(verifyNestedList?.ordered).toBe(false);
			expect(verifyNestedList?.tokens).toHaveLength(3);
			expect(
				collectTokensByType(verifyNestedList?.tokens ?? [], 'codespan').map((token) => token.text)
			).toEqual(['Streamdown.render()', 'token.type === "link"']);
			expect(
				collectTokensByType(verifyNestedList?.tokens ?? [], 'strong').map((token) => token.text)
			).toEqual(['加粗说明']);
			expect(
				collectTokensByType(verifyNestedList?.tokens ?? [], 'em').map((token) => token.text)
			).toEqual(['斜体提醒']);
			expect(
				collectTokensByType(verifyNestedList?.tokens ?? [], 'del').map((token) => token.text)
			).toEqual(['待移除项']);
			expect(verifyNestedList?.tokens?.[2]?.text).toContain(
				'中文冒号：说明，不要把后面的“说明”吞掉。'
			);

			const blockquote = getFirstTokenByType(tokens, 'blockquote') as TokenLike | undefined;
			const blockquoteParagraph = getFirstTokenByType(blockquote?.tokens ?? [], 'paragraph') as
				| TokenLike
				| undefined;
			expect(blockquoteParagraph?.text).toContain(
				'https://ops.example.com/runbook。请确认全角句号不进入 URL。'
			);
			expect(
				collectTokensByType(blockquoteParagraph?.tokens ?? [], 'link').map((token) => token.href)
			).toEqual(['https://ops.example.com/runbook']);
			expect(
				collectTokensByType(blockquoteParagraph?.tokens ?? [], 'codespan').map(
					(token) => token.text
				)
			).toEqual(['inline code']);
			expect(
				collectTokensByType(blockquoteParagraph?.tokens ?? [], 'strong').map((token) => token.text)
			).toEqual(['强调文字']);

			const table = getFirstTokenByType(tokens, 'table') as TokenLike | undefined;
			const thead = getFirstTokenByType(table?.tokens ?? [], 'thead') as
				| TableSectionToken
				| undefined;
			const tbody = getFirstTokenByType(table?.tokens ?? [], 'tbody') as
				| TableSectionToken
				| undefined;
			expect(thead?.tokens[0]?.tokens.map((cell) => cell.text)).toEqual(['项目', '当前值', '备注']);
			expect(tbody?.tokens).toHaveLength(3);
			expect(tbody?.tokens[1]?.tokens[1]?.text).toBe('<https://dash.example.com/streamdown>');
			expect(
				collectTokensByType(tbody?.tokens[1]?.tokens[1]?.tokens ?? [], 'link').map(
					(token) => token.href
				)
			).toEqual(['https://dash.example.com/streamdown']);
			expect(
				collectTokensByType(tbody?.tokens[2]?.tokens[1]?.tokens ?? [], 'codespan').map(
					(token) => token.text
				)
			).toEqual(['stable']);

			const codeBlock = getFirstTokenByType(tokens, 'code') as TokenLike | undefined;
			expect(codeBlock?.lang).toBe('ts');
			expect(codeBlock?.text).toContain("const reportFile = 'reports/巡检-04.md';");
			expect(codeBlock?.text).toContain('console.log(summary);');

			const closingParagraph = paragraphs[1];
			const closingLinks = collectTokensByType(closingParagraph.tokens ?? [], 'link');
			expect(closingLinks.map((token) => token.href)).toEqual([
				'https://example.com/cjk-boundary',
				'https://example.com/dashboard?view=zh-CN'
			]);
			expect(closingLinks[0]?.text).toBe('https://example.com/cjk-boundary');
			expect(closingLinks[1]?.text).toBe('监控面板（含 `beta` 标签）');
			expect(
				collectTokensByType(closingParagraph.tokens ?? [], 'codespan').map((token) => token.text)
			).toEqual(['beta']);
			expect(closingParagraph.text).toContain('“OK✅”');
		}
	);
});
