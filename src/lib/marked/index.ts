import {
	Lexer,
	type MarkedToken,
	type RendererExtensionFunction,
	type Token,
	type TokenizerExtensionFunction,
	type TokenizerStartFunction,
	type TokenizerThis,
	type Tokens,
	type TokensList
} from 'marked';
import { markedAlert, type AlertToken } from './marked-alert.js';
import {
	markedFootnote,
	type Footnote,
	type FootnoteRef,
	type FootnoteToken
} from './marked-footnotes.js';
import { markedMath, type MathToken } from './marked-math.js';
import { markedSub, markedSup, type SubSupToken } from './marked-subsup.js';
import { markedList, type ListItemToken, type ListToken } from './marked-list.js';
import { markedBr, type BrToken } from './marked-br.js';
import { markedHr, type HrToken } from './marked-hr.js';
import {
	markedTable,
	type TableToken,
	type THead,
	type TBody,
	type TFoot,
	type THeadRow,
	type TRow,
	type TH,
	type TD
} from './marked-table.js';
import {
	markedDl,
	type DescriptionDetailToken,
	type DescriptionListToken,
	type DescriptionTermToken,
	type DescriptionToken
} from './marked-dl.js';
import { markedAlign, type AlignToken } from './marked-align.js';
import { markedCitations, type CitationToken } from './marked-citations.js';
import { markedMdx, type MdxToken } from './marked-mdx.js';
import { markedCjk } from './marked-cjk.js';

const VOID_HTML_TAGS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
]);

const getOpeningHtmlTagName = (raw: string): string | null => {
	const match = raw.match(/^\s*<([A-Za-z][\w:-]*)(?=[\s/>])/);
	if (!match) {
		return null;
	}

	const tagName = match[1].toLowerCase();
	if (VOID_HTML_TAGS.has(tagName) || /^\s*<\//.test(raw) || /\/>\s*$/.test(raw)) {
		return null;
	}

	return tagName;
};

const getHtmlTagDepthDelta = (raw: string, tagName: string): number => {
	const openPattern = new RegExp(`<${tagName}(?=[\\s>/])[^>]*>`, 'gi');
	const closePattern = new RegExp(`</${tagName}\\s*>`, 'gi');
	const selfClosingPattern = new RegExp(`<${tagName}(?=[\\s>/])[^>]*\\/\\s*>`, 'gi');
	const opens =
		(raw.match(openPattern) ?? []).length - (raw.match(selfClosingPattern) ?? []).length;
	const closes = (raw.match(closePattern) ?? []).length;
	return opens - closes;
};

export type GenericToken = {
	type: string;
	raw: string;
	tokens?: Token[];
} & Record<string, any>;

export type Extension = {
	name: string;
	level: 'block' | 'inline';
	tokenizer: (
		this: TokenizerThis,
		src: string,
		tokens: Token[] | TokensList
	) => GenericToken | undefined;
	start?: TokenizerStartFunction;
	applyInBlockParsing?: boolean;
};

export type StreamdownToken =
	| Exclude<MarkedToken, Tokens.List | Tokens.ListItem | Tokens.Table>
	| ListToken
	| ListItemToken
	| MathToken
	| AlertToken
	| FootnoteToken
	| SubSupToken
	| BrToken
	| HrToken
	| TableToken
	| THead
	| TBody
	| TFoot
	| THeadRow
	| TRow
	| TH
	| TD
	| DescriptionListToken
	| DescriptionToken
	| DescriptionDetailToken
	| DescriptionTermToken
	| AlignToken
	| CitationToken
	| MdxToken;

export type FootnoteState = {
	refs: Map<string, FootnoteRef>;
	footnotes: Map<string, Footnote>;
};

// Re-export table types from marked-table
export type { TableToken, THead, TBody, TFoot, THeadRow, TRow, TH, TD } from './marked-table.js';

const footnoteReferencePattern = /\[\^[\w-]{1,200}\](?!:)/;
const footnoteDefinitionPattern = /\[\^[\w-]{1,200}\]:/;
const closingTagPattern = /<\/(\w+)>/;
const openingTagPattern = /<(\w+)[\s>]/;

const voidElements = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
]);

const openTagPatternCache = new Map<string, RegExp>();
const closeTagPatternCache = new Map<string, RegExp>();

const getOpenTagPattern = (tagName: string): RegExp => {
	const normalizedTag = tagName.toLowerCase();
	const cached = openTagPatternCache.get(normalizedTag);
	if (cached) {
		return cached;
	}

	const pattern = new RegExp(`<${normalizedTag}(?=[\\s>/])[^>]*>`, 'gi');
	openTagPatternCache.set(normalizedTag, pattern);
	return pattern;
};

const getCloseTagPattern = (tagName: string): RegExp => {
	const normalizedTag = tagName.toLowerCase();
	const cached = closeTagPatternCache.get(normalizedTag);
	if (cached) {
		return cached;
	}

	const pattern = new RegExp(`</${normalizedTag}(?=[\\s>])[^>]*>`, 'gi');
	closeTagPatternCache.set(normalizedTag, pattern);
	return pattern;
};

const countNonSelfClosingOpenTags = (block: string, tagName: string): number => {
	if (voidElements.has(tagName.toLowerCase())) {
		return 0;
	}

	const matches = block.match(getOpenTagPattern(tagName));
	if (!matches) {
		return 0;
	}

	let count = 0;
	for (const match of matches) {
		if (!match.trimEnd().endsWith('/>')) {
			count += 1;
		}
	}

	return count;
};

