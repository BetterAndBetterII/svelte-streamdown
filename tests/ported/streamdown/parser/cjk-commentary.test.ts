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
	tokens?: InlineToken[];
}

interface CodespanToken extends InlineTokenBase {
	type: 'codespan';
	text: string;
}

interface InlineContainerToken extends InlineTokenBase {
	type: 'paragraph' | 'text';
}

type InlineToken = CodespanToken | InlineContainerToken | InlineTokenBase;

interface ListItemToken {
	text?: string;
	tokens?: Array<InlineToken | ListToken>;
}

interface ListToken {
	type: 'list';
	ordered?: boolean;
	tokens?: ListItemToken[];
}

describeInNode('ported streamdown CJK commentary fixture', () => {
	testInNode(
		'parses ordered lists, codespans, and CJK punctuation around strong text',
		async () => {
			const markdown = await loadFixtureText('cjk-commentary.md');
			const tokens = parseMarkdownTokens(markdown);

			const paragraphs = getTokensByType(tokens, 'paragraph');
			expect(paragraphs.length).toBeGreaterThanOrEqual(1);

			const introCode = getFirstTokenByType(
				(paragraphs[0]?.tokens ?? []) as InlineToken[],
				'codespan'
			);
			expect(introCode?.text).toBe('xxxxxxx.lua');

			const orderedList = getFirstTokenByType(tokens, 'list') as ListToken | undefined;
			expect(orderedList?.ordered).toBe(true);
			expect(orderedList?.tokens).toHaveLength(4);

			const firstItemText = orderedList?.tokens?.[0]?.tokens?.find(
				(token): token is InlineContainerToken =>
					token.type === 'text' || token.type === 'paragraph'
			);
			expect(firstItemText?.tokens?.map((token) => token.type)).toEqual(['strong', 'text']);
			expect(firstItemText?.tokens?.[0]?.text).toBe('文件头部注释');
			expect(firstItemText?.tokens?.[1]?.text).toContain('：说明文件功能、作者和日期');

			const thirdItemText = orderedList?.tokens?.[2]?.tokens?.find(
				(token): token is InlineContainerToken =>
					token.type === 'text' || token.type === 'paragraph'
			);
			expect(thirdItemText?.text).toContain('**函数注释**：为 `xxxx()` 和 `main()` 加了文档说明：');
			expect(
				(thirdItemText?.tokens ?? [])
					.filter((token): token is CodespanToken => token.type === 'codespan')
					.map((token) => token.text)
			).toEqual(['xxxx()', 'main()']);

			const thirdNestedList = orderedList?.tokens?.[2]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(thirdNestedList?.ordered).toBe(false);
			expect(thirdNestedList?.tokens?.map((item) => item.text)).toEqual([
				'函数描述',
				'执行流程',
				'参数说明',
				'关键代码行的解释'
			]);

			const fourthNestedList = orderedList?.tokens?.[3]?.tokens?.find(
				(token): token is ListToken => token.type === 'list'
			);
			expect(fourthNestedList?.ordered).toBe(false);
			expect(fourthNestedList?.tokens).toHaveLength(7);
			expect(fourthNestedList?.tokens?.[0]?.text).toContain('xxxxx.xxxx()');
			expect(JSON.stringify(tokens)).toContain('中英文混合方式');
		}
	);
});
