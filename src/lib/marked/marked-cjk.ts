import type { Tokens } from 'marked';
import type { Extension } from './index.js';

const CJK_AUTOLINK_BOUNDARY_CHARS = new Set([
	'。',
	'．',
	'，',
	'、',
	'？',
	'！',
	'：',
	'；',
	'（',
	'）',
	'【',
	'】',
	'「',
	'」',
	'『',
	'』',
	'〈',
	'〉',
	'《',
	'》'
]);

const AUTOLINK_PREFIXES = ['https://', 'http://', 'mailto:', 'www.'] as const;

type DelimiterConfig = {
	delimiter: string;
	type: 'em' | 'strong' | 'del';
	buildText: (content: string) => string;
};

const DELIMITER_CONFIGS: DelimiterConfig[] = [
	{
		delimiter: '***',
		type: 'em',
		buildText: (content) => `**${content}**`
	},
	{
		delimiter: '**',
		type: 'strong',
		buildText: (content) => content
	},
	{
		delimiter: '~~',
		type: 'del',
		buildText: (content) => content
	},
	{
		delimiter: '*',
		type: 'em',
		buildText: (content) => content
	}
];

function containsCjkBoundaryChar(value: string): boolean {
	for (const char of value) {
		if (CJK_AUTOLINK_BOUNDARY_CHARS.has(char)) {
			return true;
		}
	}

	return false;
}

function hasNonWhitespaceBoundaryContent(value: string): boolean {
	return value.length > 0 && value.trim() === value;
}

function findDelimitedMatch(src: string, delimiter: string) {
	if (!src.startsWith(delimiter)) {
		return;
	}

	const closingIndex = src.indexOf(delimiter, delimiter.length);
	if (closingIndex === -1) {
		return;
	}

	const content = src.slice(delimiter.length, closingIndex);
	if (!hasNonWhitespaceBoundaryContent(content) || !containsCjkBoundaryChar(content)) {
		return;
	}

	return {
		raw: src.slice(0, closingIndex + delimiter.length),
		content
	};
}

function createInlineTextToken(text: string): Tokens.Text {
	return {
		type: 'text',
		raw: text,
		text,
		escaped: false
	};
}

function createAutolinkHref(text: string): string {
	return text.startsWith('www.') ? `http://${text}` : text;
}

function findAutolinkPrefixIndex(src: string): number | undefined {
	const indexes = AUTOLINK_PREFIXES.map((prefix) => {
		const index = src.toLowerCase().indexOf(prefix);
		return index === -1 ? Number.POSITIVE_INFINITY : index;
	});
	const firstIndex = Math.min(...indexes);

	return Number.isFinite(firstIndex) ? firstIndex : undefined;
}

function createAutolinkToken(raw: string): Tokens.Link {
	return {
		type: 'link',
		raw,
		href: createAutolinkHref(raw),
		title: null,
		text: raw,
		tokens: [createInlineTextToken(raw)]
	};
}

function findAutolinkBoundaryMatch(src: string) {
	const prefix = AUTOLINK_PREFIXES.find((candidate) => src.toLowerCase().startsWith(candidate));
	if (!prefix) {
		return;
	}

	let index = prefix.length;
	let sawBoundary = false;
	while (index < src.length) {
		const char = src[index];
		if (/\s/.test(char)) {
			break;
		}

		if (CJK_AUTOLINK_BOUNDARY_CHARS.has(char)) {
			sawBoundary = true;
			break;
		}

		index += 1;
	}

	if (!sawBoundary || index === prefix.length) {
		return;
	}

	return src.slice(0, index);
}

function createCjkDelimitedExtension(config: DelimiterConfig): Extension {
	return {
		name: `cjk-${config.type}-${config.delimiter.length}`,
		level: 'inline',
		start(src) {
			const firstIndex = src.indexOf(config.delimiter[0]);
			return firstIndex === -1 ? undefined : firstIndex;
		},
		tokenizer(this, src) {
			const match = findDelimitedMatch(src, config.delimiter);
			if (!match) {
				return;
			}

			const text = config.buildText(match.content);
			return {
				type: config.type,
				raw: match.raw,
				text,
				tokens: this.lexer.inlineTokens(text)
			} as Tokens.Em | Tokens.Strong | Tokens.Del;
		}
	};
}

export const markedCjk: Extension[] = [
	{
		name: 'cjk-autolink-boundary',
		level: 'inline',
		start(src) {
			return findAutolinkPrefixIndex(src);
		},
		tokenizer(this, src) {
			const match = findAutolinkBoundaryMatch(src);
			if (!match) {
				return;
			}

			return createAutolinkToken(match);
		}
	},
	...DELIMITER_CONFIGS.map(createCjkDelimitedExtension)
];
