export const domParityFixtureIds = [
	'01-headings-and-inline.md',
	'02-ordered-task-list.md',
	'03-gfm-table.md',
	'04-blockquote.md',
	'05-unordered-list.md',
	'06-code-fence.md',
	'07-heading-and-emphasis.md',
	'08-blockquote-plain.md',
	'09-paragraphs.md',
	'15-composite-playground.md',
	'16-html-entities-and-cjk.md',
	'17-math-rendering.md'
] as const;

export const interactionParityFixtureIds = [
	'10-code-actions.md',
	'11-table-actions.md',
	'12-mermaid-actions.md',
	'13-blocked-link-and-image.md',
	'14-footnote-interaction.md'
] as const;

export const parityFixtureIds = [...domParityFixtureIds, ...interactionParityFixtureIds] as const;

export type ParityFixtureId = (typeof parityFixtureIds)[number];

export const parityFixturePaths: Record<ParityFixtureId, string> = {
	'01-headings-and-inline.md': 'markdown/01-headings-and-inline.md',
	'02-ordered-task-list.md': 'markdown/02-ordered-task-list.md',
	'03-gfm-table.md': 'markdown/03-gfm-table.md',
	'04-blockquote.md': 'markdown/04-blockquote.md',
	'05-unordered-list.md': 'markdown/05-unordered-list.md',
	'06-code-fence.md': 'markdown/06-code-fence.md',
	'07-heading-and-emphasis.md': 'markdown/07-heading-and-emphasis.md',
	'08-blockquote-plain.md': 'markdown/08-blockquote-plain.md',
	'09-paragraphs.md': 'markdown/09-paragraphs.md',
	'15-composite-playground.md': 'markdown/15-composite-playground.md',
	'16-html-entities-and-cjk.md': 'markdown/16-html-entities-and-cjk.md',
	'17-math-rendering.md': 'markdown/17-math-rendering.md',
	'10-code-actions.md': 'interactions/10-code-actions.md',
	'11-table-actions.md': 'interactions/11-table-actions.md',
	'12-mermaid-actions.md': 'interactions/12-mermaid-actions.md',
	'13-blocked-link-and-image.md': 'interactions/13-blocked-link-and-image.md',
	'14-footnote-interaction.md': 'interactions/14-footnote-interaction.md'
};

export const defaultParityFixtureId: ParityFixtureId = parityFixtureIds[0];
