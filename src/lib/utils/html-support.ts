import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

type AllowedTags = Record<string, string[]>;

type HtmlRenderOptions = {
	allowedTags?: AllowedTags;
	literalTagContent?: string[];
};

const HTML_BLOCK_START_PATTERN = /^[ \t]*<[\w!/?-]/;
const HTML_LINE_INDENT_PATTERN = /(^|\n)[ \t]{4,}(?=<[\w!/?-])/g;
const MARKDOWN_ESCAPE_RE = /([\\`*_~[\]|])/g;

const collectText = (node: any): string => {
	if (node?.type === 'text') {
		return String(node.value ?? '');
	}

	if (Array.isArray(node?.children)) {
		return node.children.map(collectText).join('');
	}

	return '';
};

const rehypeLiteralTagContent =
	(tagNames: string[] = []) =>
	(tree: any): void => {
		if (!tagNames.length) {
			return;
		}

		const tagSet = new Set(tagNames.map((tagName) => tagName.toLowerCase()));

		visit(tree, 'element', (node: any) => {
			if (tagSet.has(String(node.tagName ?? '').toLowerCase())) {
				const text = collectText(node);
				node.children = text ? [{ type: 'text', value: text }] : [];
			}
		});
	};

export const normalizeHtmlIndentation = (content: string): string => {
	if (typeof content !== 'string' || content.length === 0) {
		return content;
	}

	if (!HTML_BLOCK_START_PATTERN.test(content)) {
		return content;
	}

	return content.replace(HTML_LINE_INDENT_PATTERN, '$1');
};

export const preprocessCustomTags = (markdown: string, tagNames: string[]): string => {
	if (!tagNames.length) {
		return markdown;
	}

	let result = markdown;

	for (const tagName of tagNames) {
		const pattern = new RegExp(
			`(<${tagName}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${tagName}\\s*>)`,
			'gi'
		);

		result = result.replace(pattern, (_match, open: string, content: string, close: string) => {
			if (!content.includes('\n\n')) {
				return open + content + close;
			}

			const fixedContent = content.replace(/\n\n/g, '\n<!---->\n');
			const paddedContent =
				(fixedContent.startsWith('\n') ? '' : '\n') +
				fixedContent +
				(fixedContent.endsWith('\n') ? '' : '\n');

			return `${open}${paddedContent}${close}\n\n`;
		});
	}

	return result;
};

export const preprocessLiteralTagContent = (markdown: string, tagNames: string[]): string => {
	if (!tagNames.length) {
		return markdown;
	}

	let result = markdown;

	for (const tagName of tagNames) {
		const pattern = new RegExp(
			`(<${tagName}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${tagName}\\s*>)`,
			'gi'
		);

		result = result.replace(pattern, (_match, open: string, content: string, close: string) => {
			const escaped = content.replace(MARKDOWN_ESCAPE_RE, '\\$1').replace(/\n\n/g, '&#10;&#10;');

			return open + escaped + close;
		});
	}

	return result;
};

export const prepareMarkdownForHtml = (
	content: string,
	{
		allowedTags,
		literalTagContent,
		normalizeIndentation = false
	}: {
		allowedTags?: AllowedTags;
		literalTagContent?: string[];
		normalizeIndentation?: boolean;
	}
): string => {
	let result = content;

	if (normalizeIndentation) {
		result = normalizeHtmlIndentation(result);
	}

	if (literalTagContent?.length) {
		result = preprocessLiteralTagContent(result, literalTagContent);
	}

	const allowedTagNames = allowedTags ? Object.keys(allowedTags) : [];
	if (allowedTagNames.length) {
		result = preprocessCustomTags(result, allowedTagNames);
	}

	return result;
};

export const containsHtml = (content: string): boolean => /<[/!A-Za-z][^>]*>/.test(content);

export const renderMarkdownToHtml = (
	content: string,
	{ allowedTags, literalTagContent }: HtmlRenderOptions = {}
): string => {
	const extendedSchema = {
		...defaultSchema,
		tagNames: [...(defaultSchema.tagNames ?? []), ...Object.keys(allowedTags ?? {})],
		attributes: {
			...defaultSchema.attributes,
			...(allowedTags ?? {})
		}
	};

	const processor = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypeSanitize, extendedSchema);

	if (literalTagContent?.length) {
		processor.use(rehypeLiteralTagContent, literalTagContent);
	}

	processor.use(rehypeStringify);

	return String(processor.processSync(content));
};
