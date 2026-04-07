import type { MarkdownBlockCacheScope, MarkdownBlockParseResult } from '../markdown-parse-cache.js';
import type { Footnote, FootnoteRef } from '../marked/marked-footnotes.js';
import type { Extension, FootnoteState, StreamdownToken } from '../marked/index.js';
import { filterMarkdownTokens } from '../markdown.js';
import { carets, hasIncompleteCodeFence, hasTable } from '../streaming.js';
import { detectTextDirection } from '../utils/detectDirection.js';
import { normalizeHtmlIndentation } from '../security/html.js';
import { preprocessCustomTags } from '../security/preprocess-custom-tags.js';
import { preprocessLiteralTagContent } from '../security/preprocess-literal-tag-content.js';
import { footnoteDefinitionPattern, resolveRootClassName } from './config.js';

export type ParsedBlock = {
	raw: string;
	tokens: StreamdownToken[];
	footnotes: FootnoteState;
	isIncomplete: boolean;
};

export const preprocessStreamdownContent = ({
	content,
	shouldNormalizeHtmlIndentation,
	literalTagContent,
	allowedTagNames
}: {
	content: string;
	shouldNormalizeHtmlIndentation: boolean;
	literalTagContent?: string[];
	allowedTagNames: string[];
}) => {
	let result = shouldNormalizeHtmlIndentation ? normalizeHtmlIndentation(content) : content;

	if (literalTagContent && literalTagContent.length > 0) {
		result = preprocessLiteralTagContent(result, literalTagContent);
	}

	if (allowedTagNames.length > 0) {
		result = preprocessCustomTags(result, allowedTagNames);
	}

	return result;
};

export const preserveStreamingFootnoteLiterals = ({
	tokens,
	mode,
	isAnimating
}: {
	tokens: StreamdownToken[];
	mode: 'static' | 'streaming';
	isAnimating: boolean;
}): StreamdownToken[] =>
	tokens.map((token) => {
		if (
			mode === 'streaming' &&
			isAnimating &&
			token.type === 'footnoteRef' &&
			token.content.lines.join('\n').trim().length === 0
		) {
			return {
				type: 'text',
				raw: token.raw,
				text: token.raw
			} as StreamdownToken;
		}

		if ('tokens' in token && Array.isArray(token.tokens)) {
			return {
				...token,
				tokens: preserveStreamingFootnoteLiterals({
					tokens: token.tokens as StreamdownToken[],
					mode,
					isAnimating
				})
			} as StreamdownToken;
		}

		return token;
	});

export const shouldResolveFootnotes = ({
	markdown,
	mode,
	parseIncompleteMarkdown
}: {
	markdown: string;
	mode: 'static' | 'streaming';
	parseIncompleteMarkdown: boolean;
}) =>
	!(mode === 'streaming' && parseIncompleteMarkdown && !footnoteDefinitionPattern.test(markdown));

export const parseMarkdownWithOptionalFootnotes = ({
	markdown,
	cache,
	extensions,
	mode,
	parseIncompleteMarkdown,
	cacheScope = 'stable'
}: {
	markdown: string;
	cache: {
		parseBlock: (request: {
			markdown: string;
			extensions?: Extension[];
			resolveFootnotes: boolean;
			cacheScope?: MarkdownBlockCacheScope;
		}) => MarkdownBlockParseResult;
	};
	extensions: Extension[] | undefined;
	mode: 'static' | 'streaming';
	parseIncompleteMarkdown: boolean;
	cacheScope?: MarkdownBlockCacheScope;
}) =>
	cache.parseBlock({
		markdown,
		extensions,
		resolveFootnotes: shouldResolveFootnotes({
			markdown,
			mode,
			parseIncompleteMarkdown
		}),
		cacheScope
	});

