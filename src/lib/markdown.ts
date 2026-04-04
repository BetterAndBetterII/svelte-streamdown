import type { StreamdownToken } from './marked/index.js';
import type { Tokens } from 'marked';

export type MarkdownElement = {
	tagName: string;
	properties: Record<string, unknown>;
};

export type MarkdownParent = MarkdownElement & {
	children?: readonly MarkdownElement[];
};

export type AllowElement = (
	element: Readonly<MarkdownElement>,
	index: number,
	parent: Readonly<MarkdownParent> | undefined
) => boolean | null | undefined;

export type UrlTransform = (
	url: string,
	key: string,
	node: Readonly<MarkdownElement>
) => string | null | undefined;

export const defaultUrlTransform: UrlTransform = (value) => value;

export type MarkdownFilteringOptions = {
	allowElement?: AllowElement;
	allowedElements?: readonly string[];
	disallowedElements?: readonly string[];
	skipHtml?: boolean;
	unwrapDisallowed?: boolean;
};

type ParsedMarkdownFilteringOptions = {
	allowElement?: AllowElement;
	allowedElements?: ReadonlySet<string>;
	disallowedElements?: ReadonlySet<string>;
	skipHtml: boolean;
	unwrapDisallowed: boolean;
};

const normalizeElementSet = (elements?: readonly string[]): ReadonlySet<string> | undefined => {
	if (!elements || elements.length === 0) {
		return undefined;
	}

	return new Set(
		elements
			.filter((element): element is string => typeof element === 'string' && element.length > 0)
			.map((element) => element.toLowerCase())
	);
};

export const createMarkdownElement = (
	tagName: string,
	properties: Record<string, unknown> = {},
	children?: readonly MarkdownElement[]
): MarkdownParent => ({
	tagName: tagName.toLowerCase(),
	properties,
	...(children && children.length > 0 ? { children } : {})
});

export const applyMarkdownUrlTransform = (
	url: string,
	key: string,
	node: Readonly<MarkdownElement>,
	urlTransform?: UrlTransform
): string | null | undefined => {
	const transform = urlTransform ?? defaultUrlTransform;
	return transform(url, key, node);
};

const parseMarkdownFilteringOptions = (
	options: MarkdownFilteringOptions
): ParsedMarkdownFilteringOptions => ({
	allowElement: options.allowElement,
	allowedElements: normalizeElementSet(options.allowedElements),
	disallowedElements: normalizeElementSet(options.disallowedElements),
	skipHtml: options.skipHtml === true,
	unwrapDisallowed: options.unwrapDisallowed === true
});

const getHtmlTokenTagName = (token: Tokens.HTML): string | null => {
	const match = token.raw.match(/^\s*<([A-Za-z][\w:-]*)(?=[\s/>])/);
	if (!match) {
		return null;
	}

	return match[1].toLowerCase();
};

const getTokenTagName = (token: StreamdownToken): string | null => {
	switch (token.type) {
		case 'heading':
			return `h${token.depth}`;
		case 'paragraph':
			return 'p';
		case 'blockquote':
			return 'blockquote';
		case 'code':
			return 'pre';
		case 'codespan':
			return 'code';
		case 'list':
			return token.ordered ? 'ol' : 'ul';
		case 'list_item':
			return 'li';
		case 'table':
			return 'table';
		case 'thead':
			return 'thead';
		case 'tbody':
			return 'tbody';
		case 'tfoot':
			return 'tfoot';
		case 'tr':
			return 'tr';
		case 'td':
			return 'td';
		case 'th':
			return 'th';
		case 'image':
			return 'img';
		case 'link':
			return 'a';
		case 'strong':
			return 'strong';
		case 'em':
			return 'em';
		case 'del':
			return 'del';
		case 'hr':
			return 'hr';
		case 'br':
			return 'br';
		case 'sub':
			return 'sub';
		case 'sup':
			return 'sup';
		case 'descriptionList':
			return 'dl';
		case 'descriptionTerm':
			return 'dt';
		case 'descriptionDetail':
			return 'dd';
		case 'html':
			return getHtmlTokenTagName(token);
		default:
			return null;
	}
};

const getTokenProperties = (token: StreamdownToken): Record<string, unknown> => {
	switch (token.type) {
		case 'heading':
			return { depth: token.depth };
		case 'link':
			return {
				href: token.href,
				title: token.title ?? undefined
			};
		case 'image':
			return {
				alt: token.text,
				src: token.href,
				title: token.title ?? undefined
			};
		default:
			return {};
	}
};

const shouldRemoveElement = (
	element: Readonly<MarkdownElement>,
	index: number,
	parent: Readonly<MarkdownParent> | undefined,
	options: ParsedMarkdownFilteringOptions
): boolean => {
	let remove = false;

	if (options.allowedElements) {
		remove = !options.allowedElements.has(element.tagName);
	} else if (options.disallowedElements) {
		remove = options.disallowedElements.has(element.tagName);
	}

	if (!remove && options.allowElement) {
		remove = !options.allowElement(element, index, parent);
	}

	return remove;
};

const filterTokens = (
	tokens: StreamdownToken[],
	options: ParsedMarkdownFilteringOptions,
	parent?: Readonly<MarkdownParent>
): StreamdownToken[] => {
	const filtered: StreamdownToken[] = [];

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (!token) {
			continue;
		}

		if (options.skipHtml && token.type === 'html') {
			continue;
		}

		const tagName = getTokenTagName(token);
		const currentElement = tagName
			? createMarkdownElement(tagName, getTokenProperties(token))
			: undefined;
		const hasChildTokens = Array.isArray((token as { tokens?: StreamdownToken[] }).tokens);
		const childTokens = hasChildTokens
			? filterTokens(
					(token as { tokens: StreamdownToken[] }).tokens,
					options,
					currentElement ?? parent
				)
			: undefined;
		const nextToken = hasChildTokens
			? ({ ...token, tokens: childTokens ?? [] } as StreamdownToken)
			: token;

		if (
			currentElement &&
			shouldRemoveElement(
				createMarkdownElement(currentElement.tagName, getTokenProperties(nextToken)),
				index,
				parent,
				options
			)
		) {
			if (options.unwrapDisallowed && childTokens && childTokens.length > 0) {
				filtered.push(...childTokens);
			}

			continue;
		}

		filtered.push(nextToken);
	}

	return filtered;
};

export const filterMarkdownTokens = (
	tokens: StreamdownToken[],
	options: MarkdownFilteringOptions
): StreamdownToken[] => {
	const parsedOptions = parseMarkdownFilteringOptions(options);

	if (
		!parsedOptions.allowElement &&
		!parsedOptions.allowedElements &&
		!parsedOptions.disallowedElements &&
		!parsedOptions.skipHtml
	) {
		return tokens;
	}

	return filterTokens(tokens, parsedOptions);
};
