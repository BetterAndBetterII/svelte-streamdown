import { harden } from 'rehype-harden';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import type { Tokens } from 'marked';
import { unified } from 'unified';
import type { AllowedTags } from './types.js';

type HtmlRenderOverride = boolean | ((token: Tokens.HTML | Tokens.Tag) => string) | undefined;

type SecurityRenderOptions = {
	allowedImagePrefixes?: string[];
	allowedLinkPrefixes?: string[];
	allowedTags?: AllowedTags;
	defaultOrigin?: string;
};

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

	return {
		...defaultSanitizeSchema,
		tagNames: [...new Set([...(defaultSanitizeSchema.tagNames ?? []), ...Object.keys(allowedTags)])],
		attributes: {
			...defaultSanitizeSchema.attributes,
			...allowedTags
		}
	};
}

export function renderMarkdownFragment(
	source: string,
	{
		allowedImagePrefixes = ['*'],
		allowedLinkPrefixes = ['*'],
		allowedTags,
		defaultOrigin
	}: SecurityRenderOptions = {}
): string {
	try {
		return String(
			unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkRehype, { allowDangerousHtml: true })
				.use(rehypeRaw)
				.use(rehypeSanitize, createSanitizeSchema(allowedTags))
				.use(harden, {
					allowedImagePrefixes,
					allowedLinkPrefixes,
					allowedProtocols: ['*'],
					defaultOrigin,
					allowDataImages: true
				})
				.use(rehypeStringify)
				.processSync(source)
		);
	} catch {
		return escapeHtml(source);
	}
}

export function renderHtmlToken(
	token: Tokens.HTML | Tokens.Tag,
	{ renderHtml, ...options }: SecurityRenderOptions & { renderHtml?: HtmlRenderOverride } = {}
): string {
	const source = typeof renderHtml === 'function' ? renderHtml(token) : token.raw;

	if (renderHtml === false) {
		return escapeHtml(source);
	}

	return renderMarkdownFragment(source, options);
}
