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
	raw?: string;
	href?: string;
	lang?: string;
	ordered?: boolean;
	tokens?: TokenLike[];
}

describeInNode('ported streamdown complex CJK mixed layout fixture', () => {
	testInNode(
		'parses headings, mixed inline tokens, nested lists, blockquotes, code, and tables',
		async () => {
			const markdown = await loadFixtureText('complex-cjk-mixed-layout-06.md');
			const tokens = parseMarkdownTokens(markdown) as TokenLike[];

			expect(tokens.map((token) => token.type)).toEqual([
				'heading',
				'paragraph',
				'list',
				'blockquote',
				'code',
				'table',
				'paragraph'
			]);

			const heading = getFirstTokenByType(tokens, 'heading') as TokenLike | undefined;
			expect(heading?.text).toBe('复杂中文混排回归样例 06');

			const intro = tokens[1];
			expect(intro?.type).toBe('paragraph');
			expect(intro?.tokens?.filter((token) => token.type === 'strong')).toHaveLength(1);
			expect(intro?.tokens?.filter((token) => token.type === 'em')).toHaveLength(1);
			expect(intro?.tokens?.filter((token) => token.type === 'del')).toHaveLength(1);
			expect(
				intro?.tokens?.filter((token) => token.type === 'codespan').map((token) => token.text)
			).toEqual(['README.zh-CN.md', 'pnpm test:unit']);

			const introAutolink = intro?.tokens?.find((token) =>
				token.href?.includes('status.example.com')
			);
			expect(introAutolink?.type).toBe('link');
			expect(introAutolink?.href).toBe('https://status.example.com/ops?lang=zh-CN');

			const orderedList = getFirstTokenByType(tokens, 'list') as TokenLike | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(2);

			const firstItem = orderedList?.tokens?.[0];
			const firstNestedList = firstItem?.tokens?.find((token) => token.type === 'list');
			expect(firstNestedList?.ordered).toBe(false);
			expect(firstNestedList?.tokens).toHaveLength(2);
			expect(firstItem?.raw).toContain('Beta 版');

			const secondItem = orderedList?.tokens?.[1];
			const secondNestedList = secondItem?.tokens?.find((token) => token.type === 'list');
			expect(secondNestedList?.ordered).toBe(true);
			expect(secondNestedList?.tokens).toHaveLength(2);
			expect(secondItem?.raw).toContain('API、CDN 与 i18n');

			const blockquote = getFirstTokenByType(tokens, 'blockquote') as TokenLike | undefined;
			expect(blockquote?.tokens?.map((token) => token.type)).toEqual(['paragraph']);
			const quoteParagraph = blockquote?.tokens?.[0];
			expect(
				quoteParagraph?.tokens
					?.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['timeout=30s']);
			expect(
				quoteParagraph?.tokens?.filter((token) => token.type === 'link').map((token) => token.href)
			).toEqual([
				'https://example.com/docs/troubleshooting',
				'https://status.example.com/ops?id=42'
			]);
			expect(quoteParagraph?.text).toContain('确认句号。不会进链接里。');

			const codeBlock = getFirstTokenByType(tokens, 'code') as TokenLike | undefined;
			expect(codeBlock?.lang).toBe('ts');
			expect(codeBlock?.text).toContain("locale: 'zh-CN'");
			expect(codeBlock?.text).toContain("console.log('deploy ok', releaseNote);");

			const table = getFirstTokenByType(tokens, 'table') as TokenLike | undefined;
			expect(table?.tokens?.map((section) => section.type)).toEqual(['thead', 'tbody']);
			expect(table?.tokens?.[0]?.tokens?.[0]?.tokens?.map((cell) => cell.text)).toEqual([
				'模块',
				'文件 / 服务',
				'状态'
			]);
			expect(table?.tokens?.[1]?.tokens).toHaveLength(3);
			const docsCell = table?.tokens?.[1]?.tokens?.[1]?.tokens?.[1];
			expect(docsCell?.text).toBe('[发布记录](https://example.com/release-notes)');
			expect(docsCell?.tokens?.find((token) => token.type === 'link')?.href).toBe(
				'https://example.com/release-notes'
			);
			const monitorCell = table?.tokens?.[1]?.tokens?.[2]?.tokens?.[1];
			expect(monitorCell?.text).toBe('<https://status.example.com/ops?id=42>');
			expect(monitorCell?.tokens?.find((token) => token.type === 'link')?.href).toBe(
				'https://status.example.com/ops?id=42'
			);

			const closingParagraph = tokens[tokens.length - 1];
			expect(closingParagraph?.type).toBe('paragraph');
			expect(closingParagraph?.text).toContain(
				'English term、全角标点、emoji 与 `code span` 都检查过。'
			);
			expect(
				closingParagraph?.tokens
					?.filter((token) => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['code span']);
		}
	);
});
