import type { Extension, GenericToken } from './index.js';
import type { Lexer } from 'marked';

export function letterToInt(letter: string) {
	return letter.toLowerCase().charCodeAt(0) - 96;
}

const romanMap = {
	I: 1,
	V: 5,
	X: 10,
	L: 50,
	C: 100,
	D: 500,
	M: 1000
} as const;

export function romanToInt(roman: string) {
	roman = roman.toUpperCase();
	let total = 0;

	for (let i = 0; i < roman.length; i++) {
		const current = romanMap[roman[i] as keyof typeof romanMap];
		const next = romanMap[roman[i + 1] as keyof typeof romanMap];

		total += next && current < next ? -current : current;
	}

	return total;
}

// Regular expression patterns for list detection
export const romanUpper = '(?:C|XC|L?X{0,3}(?:IX|IV|V?I{0,3}))';
export const romanLower = '(?:c|xc|l?x{0,3}(?:ix|iv|v?i{0,3}))';
// Fixed regex pattern - carefully balanced parentheses
export const bulletPattern = `(?:[*+-]|(?:\\d{1,9}|[a-zA-Z]|${romanUpper}|${romanLower})[.)])`;
export const rule = `^( {0,3}${bulletPattern})([ \\t][^\\n]*|[ \\t])?(?:\\n|$)`;

function finalizeList(list: ListToken, lexer: Lexer) {
	if (list.tokens.length === 0) return;

	// Trim trailing newline from last item
	const lastItem = list.tokens[list.tokens.length - 1];
	lastItem.raw = lastItem.raw.trimEnd();
	lastItem.text = lastItem.text.trimEnd();
	list.raw = list.raw.trimEnd();

	// Handle child tokens
	for (const item of list.tokens) {
		lexer.state.top = false;
		item.tokens = lexer.blockTokens(item.text, []);

		if (!list.loose) {
			const hasLooseParagraphSpacing = item.tokens.some(
				(token) => token.type === 'space' && /\n.*\n/.test(token.raw)
			);
			if (hasLooseParagraphSpacing) {
				list.loose = true;
			}
		}
	}

	// Mark list as loose if needed
	if (list.loose) {
		for (const item of list.tokens) {
			item.loose = true;
			item.tokens = normalizeLooseListItemTokens(item.tokens);
		}
	}
}
function escapeForRegex(s: string) {
	return s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function paragraphFromTextTokens(tokens: GenericToken[]): GenericToken {
	const firstToken = tokens[0];
	if (tokens.length === 1) {
		return {
			type: 'paragraph',
			raw: firstToken.raw,
			text: firstToken.text ?? firstToken.raw,
			tokens: firstToken.tokens ?? [
				{
					type: 'text',
					raw: firstToken.raw,
					text: firstToken.text ?? firstToken.raw,
					escaped: false
				}
			]
		} satisfies GenericToken;
	}

	const inlineTokens: GenericToken[] = [];
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (index > 0) {
			inlineTokens.push({
				type: 'text',
				raw: '\n',
				text: '\n',
				escaped: false
			});
		}

		if (token.tokens && token.tokens.length > 0) {
			inlineTokens.push(...(token.tokens as GenericToken[]));
		} else {
			inlineTokens.push({
				type: 'text',
				raw: token.raw,
				text: token.text ?? token.raw,
				escaped: false
			});
		}
	}

	return {
		type: 'paragraph',
		raw: tokens.map((token) => token.raw).join('\n'),
		text: tokens.map((token) => token.text ?? token.raw).join('\n'),
		tokens: inlineTokens
	} satisfies GenericToken;
}

