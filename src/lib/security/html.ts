import { harden } from 'rehype-harden';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import type { Tokens } from 'marked';
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

const HTML_BLOCK_START_PATTERN = /^[ \t]*<[\w!/?-]/;
const HTML_LINE_INDENT_PATTERN = /(^|\n)[ \t]{4,}(?=<[\w!/?-])/g;

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

const escapeHtml = (value: string): string =>
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
				hardenAllowedLinkPrefixes === WILDCARD_PREFIX ? WILDCARD_PREFIX : [...hardenAllowedLinkPrefixes],
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

	if (!HTML_BLOCK_START_PATTERN.test(content)) {
		return content;
	}

	return content.replace(HTML_LINE_INDENT_PATTERN, '$1');
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
