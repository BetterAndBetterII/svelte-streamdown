export const parityFixtureIds = [
	'01-headings-and-inline.md',
	'02-ordered-task-list.md',
	'03-gfm-table.md',
	'04-blockquote.md',
	'05-unordered-list.md',
	'06-code-fence.md',
	'07-heading-and-emphasis.md',
	'08-blockquote-plain.md',
	'09-paragraphs.md'
] as const;

export type ParityFixtureId = (typeof parityFixtureIds)[number];

export const defaultParityFixtureId: ParityFixtureId = parityFixtureIds[0];
