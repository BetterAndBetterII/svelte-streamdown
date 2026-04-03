import { describe, expect, test } from 'vitest';
import {
	PARSER_IR_IGNORED_FIELDS,
	PARSER_IR_NORMALIZATION_RULES,
	buildLocalParserIr,
	buildReferenceParserIr
} from './parser-ir.js';

const parityFixtures = [
	{
		name: 'headings and inline formatting',
		markdown:
			'# Heading with *emphasis* and [link](https://example.com)\n\nParagraph with `code` and ~~strike~~.'
	},
	{
		name: 'ordered task list',
		markdown: '1. first\n2. [x] done\n3. item with **bold**'
	},
	{
		name: 'gfm table',
		markdown: '| Left | Right |\n| :--- | ----: |\n| `x` | **y** |'
	},
	{
		name: 'incomplete emphasis repaired before projection',
		markdown: 'Text with **incomplete bold'
	}
] as const;

describe('parser IR contract', () => {
	test('documents normalization rules and ignored fields', () => {
		expect(PARSER_IR_NORMALIZATION_RULES.map((rule) => rule.id)).toEqual([
			'incomplete-markdown-prepass',
			'ignore-repaired-markdown-text',
			'block-segmentation-first'
		]);
		expect(PARSER_IR_IGNORED_FIELDS.map((entry) => entry.field)).toEqual([
			'raw',
			'position',
			'text',
			'tokens',
			'listType',
			'value',
			'skipped',
			'thead/tbody/tfoot',
			'rowspan/colspan/complex span metadata'
		]);
	});

	for (const fixture of parityFixtures) {
		test(`projects reference and local parser outputs into the same IR for ${fixture.name}`, async () => {
			expect(buildLocalParserIr(fixture.markdown)).toEqual(
				await buildReferenceParserIr(fixture.markdown)
			);
		});
	}

	test('marks incomplete markdown repair without comparing repaired source text', async () => {
		const local = buildLocalParserIr('This is **bold');
		const reference = await buildReferenceParserIr('This is **bold');

		expect(local.normalization.incompleteMarkdownRepaired).toBe(true);
		expect(reference.normalization.incompleteMarkdownRepaired).toBe(true);
		expect(local.blocks).toEqual(reference.blocks);
	});
});
