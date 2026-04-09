import { harden } from 'rehype-harden';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { Lexer, type Tokens } from 'marked';
import { unified } from 'unified';
import {
	applyMarkdownUrlTransform,
	createMarkdownElement,
	type UrlTransform
} from '../markdown.js';
import {
	isPathRelativeUrl,
	parseAllowedUrlPrefixes,
	transformParsedUrl,
	type AllowedUrlPrefix
} from '../utils/url.js';
import type { AllowedTags } from './types.js';

type HtmlRenderOverride = boolean | ((token: Tokens.HTML | Tokens.Tag) => string) | undefined;

type SecurityRenderOptions = {
	allowedImagePrefixes?: string[];
	allowedLinkPrefixes?: string[];
	allowedTags?: AllowedTags;
	defaultOrigin?: string;
	skipHtml?: boolean;
	urlTransform?: UrlTransform;
};

const HTML_BLOCK_ELEMENT_START_PATTERN = /^[ \t]{0,3}<([A-Za-z][\w:-]*)(?=[\s>/])/;
const HTML_INDENTED_TAG_LINE_PATTERN = /^[ \t]{4,}(?=<[\w!/?-])/;
const HTML_TAG_PATTERN = /<\/?([A-Za-z][\w:-]*)(?=[\s/>])[^>]*>/g;
const HTML_VOID_ELEMENTS = new Set([
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
const HTML_LITERAL_CONTENT_TAGS = new Set([
	'code',
	'plaintext',
	'pre',
	'script',
	'style',
	'textarea',
	'title',
	'xmp'
]);

const defaultSanitizeSchema = {
	...defaultSchema,
	protocols: {
		...defaultSchema.protocols,
		href: [...(defaultSchema.protocols?.href ?? []), 'tel']
	},
	attributes: {
		...defaultSchema.attributes,
		code: [...(defaultSchema.attributes?.code ?? []), 'metastring']
	}
};

type RehypeNode = {
	children?: RehypeNode[];
	properties?: Record<string, unknown>;
	tagName?: string;
	type?: string;
};

const URL_ATTRIBUTE_KEYS = new Set(['href', 'src']);
const FALLBACK_HARDEN_ORIGIN = 'https://streamdown.invalid';
const WILDCARD_PREFIX = ['*'];
const sanitizeSchemaCache = new WeakMap<AllowedTags, typeof defaultSanitizeSchema>();
const PARSED_WILDCARD_PREFIX: AllowedUrlPrefix[] = [{ type: 'wildcard' }];

const visitRehypeTree = (node: RehypeNode, visitor: (node: RehypeNode) => void): void => {
	visitor(node);

	if (Array.isArray(node.children)) {
		for (const child of node.children) {
			visitRehypeTree(child, visitor);
		}
	}
};

function rehypeTransformUrls({ urlTransform }: { urlTransform?: UrlTransform } = {}) {
	return (tree: RehypeNode) => {
		if (!urlTransform) {
			return;
		}

		visitRehypeTree(tree, (node) => {
			if (node.type !== 'element' || typeof node.tagName !== 'string' || !node.properties) {
				return;
			}

			const element = createMarkdownElement(node.tagName, node.properties);

			for (const [key, value] of Object.entries(node.properties)) {
				if (!URL_ATTRIBUTE_KEYS.has(key) || value == null || Array.isArray(value)) {
					continue;
				}

				const transformedValue = urlTransform(String(value), key, element);

				if (transformedValue == null) {
					delete node.properties[key];
					continue;
				}

				node.properties[key] = transformedValue;
			}
		});
	};
}

function resolveHardenDefaultOrigin(
	defaultOrigin: string | undefined,
	rawAllowedLinkPrefixes: readonly string[],
	rawAllowedImagePrefixes: readonly string[],
	allowedLinkPrefixes: readonly AllowedUrlPrefix[],
	allowedImagePrefixes: readonly AllowedUrlPrefix[]
): string {
	if (defaultOrigin) {
		return defaultOrigin;
	}

	for (const prefix of [...allowedLinkPrefixes, ...allowedImagePrefixes]) {
		if (prefix.type === 'url') {
			return prefix.url.origin;
		}
	}

	if ([...rawAllowedLinkPrefixes, ...rawAllowedImagePrefixes].some((prefix) => prefix !== '*')) {
		return FALLBACK_HARDEN_ORIGIN;
	}

	return '';
}

export const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

function createSanitizeSchema(allowedTags?: AllowedTags) {
	if (!allowedTags || Object.keys(allowedTags).length === 0) {
		return defaultSanitizeSchema;
	}

	const cachedSchema = sanitizeSchemaCache.get(allowedTags);
	if (cachedSchema) {
		return cachedSchema;
	}

	const schema = {
		...defaultSanitizeSchema,
		tagNames: [
			...new Set([...(defaultSanitizeSchema.tagNames ?? []), ...Object.keys(allowedTags)])
		],
		attributes: {
			...defaultSanitizeSchema.attributes,
			...allowedTags
		}
	};

	sanitizeSchemaCache.set(allowedTags, schema);

	return schema;
}

function hasProtocolOnlyPrefix(allowedPrefixes: readonly AllowedUrlPrefix[]): boolean {
	return allowedPrefixes.some((prefix) => prefix.type === 'protocol');
}

const createMarkdownSecurityProcessor = ({
	allowedImagePrefixes,
	allowedLinkPrefixes,
	allowedTags,
	defaultOrigin,
	urlTransform
}: {
	allowedImagePrefixes: readonly string[];
	allowedLinkPrefixes: readonly string[];
	allowedTags?: AllowedTags;
	defaultOrigin?: string;
	urlTransform?: UrlTransform;
}) => {
	const parsedAllowedLinkPrefixes = parseAllowedUrlPrefixes(allowedLinkPrefixes, defaultOrigin);
	const parsedAllowedImagePrefixes = parseAllowedUrlPrefixes(allowedImagePrefixes, defaultOrigin);
	const shouldDelegateLinkPrefixChecks = hasProtocolOnlyPrefix(parsedAllowedLinkPrefixes);
	const shouldDelegateImagePrefixChecks = hasProtocolOnlyPrefix(parsedAllowedImagePrefixes);
	const hardenAllowedLinkPrefixes = shouldDelegateLinkPrefixChecks
		? WILDCARD_PREFIX
		: allowedLinkPrefixes;
	const hardenAllowedImagePrefixes = shouldDelegateImagePrefixChecks
		? WILDCARD_PREFIX
		: allowedImagePrefixes;
	const hardenDefaultOrigin = resolveHardenDefaultOrigin(
		defaultOrigin,
		hardenAllowedLinkPrefixes,
		hardenAllowedImagePrefixes,
		shouldDelegateLinkPrefixChecks
			? PARSED_WILDCARD_PREFIX
			: parseAllowedUrlPrefixes(hardenAllowedLinkPrefixes, defaultOrigin),
		shouldDelegateImagePrefixChecks
			? PARSED_WILDCARD_PREFIX
			: parseAllowedUrlPrefixes(hardenAllowedImagePrefixes, defaultOrigin)
	);
	const securityUrlTransform = createSecurityUrlTransform({
		allowedImagePrefixes: parsedAllowedImagePrefixes,
		allowedLinkPrefixes: parsedAllowedLinkPrefixes,
		shouldDelegateImagePrefixChecks,
		shouldDelegateLinkPrefixChecks,
		defaultOrigin,
		urlTransform
	});

	return unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypeSanitize, createSanitizeSchema(allowedTags))
		.use(rehypeTransformUrls, { urlTransform: securityUrlTransform })
		.use(harden, {
			allowedImagePrefixes:
				hardenAllowedImagePrefixes === WILDCARD_PREFIX
					? WILDCARD_PREFIX
					: [...hardenAllowedImagePrefixes],
			allowedLinkPrefixes:
				hardenAllowedLinkPrefixes === WILDCARD_PREFIX
					? WILDCARD_PREFIX
					: [...hardenAllowedLinkPrefixes],
			allowedProtocols: WILDCARD_PREFIX,
			defaultOrigin: hardenDefaultOrigin,
			allowDataImages: true
		})
		.use(rehypeStringify);
};

const hasOnlyWildcardPrefix = (prefixes: readonly string[]): boolean =>
	prefixes.length === 1 && prefixes[0] === '*';

const defaultMarkdownSecurityProcessor = createMarkdownSecurityProcessor({
	allowedImagePrefixes: WILDCARD_PREFIX,
	allowedLinkPrefixes: WILDCARD_PREFIX
});

function createSecurityUrlTransform({
	allowedImagePrefixes,
	allowedLinkPrefixes,
	shouldDelegateImagePrefixChecks,
	shouldDelegateLinkPrefixChecks,
	defaultOrigin,
	urlTransform
}: {
	allowedImagePrefixes: readonly AllowedUrlPrefix[];
	allowedLinkPrefixes: readonly AllowedUrlPrefix[];
	shouldDelegateImagePrefixChecks: boolean;
	shouldDelegateLinkPrefixChecks: boolean;
	defaultOrigin?: string;
	urlTransform?: UrlTransform;
}): UrlTransform {
	return (url, key, node) => {
		const transformedUrl = applyMarkdownUrlTransform(url, key, node, urlTransform);

		if (typeof transformedUrl !== 'string') {
			return transformedUrl;
		}

		if (node.tagName === 'a' && key === 'href') {
			if (!shouldDelegateLinkPrefixChecks || isPathRelativeUrl(transformedUrl)) {
				return transformedUrl;
			}

			return transformParsedUrl(transformedUrl, allowedLinkPrefixes, defaultOrigin, {
				kind: 'link'
			});
		}

		if (node.tagName === 'img' && key === 'src') {
			if (!shouldDelegateImagePrefixChecks || isPathRelativeUrl(transformedUrl)) {
				return transformedUrl;
			}

			return transformParsedUrl(transformedUrl, allowedImagePrefixes, defaultOrigin, {
				kind: 'image'
			});
		}

		return transformedUrl;
	};
}

export function normalizeHtmlIndentation(content: string): string {
	if (typeof content !== 'string' || content.length === 0) {
		return content;
	}

	if (!content.includes('<')) {
		return content;
	}

	const lineBreak = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split(/\r?\n/);
	let changed = false;

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const blockEndIndex = findHtmlBlockEnd(lines, lineIndex);

		if (blockEndIndex == null) {
			continue;
		}

		const normalizedBlockLines = normalizeHtmlBlockLines(lines.slice(lineIndex, blockEndIndex + 1));

		if (!normalizedBlockLines) {
			lineIndex = blockEndIndex;
			continue;
		}

		lines.splice(lineIndex, normalizedBlockLines.length, ...normalizedBlockLines);
		changed = true;
		lineIndex = blockEndIndex;
	}

	return changed ? lines.join(lineBreak) : content;
}