function normalizeLooseListItemTokens(tokens: GenericToken[]): GenericToken[] {
	const hasTextTokens = tokens.some((token) => token.type === 'text');
	const hasParagraphSeparators = tokens.some((token) => token.type === 'space');
	const hasMixedBlockContent =
		hasTextTokens && tokens.some((token) => token.type !== 'text' && token.type !== 'space');

	// Keep plain single-run text items stable so streaming updates do not remount
	// already-rendered spans when a neighboring list group makes the parent list loose.
	if (!hasParagraphSeparators && !hasMixedBlockContent) {
		return tokens;
	}

	const normalized: GenericToken[] = [];
	let textTokens: GenericToken[] = [];

	const flushTextTokens = () => {
		if (textTokens.length === 0) {
			return;
		}

		normalized.push(paragraphFromTextTokens(textTokens));
		textTokens = [];
	};

	for (const token of tokens) {
		if (token.type === 'space') {
			flushTextTokens();
			continue;
		}

		if (token.type === 'text') {
			textTokens.push(token);
			continue;
		}

		flushTextTokens();
		normalized.push(token);
	}

	flushTextTokens();

	return normalized;
}
export const markedList: Extension = {
	name: 'list',
	level: 'block',
	tokenizer(this, src) {
		let cap = new RegExp(rule).exec(src);

		if (!cap) return undefined;

		const bullet = cap[1].trim();
		const isOrdered = bullet !== '*' && bullet !== '-' && bullet !== '+';
		let bull;
		let type = '';
		let expectedValue: number | null = null;

		// Detect list type (Roman, alphabetic, numeric)
		if (isOrdered) {
			if (bullet.match(new RegExp(`^${romanUpper}[.)]$`))) {
				type = 'upper-roman';
				bull = `${romanUpper}\\${bullet.slice(-1)}`;
			} else if (bullet.match(new RegExp(`^${romanLower}[.)]$`))) {
				type = 'lower-roman';
				bull = `${romanLower}\\${bullet.slice(-1)}`;
			} else if (bullet.match(/^[a-z][.)]$/)) {
				type = 'lower-alpha';
				bull = `[a-z]\\${bullet.slice(-1)}`;
			} else if (bullet.match(/^[A-Z][.)]$/)) {
				type = 'upper-alpha';
				bull = `[A-Z]\\${bullet.slice(-1)}`;
			} else {
				type = 'decimal';
				bull = `\\d{1,9}\\${bullet.slice(-1)}`;
			}
		} else {
			bull = this.lexer.options.pedantic ? bullet : '[*+-]';
			bull = this.lexer.options.pedantic ? escapeForRegex(bullet) : '[*+-]';
		}

		const list = {
			type: 'list',
			raw: '',
			ordered: isOrdered,
			listType: isOrdered ? type : null,
			loose: false,
			start: undefined, // Will be set when first item is processed
			tokens: [] as ListItemToken[]
		} as ListToken;

		// Get next list item
		// Updated regex to properly handle empty list items (space after bullet, then newline)
		const itemRegex = new RegExp(`^( {0,3}${bull})([\t ][^\\n]*|[\t ])?(?:\\n|$)`);
		let endsWithBlankLine = false;

		// Check if current bullet point can start a new List Item
		while (src) {
			let raw = '';
			let itemContents = '';
			let endEarly = false;

			if (!(cap = itemRegex.exec(src))) break;

			raw = cap[0];
			const bullet = cap[1].trim();
			src = src.substring(raw.length);

			const line = cap[2]
				? cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(4 * t.length))
				: '';
			const nextLine = src.split('\n', 1)[0];
			const blankLine = !line.trim();

			let indent = 0;
			if (this.lexer.options.pedantic) {
				indent = 2;
				itemContents = line.trimStart();
			} else if (blankLine) {
				indent = cap[1].length + 1;
			} else {
				indent = cap[2].search(/[^ ]/); // Find first non-space char
				indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
				itemContents = line.slice(indent);
				indent += cap[1].length;
			}

			if (blankLine && /^[ \t]*$/.test(nextLine)) {
				// Items begin with at most one blank line
				raw += nextLine + '\n';
				src = src.substring(nextLine.length + 1);
				endEarly = true;
			}

			if (!endEarly) {
				const nextBulletRegex = new RegExp(
					`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|(?:\\d{1,9}|[a-zA-Z]|${romanUpper}|${romanLower})[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`
				);
				const hrRegex = new RegExp(
					`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`
				);
				const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
				const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
				const htmlBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}<[a-z].*>`, 'i');
				const footnoteBeginRegex = new RegExp(
					`^ {0,${Math.min(3, indent - 1)}}\\[\\^[^\\]\\n]+\\]:(?:[ \\t]+|$)`
				);
				let previousLineWasBlank = blankLine;

				// Check if following lines should be included in List Item
				while (src) {
					const rawLine = src.split('\n', 1)[0];
					const nextLineWithoutTabs = rawLine.replace(/\t/g, '    ');
					const nextLineIndent = nextLineWithoutTabs.search(/[^ ]/);
					const isBlankLine = nextLineIndent === -1;

					if (
						fencesBeginRegex.test(nextLineWithoutTabs) ||
						headingBeginRegex.test(nextLineWithoutTabs) ||
						htmlBeginRegex.test(nextLineWithoutTabs) ||
						footnoteBeginRegex.test(nextLineWithoutTabs) ||
						nextBulletRegex.test(nextLineWithoutTabs) ||
						hrRegex.test(nextLineWithoutTabs)
					)
						break;

					// A blank-line break closes the list item before dedented prose resumes at top level.
					if (previousLineWasBlank && !isBlankLine && nextLineIndent < indent) break;

					if (nextLineIndent >= indent || isBlankLine) {
						itemContents += '\n' + (isBlankLine ? '' : nextLineWithoutTabs.slice(indent));
					} else {
						itemContents += '\n' + nextLineWithoutTabs;
					}
					previousLineWasBlank = isBlankLine;

					raw += rawLine + '\n';
					src = src.substring(rawLine.length + 1);
				}
			}

			if (!list.loose) {
				// If the previous item ended with a blank line, the list is loose
				if (endsWithBlankLine) {
					list.loose = true;
				} else if (/\n[ \t]*\n[ \t]*$/.test(raw)) {
					endsWithBlankLine = true;
				}
			}

			let isTask = null;
			let isChecked = false;
			// Check for task list items
			if (this.lexer.options.gfm) {
				isTask = /^\[[ xX]] /.exec(itemContents);
				if (isTask) {
					isChecked = isTask[0] !== '[ ] ';
					itemContents = itemContents.replace(/^\[[ xX]] +/, '');
				}
			}

			let value = null;
			if (!isOrdered) {
				// Do nothing for unordered lists
			} else if (type === 'decimal') {
				value = parseInt(bullet.slice(0, -1), 10);
			} else if (type === 'lower-alpha' || type === 'upper-alpha') {
				value = letterToInt(bullet.slice(0, -1));
			} else if (type === 'lower-roman' || type === 'upper-roman') {
				value = romanToInt(bullet.slice(0, -1));
			}

			// Handle expectedValue initialization and validation
			let skipped = false;
			if (isOrdered) {
				if (expectedValue === null) {
					// First item: set expectedValue to this item's value (or 1 if parsing failed)
					expectedValue = value ?? 1;
					// Set the start property for ordered lists
					list.start = expectedValue;
					// Subsequent ordered items should advance from the first marker.
					expectedValue += 1;
				} else {
					// Subsequent items: check if value matches expected
					skipped = value !== null && value !== expectedValue;
					// Increment expectedValue for next item
					expectedValue += 1;
				}
			}

			list.tokens.push({
				type: 'list_item',
				raw,
				task: !!isTask,
				checked: isChecked,
				loose: false,
				text: itemContents,
				value,
				skipped,
				tokens: []
			});
			list.raw += raw;
		}

		if (list.tokens.length === 0) return undefined;

		// Finalize the list
		finalizeList(list, this.lexer);

		return list as ListToken;
	}
};

export interface ListToken {
	type: 'list';
	raw: string;
	ordered: boolean;
	listType: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman' | null;
	loose: boolean;
	start?: number;
	tokens: ListItemToken[];
}

/**
 * Token representing an item in an extended list.
 */
export interface ListItemToken {
	type: 'list_item';
	raw: string;
	task: boolean;
	checked: boolean;
	loose: boolean;
	text: string;
	value: number | null;
	skipped: boolean;
	tokens: GenericToken[]; // Tokens inside the list item (e.g., paragraphs, inline elements, etc.)
}
