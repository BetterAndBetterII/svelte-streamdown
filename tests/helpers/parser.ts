import {
	IncompleteMarkdownParser,
	lex,
	parseBlocks,
	parseIncompleteMarkdown,
	type Extension,
	type Plugin,
	type StreamdownToken
} from '../../src/lib/index.js';
import type { Token } from 'marked';

type TokenLike = { type: string };
type NarrowedToken<TToken extends TokenLike, TType extends TToken['type']> = Extract<
	TToken,
	{ type: TType }
>;

export function parseMarkdownTokens(
	markdown: string,
	options: { extensions?: Extension[] } = {}
): StreamdownToken[] {
	return lex(markdown, options.extensions ?? []);
}

export function parseMarkdownBlocks(
	markdown: string,
	options: { extensions?: Extension[] } = {}
): string[] {
	return parseBlocks(markdown, options.extensions ?? []);
}

export function parseIncompleteMarkdownText(markdown: string, plugins?: Plugin[]): string {
	if (!plugins) {
		return parseIncompleteMarkdown(markdown);
	}

	return new IncompleteMarkdownParser(plugins).parse(markdown);
}

export function getTokensByType<TToken extends TokenLike, TType extends TToken['type']>(
	tokens: TToken[],
	type: TType
): NarrowedToken<TToken, TType>[] {
	return tokens.filter((token) => token.type === type) as NarrowedToken<TToken, TType>[];
}

export function getFirstTokenByType<TToken extends TokenLike, TType extends TToken['type']>(
	tokens: TToken[],
	type: TType
): NarrowedToken<TToken, TType> | undefined {
	return tokens.find((token) => token.type === type) as NarrowedToken<TToken, TType> | undefined;
}

export function getInlineTokens(markdown: string): Token[] {
	const firstTokenWithChildren = parseMarkdownTokens(markdown).find(
		(token): token is StreamdownToken & { tokens: Token[] } =>
			'tokens' in token && Array.isArray(token.tokens)
	);

	return firstTokenWithChildren?.tokens ?? [];
}