function normalizeHtmlBlockLines(blockLines: string[]): string[] | null {
	let changed = false;
	const normalizedLines = blockLines.map((line, index) => {
		if (index === 0 || !line || !HTML_INDENTED_TAG_LINE_PATTERN.test(line)) {
			return line;
		}

		changed = true;
		return line.replace(HTML_INDENTED_TAG_LINE_PATTERN, '');
	});

	if (!changed) {
		return null;
	}

	return isSafeNormalizedHtmlBlock(normalizedLines.join('\n')) ? normalizedLines : null;
}

function findHtmlBlockEnd(lines: string[], startIndex: number): number | null {
	const startLine = lines[startIndex];
	const startTagMatch = startLine?.match(HTML_BLOCK_ELEMENT_START_PATTERN);

	if (!startTagMatch) {
		return null;
	}

	const rootTagName = startTagMatch[1].toLowerCase();

	if (HTML_LITERAL_CONTENT_TAGS.has(rootTagName)) {
		return null;
	}

	const tagStack = collectOpenHtmlTags(startLine);

	if (tagStack.length === 0) {
		return startIndex;
	}

	for (let lineIndex = startIndex + 1; lineIndex < lines.length; lineIndex += 1) {
		updateHtmlTagStack(tagStack, lines[lineIndex] ?? '');

		if (tagStack.length === 0) {
			return lineIndex;
		}
	}

	return null;
}