const countClosingTags = (block: string, tagName: string): number => {
	const matches = block.match(getCloseTagPattern(tagName));
	return matches ? matches.length : 0;
};

const countDoubleDollars = (value: string): number => {
	let count = 0;
	for (let i = 0; i < value.length - 1; i += 1) {
		if (value[i] === '$' && value[i + 1] === '$') {
			count += 1;
			i += 1;
		}
	}

	return count;
};

const parseExtensions = (...extensions: Extension[]) => {
	const options: {
		gfm: boolean;
		extensions: {
			block: TokenizerExtensionFunction[];
			inline: TokenizerExtensionFunction[];
			childTokens: Record<string, string[]>;
			renderers: Record<string, RendererExtensionFunction>;
			startBlock: TokenizerStartFunction[];
			startInline: TokenizerStartFunction[];
		};
	} = {
		gfm: true,
		extensions: {
			block: [],
			inline: [],
			childTokens: {},
			renderers: {},
			startBlock: [],
			startInline: []
		}
	};

	extensions.forEach(({ level, name, tokenizer, ...rest }) => {
		if ('start' in rest && rest.start) {
			if (level === 'block') {
				options.extensions.startBlock!.push(rest.start as TokenizerStartFunction);
			} else {
				options.extensions.startInline!.push(rest.start as TokenizerStartFunction);
			}
		}
		if (tokenizer) {
			if (level === 'block') {
				options.extensions.block.push(tokenizer);
			} else {
				options.extensions.inline.push(tokenizer);
			}
		}
	});

	return options;
};

const cloneFootnoteState = (state?: FootnoteState): FootnoteState => ({
	refs: new Map(state?.refs ?? []),
	footnotes: new Map(state?.footnotes ?? [])
});

type LexerWithFootnotes = Lexer & {
	footnotes?: FootnoteState;
};

export const lexWithFootnotes = (
	markdown: string,
	extensions: Extension[] = []
): {
	tokens: StreamdownToken[];
	footnotes: FootnoteState;
} => {
	const lexer = new Lexer(
		parseExtensions(
			markedHr,
			markedTable,
			...markedFootnote({ preferContext: false }),
			markedAlert,
			...markedMath,
			...markedCjk,
			markedSub,
			markedSup,
			markedList,
			markedBr,
			markedDl,
			markedAlign,
			markedCitations,
			markedMdx,
			...extensions
		)
	) as LexerWithFootnotes;

	return {
		tokens: lexer
			.lex(markdown)
			.filter((token) => token.type !== 'space' && token.type !== 'footnote') as StreamdownToken[],
		footnotes: cloneFootnoteState(lexer.footnotes)
	};
};

export const lex = (markdown: string, extensions: Extension[] = []): StreamdownToken[] => {
	return lexWithFootnotes(markdown, extensions).tokens;
};

export const parseBlocksWithFootnotes = (
	markdown: string,
	extensions: Extension[] = []
): {
	blocks: string[];
	footnotes: FootnoteState;
} => {
	if (footnoteReferencePattern.test(markdown) || footnoteDefinitionPattern.test(markdown)) {
		return {
			blocks: [markdown],
			footnotes: lexWithFootnotes(markdown, extensions).footnotes
		};
	}
	const blockLexer = new Lexer(
		parseExtensions(
			markedHr,
			...markedFootnote({ preferContext: false }),
			markedDl,
			markedTable,
			markedAlign,
			markedMdx,
			...extensions.filter(
				({ level, applyInBlockParsing }) => level === 'block' && applyInBlockParsing
			)
		)
	) as LexerWithFootnotes;

	const rawBlocks = blockLexer
		.blockTokens(markdown, [])
		.filter((block) => block.type !== 'space' && block.type !== 'footnote');

	const mergedBlocks: string[] = [];
	let previousTokenWasCode = false;

	for (let index = 0; index < rawBlocks.length; index += 1) {
		const block = rawBlocks[index];
		let currentBlock = block.raw;

		if (block.type === 'html') {
			const tagName = getOpeningHtmlTagName(block.raw);
			if (tagName) {
				let depth = getHtmlTagDepthDelta(block.raw, tagName);

				while (depth > 0 && index + 1 < rawBlocks.length) {
					index += 1;
					const nextBlock = rawBlocks[index];
					currentBlock += nextBlock.raw;
					depth += getHtmlTagDepthDelta(nextBlock.raw, tagName);
				}
			}
		}

		if (mergedBlocks.length > 0 && !previousTokenWasCode) {
			const previousBlock = mergedBlocks[mergedBlocks.length - 1];
			if (countDoubleDollars(previousBlock) % 2 === 1) {
				mergedBlocks[mergedBlocks.length - 1] = previousBlock + currentBlock;
				previousTokenWasCode = block.type === 'code';
				continue;
			}
		}

		mergedBlocks.push(currentBlock);
		previousTokenWasCode = block.type === 'code';
	}

	return {
		blocks: mergedBlocks,
		footnotes: cloneFootnoteState(blockLexer.footnotes)
	};
};

export const parseBlocks = (markdown: string, extensions: Extension[] = []): string[] => {
	return parseBlocksWithFootnotes(markdown, extensions).blocks;
};

export type {
	MathToken,
	AlertToken,
	FootnoteToken,
	SubSupToken,
	BrToken,
	HrToken,
	AlignToken,
	CitationToken,
	MdxToken
};