export const buildParsedBlocks = ({
	resolvedStatic,
	normalizedContent,
	parsedMarkdownDocument,
	rawBlocks,
	blockIsIncomplete,
	mode,
	isAnimating,
	parseMarkdownWithFootnotes
}: {
	resolvedStatic: boolean;
	normalizedContent: string;
	parsedMarkdownDocument: {
		staticBlock: MarkdownBlockParseResult | null;
	};
	rawBlocks: string[];
	blockIsIncomplete: boolean[];
	mode: 'static' | 'streaming';
	isAnimating: boolean;
	parseMarkdownWithFootnotes: (
		markdown: string,
		cacheScope?: MarkdownBlockCacheScope
	) => MarkdownBlockParseResult;
}) => {
	if (resolvedStatic && parsedMarkdownDocument.staticBlock) {
		return [
			{
				raw: normalizedContent,
				tokens: preserveStreamingFootnoteLiterals({
					tokens: parsedMarkdownDocument.staticBlock.tokens,
					mode,
					isAnimating
				}),
				footnotes: parsedMarkdownDocument.staticBlock.footnotes,
				isIncomplete: blockIsIncomplete[0] ?? false
			}
		] satisfies ParsedBlock[];
	}

	return rawBlocks.map((raw, index) => {
		const isIncomplete = blockIsIncomplete[index] ?? false;
		const parsed = parseMarkdownWithFootnotes(raw, isIncomplete ? 'transient' : 'stable');

		return {
			raw,
			tokens: preserveStreamingFootnoteLiterals({
				tokens: parsed.tokens,
				mode,
				isAnimating
			}),
			footnotes: parsed.footnotes,
			isIncomplete
		};
	}) satisfies ParsedBlock[];
};

export const mergeFootnoteState = ({
	documentFootnotes,
	parsedBlocks
}: {
	documentFootnotes: FootnoteState;
	parsedBlocks: ParsedBlock[];
}) => {
	const refs = new Map<string, FootnoteRef>(documentFootnotes.refs);
	const footnotes = new Map<string, Footnote>(documentFootnotes.footnotes);

	for (const parsedBlock of parsedBlocks) {
		for (const [label, ref] of parsedBlock.footnotes.refs) {
			refs.set(label, ref);
		}

		for (const [label, entry] of parsedBlock.footnotes.footnotes) {
			footnotes.set(label, entry);
		}
	}

	return {
		refs,
		footnotes
	} satisfies FootnoteState;
};

export const buildFootnoteEntries = ({
	footnoteState,
	parseMarkdownWithFootnotes,
	filtering
}: {
	footnoteState: FootnoteState;
	parseMarkdownWithFootnotes: (markdown: string) => MarkdownBlockParseResult;
	filtering: {
		allowedElements?: readonly string[];
		allowElement?: unknown;
		disallowedElements?: readonly string[];
		skipHtml?: boolean;
		unwrapDisallowed?: boolean;
	};
}) =>
	Array.from(footnoteState.footnotes.values()).map((entry) => {
		const content = entry.lines.join('\n').trim();
		return {
			...entry,
			lines: [...entry.lines],
			tokens:
				content.length === 0
					? []
					: filterMarkdownTokens(parseMarkdownWithFootnotes(content).tokens, {
							allowedElements: filtering.allowedElements,
							allowElement: filtering.allowElement as never,
							disallowedElements: filtering.disallowedElements,
							skipHtml: filtering.skipHtml,
							unwrapDisallowed: filtering.unwrapDisallowed
						})
		};
	}) satisfies Footnote[];

export const resolveCaretPresentation = ({
	caret,
	className,
	futureClassName,
	prefix,
	rawBlocks,
	shouldShowCaret
}: {
	caret: keyof typeof carets | undefined;
	className: string | undefined;
	futureClassName: string | undefined;
	prefix: string | undefined;
	rawBlocks: string[];
	shouldShowCaret: boolean;
}) => {
	const shouldHideCaret =
		!shouldShowCaret || rawBlocks.length === 0
			? false
			: (() => {
					const lastBlock = rawBlocks.at(-1) as string;
					return hasIncompleteCodeFence(lastBlock) || hasTable(lastBlock);
				})();

	return {
		shouldHideCaret,
		rootStyle:
			shouldShowCaret && !shouldHideCaret && caret
				? `--streamdown-caret: "${carets[caret]}";`
				: undefined,
		rootClassName: resolveRootClassName({
			className,
			futureClassName,
			prefix,
			shouldShowCaret,
			shouldHideCaret
		})
	};
};

export const resolveBlockDirection = ({
	block,
	dir
}: {
	block: string;
	dir: 'auto' | 'ltr' | 'rtl' | undefined;
}) => {
	if (!dir) {
		return undefined;
	}

	if (dir === 'auto') {
		return detectTextDirection(block);
	}

	return dir;
};