function collectOpenHtmlTags(line: string): string[] {
	const tagStack: string[] = [];
	updateHtmlTagStack(tagStack, line);
	return tagStack;
}

function updateHtmlTagStack(tagStack: string[], line: string): void {
	for (const match of line.matchAll(HTML_TAG_PATTERN)) {
		const rawTag = match[0];
		const tagName = match[1]?.toLowerCase();

		if (!tagName) {
			continue;
		}

		if (rawTag.startsWith('</')) {
			const lastMatchingIndex = tagStack.lastIndexOf(tagName);

			if (lastMatchingIndex !== -1) {
				tagStack.length = lastMatchingIndex;
			}

			continue;
		}

		if (HTML_VOID_ELEMENTS.has(tagName) || rawTag.trimEnd().endsWith('/>')) {
			continue;
		}

		tagStack.push(tagName);
	}
}

function isSafeNormalizedHtmlBlock(block: string): boolean {
	const tokens = Lexer.lex(block, { gfm: true }).filter((token) => token.type !== 'space');
	return (
		tokens.length > 0 &&
		tokens.every((token) => token.type === 'html' && 'block' in token && token.block === true)
	);
}

export function renderMarkdownFragment(
	source: string,
	{
		allowedImagePrefixes = ['*'],
		allowedLinkPrefixes = ['*'],
		allowedTags,
		defaultOrigin,
		urlTransform
	}: SecurityRenderOptions = {}
): string {
	try {
		if (
			!allowedTags &&
			!defaultOrigin &&
			!urlTransform &&
			hasOnlyWildcardPrefix(allowedLinkPrefixes) &&
			hasOnlyWildcardPrefix(allowedImagePrefixes)
		) {
			return String(defaultMarkdownSecurityProcessor.processSync(source));
		}

		return String(
			createMarkdownSecurityProcessor({
				allowedImagePrefixes,
				allowedLinkPrefixes,
				allowedTags,
				defaultOrigin,
				urlTransform
			}).processSync(source)
		);
	} catch {
		return escapeHtml(source);
	}
}

export function renderHtmlToken(
	token: Tokens.HTML | Tokens.Tag,
	{ renderHtml, ...options }: SecurityRenderOptions & { renderHtml?: HtmlRenderOverride } = {}
): string {
	if (options.skipHtml) {
		return '';
	}

	const source = typeof renderHtml === 'function' ? renderHtml(token) : token.raw;

	if (renderHtml === false) {
		return escapeHtml(source);
	}

	return renderMarkdownFragment(source, options);
}
