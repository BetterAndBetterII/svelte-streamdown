import type { Extension } from './index.js';
import type { Token } from 'marked';

const tokenizeAlignBlock = (
	src: string,
	align: 'center' | 'right',
	blockTokens: (src: string, tokens: Token[]) => Token[]
): AlignToken | undefined => {
	const openingTag = `[${align}]`;
	const closingTag = `[/${align}]`;

	if (!src.startsWith(openingTag)) {
		return undefined;
	}

	const lines = src.split('\n');
	if (lines[0].trim() !== openingTag) {
		return undefined;
	}

	let contentEndLine = -1;
	let hasClosingTag = false;
	for (let i = 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (trimmed === closingTag) {
			contentEndLine = i - 1;
			hasClosingTag = true;
			break;
		}

		if (trimmed === '[center]' || trimmed === '[right]') {
			contentEndLine = i - 1;
			break;
		}
	}

	if (contentEndLine === -1 && !hasClosingTag) {
		return undefined;
	}

	const text = lines.slice(1, contentEndLine + 1).join('\n');
	const raw = lines.slice(0, hasClosingTag ? contentEndLine + 2 : contentEndLine + 1).join('\n');

	return {
		type: 'align',
		align,
		raw,
		text,
		tokens: blockTokens(text, [])
	} satisfies AlignToken;
};

export const markedAlign: Extension = {
	name: 'align',
	level: 'block',
	tokenizer(this, src) {
		return (
			tokenizeAlignBlock(src, 'center', this.lexer.blockTokens.bind(this.lexer)) ??
			tokenizeAlignBlock(src, 'right', this.lexer.blockTokens.bind(this.lexer))
		);
	}
};

export type AlignToken = {
	type: 'align';
	align: 'center' | 'right';
	raw: string;
	text: string;
	tokens: Token[];
};
