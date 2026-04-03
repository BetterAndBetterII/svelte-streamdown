import { describe, expect, test } from 'vitest';
import { buildLocalParserIr, buildReferenceParserIr } from './parser-ir.js';

const parityFixtureModules = import.meta.glob('../../fixtures/parity/markdown/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const parityFixtures = Object.entries(parityFixtureModules)
	.map(([fullPath, markdown]) => ({
		path: fullPath.replace('../../fixtures/parity/markdown/', ''),
		markdown
	}))
	.sort((left, right) => left.path.localeCompare(right.path));

describe('parser parity fixtures', () => {
	test('loads shared markdown fixtures from the parity fixture directory', () => {
		expect(parityFixtures.map((fixture) => fixture.path)).toEqual([
			'01-headings-and-inline.md',
			'02-ordered-task-list.md',
			'03-gfm-table.md',
			'04-blockquote.md',
			'05-unordered-list.md',
			'06-code-fence.md',
			'07-heading-and-emphasis.md',
			'08-blockquote-plain.md',
			'09-paragraphs.md'
		]);
	});

	for (const fixture of parityFixtures) {
		test(`matches normalized parser IR for fixture ${fixture.path}`, async () => {
			expect(buildLocalParserIr(fixture.markdown)).toEqual(
				await buildReferenceParserIr(fixture.markdown)
			);
		});
	}
});
