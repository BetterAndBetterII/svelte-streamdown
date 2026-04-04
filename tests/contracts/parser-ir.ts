import type {
	Break,
	Blockquote,
	Code,
	Content,
	Delete,
	Definition,
	Emphasis,
	FootnoteDefinition,
	FootnoteReference,
	Heading,
	Html,
	Image,
	InlineCode,
	Link,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	Root,
	Strong,
	Table,
	TableCell,
	TableRow,
	Text,
	ThematicBreak
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { lex, parseBlocks, parseIncompleteMarkdown, type StreamdownToken } from '../../src/lib/index.js';

export const PARSER_IR_SCHEMA_VERSION = 1 as const;

export type ParserIrValue =
	| null
	| boolean
	| number
	| string
	| ParserIrValue[]
	| { [key: string]: ParserIrValue };

export type ParserIrIgnoredField = {
	field: string;
	rationale: string;
};

export const PARSER_IR_IGNORED_FIELDS: readonly ParserIrIgnoredField[] = [
	{
		field: 'raw',
		rationale: 'Raw source slices are implementation-specific and do not change parser semantics.'
	},
	{
		field: 'position',
		rationale: 'Source offsets are unstable across parser implementations and are not part of parity.'
	},
	{
		field: 'text',
		rationale: 'Duplicate text caches are ignored when the normalized child structure already preserves content.'
	},
	{
		field: 'tokens',
		rationale: 'Implementation-owned token caches are replaced by explicit normalized block and inline trees.'
	},
	{
		field: 'listType',
		rationale: 'Ordered list marker style is not preserved by the reference mdast parser.'
	},
	{
		field: 'value',
		rationale: 'Per-item source numbering is normalized to list start plus item order.'
	},
	{
		field: 'skipped',
		rationale: 'Skipped numbering is a local lexer detail and is not emitted by the reference parser.'
	},
	{
		field: 'thead/tbody/tfoot',
		rationale: 'Table section wrappers are flattened to header row count plus ordered rows.'
	},
	{
		field: 'rowspan/colspan/complex span metadata',
		rationale: 'Span bookkeeping is local-table specific and outside the shared reference feature set.'
	}
] as const;

export type ParserIrNormalizationRule = {
	id: string;
	description: string;
};

export const PARSER_IR_NORMALIZATION_RULES: readonly ParserIrNormalizationRule[] = [
	{
		id: 'incomplete-markdown-prepass',
		description:
			'Apply the source parser incomplete-markdown repair before block splitting and AST projection.'
	},
	{
		id: 'ignore-repaired-markdown-text',
		description:
			'Record only whether repair changed the source; do not compare the repaired markdown string itself.'
	},
	{
		id: 'block-segmentation-first',
		description:
			'Top-level IR blocks correspond to block-splitter output, and each block contains normalized top-level nodes parsed from that segment.'
	}
] as const;

export type ParserIrDocument = {
	schemaVersion: typeof PARSER_IR_SCHEMA_VERSION;
	normalization: {
		incompleteMarkdownRepaired: boolean;
	};
	blocks: ParserIrBlock[];
};

export type ParserIrBlock = {
	nodes: ParserIrBlockNode[];
};

export type ParserIrBlockNode =
	| {
			kind: 'paragraph';
			inline: ParserIrInline[];
	  }
	| {
			kind: 'heading';
			depth: number;
			inline: ParserIrInline[];
	  }
	| {
			kind: 'blockquote';
			blocks: ParserIrBlockNode[];
	  }
	| {
			kind: 'list';
			ordered: boolean;
			start: number | null;
			spread: boolean;
			items: ParserIrListItem[];
	  }
	| {
			kind: 'code';
			lang: string | null;
			meta: string | null;
			text: string;
	  }
	| {
			kind: 'math';
			display: boolean;
			text: string;
	  }
	| {
			kind: 'html';
			value: string;
	  }
	| {
			kind: 'thematicBreak';
	  }
	| {
			kind: 'table';
			align: ParserIrTableAlignment[];
			headerRowCount: number;
			rows: ParserIrTableRow[];
	  }
	| {
			kind: 'definition';
			identifier: string;
			label: string | null;
			url: string;
			title: string | null;
	  }
	| {
			kind: 'footnoteDefinition';
			identifier: string;
			blocks: ParserIrBlockNode[];
	  }
	| {
			kind: 'custom';
			type: string;
			data: ParserIrValue;
	  };

export type ParserIrListItem = {
	spread: boolean;
	checked: boolean | null;
	blocks: ParserIrBlockNode[];
};

export type ParserIrTableAlignment = 'left' | 'center' | 'right' | null;

export type ParserIrTableRow = {
	cells: ParserIrTableCell[];
};

export type ParserIrTableCell = {
	inline: ParserIrInline[];
};

export type ParserIrInline =
	| {
			kind: 'text';
			text: string;
	  }
	| {
			kind: 'emphasis';
			children: ParserIrInline[];
	  }
	| {
			kind: 'strong';
			children: ParserIrInline[];
	  }
	| {
			kind: 'delete';
			children: ParserIrInline[];
	  }
	| {
			kind: 'link';
			url: string;
			title: string | null;
			children: ParserIrInline[];
	  }
	| {
			kind: 'image';
			url: string;
			title: string | null;
			alt: string;
	  }
	| {
			kind: 'inlineCode';
			text: string;
	  }
	| {
			kind: 'math';
			display: boolean;
			text: string;
	  }
	| {
			kind: 'break';
	  }
	| {
			kind: 'html';
			value: string;
	  }
	| {
			kind: 'subscript';
			children: ParserIrInline[];
	  }
	| {
			kind: 'superscript';
			children: ParserIrInline[];
	  }
	| {
			kind: 'citation';
			keys: string[];
	  }
	| {
			kind: 'footnoteReference';
			identifier: string;
			label: string | null;
	  }
	| {
			kind: 'custom';
			type: string;
			data: ParserIrValue;
	  };

const referenceProcessor = unified().use(remarkParse).use(remarkGfm);

type ReferenceParsers = {
	parseReferenceBlocks: (markdown: string) => string[];
	referenceRemend: (markdown: string) => string;
};

let referenceParsersPromise: Promise<ReferenceParsers> | undefined;

export async function buildReferenceParserIr(markdown: string): Promise<ParserIrDocument> {
	const { parseReferenceBlocks, referenceRemend } = await loadReferenceParsers();
	const repairedMarkdown = referenceRemend(markdown);

	return {
		schemaVersion: PARSER_IR_SCHEMA_VERSION,
		normalization: {
			incompleteMarkdownRepaired: repairedMarkdown !== markdown
		},
		blocks: parseReferenceBlocks(repairedMarkdown)
			.map((blockMarkdown: string) => ({
				nodes: normalizeReferenceRoot(parseReferenceRoot(blockMarkdown))
			}))
			.filter((block) => block.nodes.length > 0)
	};
}

export function buildLocalParserIr(markdown: string): ParserIrDocument {
	const repairedMarkdown = parseIncompleteMarkdown(markdown);

	return {
		schemaVersion: PARSER_IR_SCHEMA_VERSION,
		normalization: {
			incompleteMarkdownRepaired: repairedMarkdown !== markdown
		},
		blocks: parseBlocks(repairedMarkdown)
			.map((blockMarkdown) => ({
				nodes: normalizeLocalBlockTokens(lex(blockMarkdown))
			}))
			.filter((block) => block.nodes.length > 0)
	};
}

function parseReferenceRoot(markdown: string): Root {
	return referenceProcessor.parse(markdown) as Root;
}

async function loadReferenceParsers(): Promise<ReferenceParsers> {
	if (!referenceParsersPromise) {
		referenceParsersPromise = Promise.all([
			import(
				new URL('../../references/streamdown/packages/remend/src/index.ts', import.meta.url).href
			),
			import(
				new URL(
					'../../references/streamdown/packages/streamdown/lib/parse-blocks.tsx',
					import.meta.url
				).href
			)
		]).then(([remendModule, parseBlocksModule]) => ({
			referenceRemend: remendModule.default as (markdown: string) => string,
			parseReferenceBlocks: parseBlocksModule.parseMarkdownIntoBlocks as (markdown: string) => string[]
		}));
	}

	return referenceParsersPromise;
}

function normalizeReferenceRoot(root: Root): ParserIrBlockNode[] {
	return root.children.map(normalizeReferenceBlockNode);
}

function normalizeReferenceBlockNode(node: Content): ParserIrBlockNode {
	switch (node.type) {
		case 'paragraph':
			return {
				kind: 'paragraph',
				inline: normalizeReferenceInlineTokens(node.children)
			};
		case 'heading':
			return {
				kind: 'heading',
				depth: node.depth,
				inline: normalizeReferenceInlineTokens(node.children)
			};
		case 'blockquote':
			return {
				kind: 'blockquote',
				blocks: node.children.map(normalizeReferenceBlockNode)
			};
		case 'list':
			return {
				kind: 'list',
				ordered: Boolean(node.ordered),
				start: node.ordered ? (node.start ?? 1) : null,
				spread: node.spread ?? false,
				items: node.children.map(normalizeReferenceListItem)
			};
		case 'code':
			return {
				kind: 'code',
				lang: node.lang ?? null,
				meta: node.meta ?? null,
				text: node.value
			};
		case 'html':
			return {
				kind: 'html',
				value: node.value
			};
		case 'thematicBreak':
			return { kind: 'thematicBreak' };
		case 'table':
			return {
				kind: 'table',
				align: (node.align ?? []).map((value) => value ?? null),
				headerRowCount: node.children.length > 0 ? 1 : 0,
				rows: node.children.map(normalizeReferenceTableRow)
			};
		case 'definition':
			return {
				kind: 'definition',
				identifier: normalizeIdentifier(node.identifier),
				label: node.label ?? null,
				url: node.url,
				title: node.title ?? null
			};
		case 'footnoteDefinition':
			return {
				kind: 'footnoteDefinition',
				identifier: normalizeIdentifier(node.identifier),
				blocks: node.children.map(normalizeReferenceBlockNode)
			};
		default:
			return {
				kind: 'custom',
				type: node.type,
				data: null
			};
	}
}

function normalizeReferenceListItem(item: ListItem): ParserIrListItem {
	return {
		spread: item.spread ?? false,
		checked: item.checked ?? null,
		blocks: item.children.map(normalizeReferenceBlockNode)
	};
}

function normalizeReferenceTableRow(row: TableRow): ParserIrTableRow {
	return {
		cells: row.children.map(normalizeReferenceTableCell)
	};
}

function normalizeReferenceTableCell(cell: TableCell): ParserIrTableCell {
	return {
		inline: normalizeReferenceInlineTokens(cell.children as PhrasingContent[])
	};
}

function normalizeReferenceInlineTokens(tokens: readonly PhrasingContent[]): ParserIrInline[] {
	return tokens.map(normalizeReferenceInlineToken);
}

function normalizeReferenceInlineToken(token: PhrasingContent): ParserIrInline {
	switch (token.type) {
		case 'text':
			return {
				kind: 'text',
				text: token.value
			};
		case 'emphasis':
			return {
				kind: 'emphasis',
				children: normalizeReferenceInlineTokens(token.children)
			};
		case 'strong':
			return {
				kind: 'strong',
				children: normalizeReferenceInlineTokens(token.children)
			};
		case 'delete':
			return {
				kind: 'delete',
				children: normalizeReferenceInlineTokens(token.children)
			};
		case 'link':
			return {
				kind: 'link',
				url: token.url,
				title: token.title ?? null,
				children: normalizeReferenceInlineTokens(token.children)
			};
		case 'image':
			return {
				kind: 'image',
				url: token.url,
				title: token.title ?? null,
				alt: token.alt ?? ''
			};
		case 'inlineCode':
			return {
				kind: 'inlineCode',
				text: token.value
			};
		case 'break':
			return { kind: 'break' };
		case 'html':
			return {
				kind: 'html',
				value: token.value
			};
		case 'footnoteReference':
			return {
				kind: 'footnoteReference',
				identifier: normalizeIdentifier(token.identifier),
				label: token.label ?? null
			};
		default:
			return {
				kind: 'custom',
				type: token.type,
				data: null
			};
	}
}

function normalizeLocalBlockTokens(tokens: readonly StreamdownToken[]): ParserIrBlockNode[] {
	return tokens.map(normalizeLocalBlockToken);
}

function normalizeLocalBlockToken(token: StreamdownToken): ParserIrBlockNode {
	switch (token.type) {
		case 'paragraph':
			return {
				kind: 'paragraph',
				inline: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'text':
			return {
				kind: 'paragraph',
				inline: normalizeLocalInlineTokens(token.tokens ?? [token])
			};
		case 'heading':
			return {
				kind: 'heading',
				depth: token.depth,
				inline: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'blockquote':
			return {
				kind: 'blockquote',
				blocks: normalizeLocalBlockTokens((token.tokens ?? []) as StreamdownToken[])
			};
		case 'list':
			return {
				kind: 'list',
				ordered: token.ordered,
				start: token.ordered ? (token.start ?? 1) : null,
				spread: token.loose,
				items: token.tokens.map((item) => ({
					spread: item.loose,
					checked: item.task ? item.checked : null,
					blocks: normalizeLocalBlockTokens(item.tokens as StreamdownToken[])
				}))
			};
		case 'code':
			const codeToken = token as {
				lang?: string | null;
				meta?: string | null;
				text: string;
			};

			return {
				kind: 'code',
				lang: codeToken.lang ?? null,
				meta: codeToken.meta ?? null,
				text: codeToken.text
			};
		case 'math':
			return {
				kind: 'math',
				display: token.displayMode,
				text: token.text
			};
		case 'html':
			return {
				kind: 'html',
				value: token.raw
			};
		case 'hr':
			return { kind: 'thematicBreak' };
		case 'table':
			return normalizeLocalTable(token);
		case 'alert':
			return {
				kind: 'custom',
				type: 'alert',
				data: {
					variant: token.variant,
					blocks: normalizeLocalBlockTokens(
						((token as { tokens?: StreamdownToken[] }).tokens ?? []) as StreamdownToken[]
					)
				}
			};
		case 'align':
			return {
				kind: 'custom',
				type: 'align',
				data: {
					align: token.align,
					blocks: normalizeLocalBlockTokens(token.tokens as StreamdownToken[])
				}
			};
		case 'descriptionList':
			return {
				kind: 'custom',
				type: 'descriptionList',
				data: token.tokens.map((entry) => ({
					term: normalizeLocalInlineTokens(entry.tokens[0]?.tokens ?? []),
					detail: normalizeLocalInlineTokens(entry.tokens[1]?.tokens ?? [])
				}))
			};
		case 'mdx':
			return {
				kind: 'custom',
				type: 'mdx',
				data: {
					tagName: token.tagName,
					attributes: token.attributes,
					selfClosing: token.selfClosing,
					blocks: normalizeLocalBlockTokens((token.tokens ?? []) as StreamdownToken[])
				}
			};
		default:
			return {
				kind: 'custom',
				type: token.type,
				data: null
			};
	}
}

function normalizeLocalTable(token: Extract<StreamdownToken, { type: 'table' }>): ParserIrBlockNode {
	const rows: ParserIrTableRow[] = [];
	let headerRowCount = 0;

	for (const section of token.tokens) {
		if (section.type === 'thead') {
			headerRowCount += section.tokens.length;
		}

		for (const row of section.tokens) {
			rows.push({
				cells: row.tokens.map((cell) => ({
					inline: normalizeLocalInlineTokens((cell.tokens ?? []) as StreamdownToken[])
				}))
			});
		}
	}

	return {
		kind: 'table',
		align: token.align.map((value) => normalizeTableAlignment(value)),
		headerRowCount,
		rows
	};
}

function normalizeLocalInlineTokens(tokens: readonly unknown[]): ParserIrInline[] {
	return tokens.map((token) => normalizeLocalInlineToken(token as LocalInlineToken));
}

type LocalInlineToken =
	| {
			type: string;
			raw?: string;
			text?: string;
			href?: string;
			title?: string | null;
			tokens?: unknown[];
			keys?: string[];
			label?: string;
			displayMode?: boolean;
	  }
	| StreamdownToken;

function normalizeLocalInlineToken(token: LocalInlineToken): ParserIrInline {
	switch (token.type) {
		case 'text':
		case 'escape':
			return {
				kind: 'text',
				text: token.raw ?? token.text ?? ''
			};
		case 'strong':
			return {
				kind: 'strong',
				children: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'em':
			return {
				kind: 'emphasis',
				children: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'del':
			return {
				kind: 'delete',
				children: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'codespan':
			return {
				kind: 'inlineCode',
				text: token.text ?? ''
			};
		case 'link':
			return {
				kind: 'link',
				url: token.href ?? '',
				title: token.title ?? null,
				children: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'image':
			return {
				kind: 'image',
				url: token.href ?? '',
				title: token.title ?? null,
				alt: token.text ?? ''
			};
		case 'math':
			return {
				kind: 'math',
				display: token.displayMode ?? false,
				text: token.text ?? ''
			};
		case 'br':
			return { kind: 'break' };
		case 'html':
		case 'tag':
			return {
				kind: 'html',
				value: token.raw ?? token.text ?? ''
			};
		case 'sub':
			return {
				kind: 'subscript',
				children: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'sup':
			return {
				kind: 'superscript',
				children: normalizeLocalInlineTokens(token.tokens ?? [])
			};
		case 'inline-citations':
			return {
				kind: 'citation',
				keys: [...(token.keys ?? [])]
			};
		case 'footnoteRef':
			return {
				kind: 'footnoteReference',
				identifier: normalizeIdentifier(token.label ?? ''),
				label: token.label ?? null
			};
		default:
			return {
				kind: 'custom',
				type: token.type,
				data: null
			};
	}
}

function normalizeIdentifier(identifier: string): string {
	return identifier.trim().toLowerCase();
}

function normalizeTableAlignment(value: string | null | undefined): ParserIrTableAlignment {
	if (value === 'left' || value === 'center' || value === 'right') {
		return value;
	}

	return null;
}
