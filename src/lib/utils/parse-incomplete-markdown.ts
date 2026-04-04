// Simplified interface that merges Plugin and PatternRule
export interface Plugin {
	name: string;
	pattern?: RegExp;
	handler?: (payload: HandlerPayload) => string;
	skipInBlockTypes?: string[]; // block types where this plugin should be skipped
	stopProcessingOnChange?: boolean;
	preprocess?: (payload: HookPayload) => string | { text: string; state: Partial<ParseState> };
	postprocess?: (payload: HookPayload) => string;
}

interface HookPayload {
	text: string;
	state: ParseState;
	setState: (state: Partial<ParseState>) => void;
}
interface HandlerPayload {
	line: string;
	text: string;
	match: RegExpMatchArray;
	state: ParseState;
	setState: (state: Partial<ParseState>) => void;
}

interface ParseState {
	currentLine: number;
	context: 'normal' | 'list' | 'blockquote' | 'descriptionList';
	blockingContexts: Set<'code' | 'math' | 'center' | 'right'>;
	lineContexts?: Array<{ code: boolean; math: boolean; center: boolean; right: boolean }>;
	lines?: string[];
	fenceInfo?: string;
	mdxUnclosedTags?: Array<{ tagName: string; lineIndex: number }>;
	mdxLineStates?: Array<{ inMdx: boolean; incompletePositions: number[] }>;
}

export class IncompleteMarkdownParser {
	private plugins: Plugin[] = [];
	private state: ParseState = {
		currentLine: 0,
		context: 'normal',
		blockingContexts: new Set(),
		lineContexts: []
	};

	setState = (state: Partial<ParseState>) => {
		this.state = { ...this.state, ...state };
	};

	constructor(plugins: Plugin[] = []) {
		this.plugins = plugins;
	}

	// Main parsing methods
	parse(text: string): string {
		if (!text || typeof text !== 'string') {
			return text;
		}

		this.state = {
			currentLine: 0,
			context: 'normal',
			blockingContexts: new Set(),
			lineContexts: [],
			fenceInfo: undefined
		};

		let result = text;

		// Execute preprocess hooks for all plugins
		for (const plugin of this.plugins) {
			if (plugin.preprocess) {
				try {
					const preprocessResult = plugin.preprocess({
						text: result,
						state: this.state,
						setState: this.setState
					});
					if (typeof preprocessResult === 'string') {
						result = preprocessResult;
					} else {
						result = preprocessResult.text;
						this.setState(preprocessResult.state);
					}
				} catch (error) {
					console.error(`Plugin ${plugin.name} preprocess hook failed:`, error);
				}
			}
		}

		// Split into lines for processing
		const lines = result.split('\n');
		const processedLines = [...lines];

		// Process each line with each plugin
		for (let i = 0; i < processedLines.length; i++) {
			this.state.currentLine = i;
			let line = processedLines[i];

			for (const plugin of this.plugins) {
				// Skip this plugin if current line is in a blocking context
				const currentLineContext = this.state.lineContexts?.[i];
				const shouldSkip =
					currentLineContext &&
					(plugin.skipInBlockTypes || []).some(
						(blockType) => currentLineContext[blockType as 'code' | 'math']
					);
				if (shouldSkip) {
					continue;
				}

				try {
					const previousLine = line;
					const match = plugin.pattern ? line.match(plugin.pattern) : line.match(/.*/);
					if (match && plugin.handler) {
						line = plugin.handler({
							line,
							text: line,
							match,
							state: this.state,
							setState: this.setState
						});

						if (plugin.stopProcessingOnChange && line !== previousLine) {
							break;
						}
					}
				} catch (error) {
					console.error(`Plugin ${plugin.name} failed on line ${i}:`, error);
				}
			}

			processedLines[i] = line;
		}

		// Rebuild text from processed lines
		result = processedLines.join('\n');

		// Execute afterParse hooks for all plugins
		for (const plugin of this.plugins) {
			if (plugin.postprocess) {
				try {
					result = plugin.postprocess({ text: result, state: this.state, setState: this.setState });
				} catch (error) {
					console.error(`Plugin ${plugin.name} afterParse hook failed:`, error);
				}
			}
		}

		return result;
	}

	// Create default plugins that replicate the original handler functions
	static createDefaultPlugins(): Plugin[] {
		return [
			// Block-level plugin that manages blocking contexts
			{
				name: 'contextManager',
				preprocess: ({ text }) => {
					// Pre-scan the entire text to establish blocking contexts
					const lines = text.split('\n');
					let inCodeBlock = false;
					let inMathBlock = false;
					let inCenterBlock = false;
					let inRightBlock = false;

					// Track which lines are in which contexts for state management
					const lineContexts: Array<{
						code: boolean;
						math: boolean;
						center: boolean;
						right: boolean;
					}> = [];

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];

						// Check for block boundaries
						if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
							inCodeBlock = !inCodeBlock;
						}
						if (line.trim() === '$$') {
							inMathBlock = !inMathBlock;
						}
						if (line.trim() === '[center]') {
							inCenterBlock = true;
						}
						if (line.trim() === '[/center]') {
							inCenterBlock = false;
						}
						if (line.trim() === '[right]') {
							inRightBlock = true;
						}
						if (line.trim() === '[/right]') {
							inRightBlock = false;
						}

						lineContexts[i] = {
							code: inCodeBlock,
							math: inMathBlock,
							center: inCenterBlock,
							right: inRightBlock
						};
					}

					// Set the final blocking contexts (for postprocessing)
					const finalContexts = new Set<string>();
					if (inCodeBlock) finalContexts.add('code');
					if (inMathBlock) finalContexts.add('math');
					if (inCenterBlock) finalContexts.add('center');
					if (inRightBlock) finalContexts.add('right');

					// Return both the text and the updated state
					return {
						text: text, // Don't modify text in preprocess
						state: {
							lines,
							blockingContexts: finalContexts as Set<'code' | 'math' | 'center' | 'right'>,
							lineContexts
						}
					};
				},
				postprocess: ({ text, state }) => {
					// Complete all incomplete blocks at end of input
					let result = text;
					if (state.blockingContexts.has('code')) {
						result += '\n```';
					}
					if (state.blockingContexts.has('math')) {
						result += '\n$$';
					}
					if (state.blockingContexts.has('center')) {
						// Only close if there is content after the opening [center] tag
						const openIdx = result.lastIndexOf('[center]');
						const afterOpen = openIdx !== -1 ? result.slice(openIdx + '[center]'.length) : '';
						if (afterOpen.replace(/\n/g, '').trim().length > 0) {
							result += '\n[/center]';
						}
					}
					if (state.blockingContexts.has('right')) {
						// Only close if there is content after the opening [right] tag
						const openIdx = result.lastIndexOf('[right]');
						const afterOpen = openIdx !== -1 ? result.slice(openIdx + '[right]'.length) : '';
						if (afterOpen.replace(/\n/g, '').trim().length > 0) {
							result += '\n[/right]';
						}
					}
					return result;
				}
			},
			{
				name: 'singleTildeEscape',
				pattern: /~/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => escapeSingleTildes(line)
			},
			{
				name: 'comparisonOperators',
				pattern: /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) =>
					line.replace(
						/^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/,
						(_, prefix: string, suffix: string) => `${prefix}\\>${suffix}`
					)
			},
			{
				name: 'htmlTags',
				postprocess: ({ text }) => stripTrailingIncompleteHtmlTag(text)
			},
			{
				name: 'setextHeadingGuard',
				pattern: /^[ \t]*[-=]{1,2}[ \t]*$/,
				skipInBlockTypes: ['code', 'math', 'center', 'right'],
				handler: ({ line, state }) => {
					const lines = state.lines ?? [];
					const isLastLine = state.currentLine === lines.length - 1;
					const previousLine = state.currentLine > 0 ? lines[state.currentLine - 1] : undefined;
					const marker = line.trim();

					if (!isLastLine || !previousLine?.trim() || !/^[-=]{1,2}$/.test(marker)) {
						return line;
					}

					return line.trimEnd() + '\u200B';
				}
			},
			{
				name: 'boldItalic',
				pattern: /\*\*\*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => handleIncompleteBoldItalic(line)
			},
			{
				name: 'bold',
				pattern: /\*\*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => handleIncompleteBold(line)
			},
			{
				name: 'doubleUnderscoreItalic',
				pattern: /__/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => handleIncompleteDoubleUnderscoreItalic(line)
			},
			{
				name: 'strikethrough',
				pattern: /~~/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => handleIncompleteStrikethrough(line)
			},
			{
				name: 'singleAsteriskItalic',
				pattern: /[\s\S]*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => handleIncompleteSingleAsteriskItalic(line)
			},
			{
				name: 'inlineCode',
				skipInBlockTypes: ['code', 'math'],
				pattern: /`/,
				handler: ({ line }) => {
					// Inline countSingleBackticks logic
					let singleBacktickCount = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '`') {
							const isTripleStart = line.substring(i, i + 3) === '```';
							const isTripleMiddle = i > 0 && line.substring(i - 1, i + 2) === '```';
							const isTripleEnd = i > 1 && line.substring(i - 2, i + 1) === '```';
							const isPartOfTriple = isTripleStart || isTripleMiddle || isTripleEnd;
							if (!isPartOfTriple) {
								singleBacktickCount++;
							}
						}
					}

					// Inline hasCompleteCodeBlock logic
					const tripleBackticks = (line.match(/```/g) || []).length;
					const hasCompleteBlock =
						tripleBackticks > 0 && tripleBackticks % 2 === 0 && line.includes('\n');

					if (singleBacktickCount % 2 === 1 && !hasCompleteBlock) {
						const inlineCodeMatch = line.match(/(`)([^`]*?)$/);
						const contentAfterMarker = inlineCodeMatch?.[2];
						if (contentAfterMarker && !whitespaceOrMarkersPattern.test(contentAfterMarker)) {
							return `${line}\``;
						}
					}
					return line;
				}
			},
			{
				name: 'singleUnderscoreItalic',
				pattern: /[\s\S]*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => handleIncompleteSingleUnderscoreItalic(line)
			},
			{
				name: 'subscript',
				pattern: /~/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => line
			},
			{
				name: 'footnoteRef',
				pattern: /\[\^[^\]\s,]*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => replaceIncompleteFootnoteRefs(line)
			},
			{
				name: 'inlineCitation',
				pattern: /\[/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					let result = line;

					while (true) {
						const unmatchedBrackets: number[] = [];
						const matchedBrackets: number[] = [];
						for (let i = 0; i < result.length; i++) {
							if (result[i] !== '[' || (i > 0 && result[i - 1] === '\\')) {
								continue;
							}

							if (isInsideCodeBlock(result, i) || isWithinCompleteInlineCode(result, i)) {
								continue;
							}

							const candidate = result.substring(i + 1);
							if (
								candidate.includes('|') ||
								candidate.includes('`') ||
								candidate.includes('*') ||
								candidate.includes('(')
							) {
								continue;
							}

							if (result[i + 1] === '^') {
								continue;
							}

							const closingIndex = result.indexOf(']', i + 1);
							if (closingIndex === -1) {
								unmatchedBrackets.push(i);
								continue;
							}

							matchedBrackets.push(i);
						}

						if (unmatchedBrackets.length === 0) {
							return result;
						}

						const current = unmatchedBrackets[0];
						const nextUnmatched = unmatchedBrackets[1] ?? -1;

						if (result[current - 1] === '!') {
							return result;
						}

						let insertionPoint =
							nextUnmatched === -1
								? findEndOfCellOrLineContaining(result, result.length - 1)
								: nextUnmatched;

						const between = nextUnmatched === -1 ? '' : result.slice(current, nextUnmatched);
						const conjunctionMatch = between.match(/\s+and\s+$/);
						if (conjunctionMatch && nextUnmatched !== -1) {
							insertionPoint = current + between.length - conjunctionMatch[0].length;
						}

						result = result.slice(0, insertionPoint) + ']' + result.slice(insertionPoint);

						if (matchedBrackets.length === 0 && nextUnmatched === -1) {
							return result;
						}
					}
				}
			},
			{
				name: 'superscript',
				pattern: /\^/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Inline countSingleCarets logic
					let singleCarets = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '^') {
							const prevChar = i > 0 ? line[i - 1] : '';
							if (prevChar === '\\') continue;
							if (!isWithinFootnoteRef(line, i)) singleCarets++;
						}
					}

					if (singleCarets % 2 === 1) {
						const lastCaretIndex = line.lastIndexOf('^');
						if (
							lastCaretIndex !== -1 &&
							!isWithinMathBlock(line, lastCaretIndex) &&
							!isWithinFootnoteRef(line, lastCaretIndex)
						) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastCaretIndex);
							// Only complete if there's content after the caret
							const contentAfterCaret = line.substring(lastCaretIndex + 1, endOfCellOrLine);
							if (contentAfterCaret.trim().length > 0) {
								return line.substring(0, endOfCellOrLine) + '^' + line.substring(endOfCellOrLine);
							}
						}
					}
					return line;
				}
			},
			{
				name: 'blockMath',
				pattern: /\$\$/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Don't process block boundaries (lines that are just $$)
					if (line.trim() === '$$') return line;

					const dollarPairs = (line.match(/\$\$/g) || []).length;
					if (dollarPairs % 2 === 0) return line;
					const firstDollarIndex = line.indexOf('$$');
					// Only complete if there's content after $$ on the same line (no newline immediately after)
					const hasNewlineAfterStart = line.indexOf('\n', firstDollarIndex) !== -1;
					if (!hasNewlineAfterStart) {
						// Single line case: $$content → $$content$$, with half-closed $$content$ → $$content$$
						if (line.endsWith('$') && !line.endsWith('$$')) {
							return line + '$';
						}
						return line + '$$';
					}
					// Multi-line cases are handled by contextManager
					return line;
				}
			},
			{
				name: 'descriptionList',
				pattern: /^(\s*):/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Check if this is a description list item that needs completion
					const colonMatch = line.match(/^(\s*):(.+)$/);
					if (colonMatch) {
						const [, indent, content] = colonMatch;
						// Only complete if the content doesn't already contain a colon
						if (!content.includes(':')) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, line.length - 1);
							return line.substring(0, endOfCellOrLine) + ':' + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},
			{
				name: 'linksAndImages',
				pattern: /\[/,
				skipInBlockTypes: ['code', 'math'],
				stopProcessingOnChange: true,
				handler: ({ line }) => handleIncompleteLinksAndImages(line)
			},
			{
				name: 'alignmentBlocks',
				pattern: /^(\s*\[(center|right)\])$/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Alignment block closing is handled by the contextManager postprocessor.
					// This plugin is a no-op placeholder to keep pattern-based skip logic intact.
					return line;
				}
			},
			{
				name: 'mdx',
				skipInBlockTypes: ['code', 'math', 'center', 'right'],
				preprocess: ({ text }) => {
					// Track MDX component states across the entire text
					const lines = text.split('\n');
					const openTags: Array<{ tagName: string; lineIndex: number }> = [];
					let mdxLineStates: Array<{ inMdx: boolean; incompletePositions: number[] }> = [];

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						let inMdx = false;
						let incompletePositions: number[] = [];

						// Find all MDX tags in the line
						let searchPos = 0;
						while (searchPos < line.length) {
							// Look for opening bracket with capital letter (MDX component)
							const tagStart = line.indexOf('<', searchPos);
							if (tagStart === -1 || tagStart >= line.length - 1) break;

							const nextChar = line[tagStart + 1];
							// Only match if starts with capital letter (MDX component)
							if (!/[A-Z]/.test(nextChar)) {
								searchPos = tagStart + 1;
								continue;
							}

							// Try to match complete self-closing tag
							const selfClosingMatch = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*\/>/);
							if (selfClosingMatch) {
								searchPos = tagStart + selfClosingMatch[0].length;
								continue;
							}

							// Try to match complete opening tag with immediate closing
							const completeMatch = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>.*?<\/\1>/);
							if (completeMatch) {
								searchPos = tagStart + completeMatch[0].length;
								continue;
							}

							// Try to match opening tag
							const openTagMatch = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>/);
							if (openTagMatch) {
								const tagName = openTagMatch[1];
								openTags.push({ tagName, lineIndex: i });
								inMdx = true;
								searchPos = tagStart + openTagMatch[0].length;
								continue;
							}

							// Check for incomplete self-closing (e.g., <Component /)
							const incompleteSelfClosing = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)[^>]*\/$/);
							if (incompleteSelfClosing) {
								incompletePositions.push(tagStart);
								break; // This is at the end of the line
							}

							// Check for incomplete tag (no closing >) - only at end of line
							const incompleteTag = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?$/);
							if (incompleteTag) {
								incompletePositions.push(tagStart);
								break; // This is at the end of the line
							}

							searchPos = tagStart + 1;
						}

						// Check for closing tags
						const closeTagMatches = line.matchAll(/<\/([A-Z][a-zA-Z0-9]*)>/g);
						for (const closeMatch of closeTagMatches) {
							const tagName = closeMatch[1];
							// Find and remove the matching open tag
							const openIndex = openTags.findIndex((t) => t.tagName === tagName);
							if (openIndex !== -1) {
								openTags.splice(openIndex, 1);
							}
						}

						mdxLineStates[i] = { inMdx, incompletePositions };
					}

					return {
						text,
						state: {
							mdxUnclosedTags: openTags,
							mdxLineStates
						}
					};
				},
				handler: ({ line, state }) => {
					// Remove incomplete MDX syntax (don't render it)
					const lineStates = state.mdxLineStates || [];
					const currentState = lineStates[state.currentLine];

					if (currentState?.incompletePositions && currentState.incompletePositions.length > 0) {
						// Process incomplete positions from right to left to preserve indices
						let result = line;
						for (let i = currentState.incompletePositions.length - 1; i >= 0; i--) {
							const pos = currentState.incompletePositions[i];
							const before = result.substring(0, pos);
							// Simply remove the incomplete MDX tag
							result = before.trimEnd();
						}
						return result;
					}

					return line;
				},
				postprocess: ({ text, state }) => {
					// Complete unclosed MDX components at the end
					const unclosedTags = state.mdxUnclosedTags || [];
					if (unclosedTags.length > 0) {
						// Close tags in reverse order (innermost first)
						let result = text;
						for (let i = unclosedTags.length - 1; i >= 0; i--) {
							result += `\n</${unclosedTags[i].tagName}>`;
						}
						return result;
					}
					return text;
				}
			}
		];
	}
}

// Legacy function for backward compatibility
const defaultPlugins = IncompleteMarkdownParser.createDefaultPlugins();
const defaultParser = new IncompleteMarkdownParser(defaultPlugins);

export const parseIncompleteMarkdown = (text: string): string => {
	if (!text || typeof text !== 'string') {
		return text;
	}

	if (text.trim().length === 0) {
		return '';
	}

	return defaultParser.parse(text);
};

// Utility functions

const findEndOfCellOrLineContaining = (text: string, position: number): number => {
	let endPos = position;
	while (endPos < text.length && text[endPos] !== '\n' && text[endPos] !== '|') {
		endPos++;
	}
	return endPos;
};

const INLINE_CLOSURE_MARKERS = ['***', '**', '__', '~~', '`', '*', '_', '^'] as const;

const findTrailingClosureInsertionPoint = (text: string, fallbackPosition: number): number => {
	let insertionPoint = fallbackPosition;

	while (insertionPoint > 0) {
		const marker = INLINE_CLOSURE_MARKERS.find(
			(candidate) =>
				text.slice(Math.max(0, insertionPoint - candidate.length), insertionPoint) === candidate
		);

		if (!marker) {
			break;
		}

		insertionPoint -= marker.length;
	}

	return insertionPoint;
};

const isWithinMathBlock = (text: string, position: number): boolean => {
	let inInlineMath = false;
	let inBlockMath = false;

	for (let i = 0; i < text.length && i < position; i++) {
		if (text[i] === '\\' && text[i + 1] === '$') {
			i++;
			continue;
		}

		if (text[i] === '$') {
			if (text[i + 1] === '$') {
				inBlockMath = !inBlockMath;
				i++;
				inInlineMath = false;
			} else if (!inBlockMath) {
				inInlineMath = !inInlineMath;
			}
		}
	}

	return inInlineMath || inBlockMath;
};

const isWithinCompleteInlineCode = (text: string, position: number): boolean => {
	let inInlineCode = false;
	let inFencedCode = false;
	let inlineCodeStart = -1;

	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\\' && text[i + 1] === '`') {
			i++;
			continue;
		}

		if (text.slice(i, i + 3) === '```') {
			inFencedCode = !inFencedCode;
			i += 2;
			continue;
		}

		if (inFencedCode || text[i] !== '`') {
			continue;
		}

		if (inInlineCode) {
			if (inlineCodeStart < position && position < i) {
				return true;
			}
			inInlineCode = false;
			inlineCodeStart = -1;
			continue;
		}

		inInlineCode = true;
		inlineCodeStart = i;
	}

	return false;
};

const isWithinFencedCodeBlock = (text: string, position: number): boolean => {
	let inFencedCode = false;

	for (let i = 0; i < text.length && i < position; i++) {
		if (text[i] === '\\' && text[i + 1] === '`') {
			i++;
			continue;
		}

		if (text.slice(i, i + 3) === '```') {
			inFencedCode = !inFencedCode;
			i += 2;
		}
	}

	return inFencedCode;
};

const isWordCharacter = (char: string): boolean => /[\p{L}\p{N}_]/u.test(char);
const isWordChar = (char: string): boolean => isWordCharacter(char);

const whitespaceOrMarkersPattern = /^[\s_~*`]*$/;
const fourOrMoreAsterisksPattern = /^\*{4,}$/;
const boldPattern = /(\*\*)([^*]*\*?)$/;
const italicPattern = /(__)([^_]*?)$/;
const boldItalicPattern = /(\*\*\*)([^*]*?)$/;
const singleAsteriskPattern = /(\*)([^*]*?)$/;
const singleUnderscorePattern = /(_)([^_]*?)$/;
const halfCompleteUnderscorePattern = /(__)([^_]+)_$/;
const halfCompleteTildePattern = /(~~)([^~]+)~$/;
const listItemPattern = /^[\s]*[-*+][\s]+$/;

const isInsideCodeBlock = (text: string, position: number): boolean => {
	let inInlineCode = false;
	let inMultilineCode = false;

	for (let i = 0; i < position; i++) {
		if (text[i] === '\\' && i + 1 < text.length && text[i + 1] === '`') {
			i++;
			continue;
		}

		if (text.slice(i, i + 3) === '```') {
			inMultilineCode = !inMultilineCode;
			i += 2;
			continue;
		}

		if (!inMultilineCode && text[i] === '`') {
			inInlineCode = !inInlineCode;
		}
	}

	return inInlineCode || inMultilineCode;
};

const isWithinLinkOrImageUrl = (text: string, position: number): boolean => {
	for (let i = position - 1; i >= 0; i--) {
		if (text[i] === ')') {
			return false;
		}
		if (text[i] === '(') {
			if (i > 0 && text[i - 1] === ']') {
				for (let j = position; j < text.length; j++) {
					if (text[j] === ')') {
						return true;
					}
					if (text[j] === '\n') {
						return false;
					}
				}
			}
			return false;
		}
		if (text[i] === '\n') {
			return false;
		}
	}

	return false;
};

const isWithinHtmlTag = (text: string, position: number): boolean => {
	for (let i = position - 1; i >= 0; i--) {
		if (text[i] === '>') {
			return false;
		}
		if (text[i] === '<') {
			const nextChar = i + 1 < text.length ? text[i + 1] : '';
			return /[A-Za-z/]/.test(nextChar);
		}
		if (text[i] === '\n') {
			return false;
		}
	}

	return false;
};

const isHorizontalRule = (text: string, markerIndex: number, marker: '*' | '_'): boolean => {
	let lineStart = 0;
	for (let i = markerIndex - 1; i >= 0; i--) {
		if (text[i] === '\n') {
			lineStart = i + 1;
			break;
		}
	}

	let lineEnd = text.length;
	for (let i = markerIndex; i < text.length; i++) {
		if (text[i] === '\n') {
			lineEnd = i;
			break;
		}
	}

	let markerCount = 0;
	for (const char of text.slice(lineStart, lineEnd)) {
		if (char === marker) {
			markerCount++;
			continue;
		}

		if (char !== ' ' && char !== '\t') {
			return false;
		}
	}

	return markerCount >= 3;
};

const shouldSkipAsterisk = (
	text: string,
	index: number,
	prevChar: string,
	nextChar: string
): boolean => {
	if (prevChar === '\\') {
		return true;
	}

	if (text.includes('$') && isWithinMathBlock(text, index)) {
		return true;
	}

	if (prevChar !== '*' && nextChar === '*' && text[index + 2] !== '*') {
		return true;
	}

	if (prevChar === '*') {
		return true;
	}

	if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
		return true;
	}

	const prevIsWhitespace = !prevChar || prevChar === ' ' || prevChar === '\t' || prevChar === '\n';
	const nextIsWhitespace = !nextChar || nextChar === ' ' || nextChar === '\t' || nextChar === '\n';
	return prevIsWhitespace && nextIsWhitespace;
};

const countSingleAsterisks = (text: string): number => {
	let count = 0;
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock || text[i] !== '*') {
			continue;
		}

		const prevChar = i > 0 ? text[i - 1] : '';
		const nextChar = i < text.length - 1 ? text[i + 1] : '';
		if (!shouldSkipAsterisk(text, i, prevChar, nextChar)) {
			count++;
		}
	}

	return count;
};

const shouldSkipUnderscore = (
	text: string,
	index: number,
	prevChar: string,
	nextChar: string
): boolean => {
	if (prevChar === '\\') {
		return true;
	}

	if (text.includes('$') && isWithinMathBlock(text, index)) {
		return true;
	}

	if (isWithinLinkOrImageUrl(text, index) || isWithinHtmlTag(text, index)) {
		return true;
	}

	if (prevChar === '_' || nextChar === '_') {
		return true;
	}

	return Boolean(prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar));
};

const countSingleUnderscores = (text: string): number => {
	let count = 0;
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock || text[i] !== '_') {
			continue;
		}

		const prevChar = i > 0 ? text[i - 1] : '';
		const nextChar = i < text.length - 1 ? text[i + 1] : '';
		if (!shouldSkipUnderscore(text, i, prevChar, nextChar)) {
			count++;
		}
	}

	return count;
};

const countTripleAsterisks = (text: string): number => {
	let count = 0;
	let consecutiveAsterisks = 0;
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			if (consecutiveAsterisks >= 3) {
				count += Math.floor(consecutiveAsterisks / 3);
			}
			consecutiveAsterisks = 0;
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		if (text[i] === '*') {
			consecutiveAsterisks++;
			continue;
		}

		if (consecutiveAsterisks >= 3) {
			count += Math.floor(consecutiveAsterisks / 3);
		}
		consecutiveAsterisks = 0;
	}

	if (consecutiveAsterisks >= 3) {
		count += Math.floor(consecutiveAsterisks / 3);
	}

	return count;
};

const countDoubleAsterisksOutsideCodeBlocks = (text: string): number => {
	let count = 0;
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		if (text[i] === '*' && i + 1 < text.length && text[i + 1] === '*') {
			count++;
			i++;
		}
	}

	return count;
};

const countDoubleUnderscoresOutsideCodeBlocks = (text: string): number => {
	let count = 0;
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		if (text[i] === '_' && i + 1 < text.length && text[i + 1] === '_') {
			count++;
			i++;
		}
	}

	return count;
};

const shouldSkipBoldCompletion = (
	text: string,
	contentAfterMarker: string,
	markerIndex: number
): boolean => {
	if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
		return true;
	}

	const beforeMarker = text.slice(0, markerIndex);
	const lastNewlineBeforeMarker = beforeMarker.lastIndexOf('\n');
	const lineStart = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
	if (
		listItemPattern.test(text.slice(lineStart, markerIndex)) &&
		contentAfterMarker.includes('\n')
	) {
		return true;
	}

	return isHorizontalRule(text, markerIndex, '*');
};

const handleIncompleteBold = (text: string): string => {
	const boldMatch = text.match(boldPattern);
	if (!boldMatch) {
		return text;
	}

	const contentAfterMarker = boldMatch[2];
	const markerIndex = text.lastIndexOf(boldMatch[1]);
	if (
		isInsideCodeBlock(text, markerIndex) ||
		isWithinCompleteInlineCode(text, markerIndex) ||
		shouldSkipBoldCompletion(text, contentAfterMarker, markerIndex)
	) {
		return text;
	}

	const asteriskPairs = countDoubleAsterisksOutsideCodeBlocks(text);
	if (asteriskPairs % 2 === 1) {
		return contentAfterMarker.endsWith('*') ? `${text}*` : `${text}**`;
	}

	return text;
};

const shouldSkipItalicCompletion = (
	text: string,
	contentAfterMarker: string,
	markerIndex: number
): boolean => {
	if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
		return true;
	}

	const beforeMarker = text.slice(0, markerIndex);
	const lastNewlineBeforeMarker = beforeMarker.lastIndexOf('\n');
	const lineStart = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
	if (
		listItemPattern.test(text.slice(lineStart, markerIndex)) &&
		contentAfterMarker.includes('\n')
	) {
		return true;
	}

	return isHorizontalRule(text, markerIndex, '_');
};

const handleIncompleteDoubleUnderscoreItalic = (text: string): string => {
	const italicMatch = text.match(italicPattern);

	if (!italicMatch) {
		const halfCompleteMatch = text.match(halfCompleteUnderscorePattern);
		if (!halfCompleteMatch) {
			return text;
		}

		const markerIndex = text.lastIndexOf(halfCompleteMatch[1]);
		if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
			return text;
		}

		return countDoubleUnderscoresOutsideCodeBlocks(text) % 2 === 1 ? `${text}_` : text;
	}

	const contentAfterMarker = italicMatch[2];
	const markerIndex = text.lastIndexOf(italicMatch[1]);
	if (
		isInsideCodeBlock(text, markerIndex) ||
		isWithinCompleteInlineCode(text, markerIndex) ||
		shouldSkipItalicCompletion(text, contentAfterMarker, markerIndex)
	) {
		return text;
	}

	return countDoubleUnderscoresOutsideCodeBlocks(text) % 2 === 1 ? `${text}__` : text;
};

const findFirstSingleAsteriskIndex = (text: string): number => {
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		if (
			text[i] === '*' &&
			text[i - 1] !== '*' &&
			text[i + 1] !== '*' &&
			text[i - 1] !== '\\' &&
			!isWithinMathBlock(text, i)
		) {
			const prevChar = i > 0 ? text[i - 1] : '';
			const nextChar = i < text.length - 1 ? text[i + 1] : '';
			const prevIsWhitespace =
				!prevChar || prevChar === ' ' || prevChar === '\t' || prevChar === '\n';
			const nextIsWhitespace =
				!nextChar || nextChar === ' ' || nextChar === '\t' || nextChar === '\n';
			if (prevIsWhitespace && nextIsWhitespace) {
				continue;
			}
			if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
				continue;
			}

			return i;
		}
	}

	return -1;
};

const handleIncompleteSingleAsteriskItalic = (text: string): string => {
	if (!text.match(singleAsteriskPattern)) {
		return text;
	}

	const firstSingleAsteriskIndex = findFirstSingleAsteriskIndex(text);
	if (firstSingleAsteriskIndex === -1) {
		return text;
	}

	if (
		isInsideCodeBlock(text, firstSingleAsteriskIndex) ||
		isWithinCompleteInlineCode(text, firstSingleAsteriskIndex)
	) {
		return text;
	}

	const contentAfterFirstAsterisk = text.slice(firstSingleAsteriskIndex + 1);
	if (!contentAfterFirstAsterisk || whitespaceOrMarkersPattern.test(contentAfterFirstAsterisk)) {
		return text;
	}

	return countSingleAsterisks(text) % 2 === 1 ? `${text}*` : text;
};

const findFirstSingleUnderscoreIndex = (text: string): number => {
	let inCodeBlock = false;

	for (let i = 0; i < text.length; i++) {
		if (text.slice(i, i + 3) === '```') {
			inCodeBlock = !inCodeBlock;
			i += 2;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		if (
			text[i] === '_' &&
			text[i - 1] !== '_' &&
			text[i + 1] !== '_' &&
			text[i - 1] !== '\\' &&
			!isWithinMathBlock(text, i) &&
			!isWithinLinkOrImageUrl(text, i)
		) {
			const prevChar = i > 0 ? text[i - 1] : '';
			const nextChar = i < text.length - 1 ? text[i + 1] : '';
			if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
				continue;
			}

			return i;
		}
	}

	return -1;
};

const insertClosingUnderscore = (text: string): string => {
	let endIndex = text.length;
	while (endIndex > 0 && text[endIndex - 1] === '\n') {
		endIndex--;
	}

	return endIndex < text.length ? `${text.slice(0, endIndex)}_${text.slice(endIndex)}` : `${text}_`;
};

const handleTrailingAsterisksForUnderscore = (text: string): string | null => {
	if (!text.endsWith('**')) {
		return null;
	}

	const textWithoutTrailingAsterisks = text.slice(0, -2);
	if (countDoubleAsterisksOutsideCodeBlocks(textWithoutTrailingAsterisks) % 2 !== 1) {
		return null;
	}

	const firstDoubleAsteriskIndex = textWithoutTrailingAsterisks.indexOf('**');
	const underscoreIndex = findFirstSingleUnderscoreIndex(textWithoutTrailingAsterisks);
	if (
		firstDoubleAsteriskIndex !== -1 &&
		underscoreIndex !== -1 &&
		firstDoubleAsteriskIndex < underscoreIndex
	) {
		return `${textWithoutTrailingAsterisks}_**`;
	}

	return null;
};

const handleIncompleteSingleUnderscoreItalic = (text: string): string => {
	if (!text.match(singleUnderscorePattern)) {
		return text;
	}

	const firstSingleUnderscoreIndex = findFirstSingleUnderscoreIndex(text);
	if (firstSingleUnderscoreIndex === -1) {
		return text;
	}

	const contentAfterFirstUnderscore = text.slice(firstSingleUnderscoreIndex + 1);
	if (
		!contentAfterFirstUnderscore ||
		whitespaceOrMarkersPattern.test(contentAfterFirstUnderscore) ||
		isInsideCodeBlock(text, firstSingleUnderscoreIndex) ||
		isWithinCompleteInlineCode(text, firstSingleUnderscoreIndex)
	) {
		return text;
	}

	if (countSingleUnderscores(text) % 2 !== 1) {
		return text;
	}

	return handleTrailingAsterisksForUnderscore(text) ?? insertClosingUnderscore(text);
};

const areBoldItalicMarkersBalanced = (text: string): boolean =>
	countDoubleAsterisksOutsideCodeBlocks(text) % 2 === 0 && countSingleAsterisks(text) % 2 === 0;

const shouldSkipBoldItalicCompletion = (
	text: string,
	contentAfterMarker: string,
	markerIndex: number
): boolean => {
	if (
		!contentAfterMarker ||
		whitespaceOrMarkersPattern.test(contentAfterMarker) ||
		isInsideCodeBlock(text, markerIndex) ||
		isWithinCompleteInlineCode(text, markerIndex)
	) {
		return true;
	}

	return isHorizontalRule(text, markerIndex, '*');
};

const handleIncompleteBoldItalic = (text: string): string => {
	if (fourOrMoreAsterisksPattern.test(text)) {
		return text;
	}

	const boldItalicMatch = text.match(boldItalicPattern);
	if (!boldItalicMatch) {
		return text;
	}

	const contentAfterMarker = boldItalicMatch[2];
	const markerIndex = text.lastIndexOf(boldItalicMatch[1]);
	if (shouldSkipBoldItalicCompletion(text, contentAfterMarker, markerIndex)) {
		return text;
	}

	if (countTripleAsterisks(text) % 2 !== 1) {
		return text;
	}

	return areBoldItalicMarkersBalanced(text) ? text : `${text}***`;
};

const findMatchingOpeningBracket = (text: string, closeIndex: number): number => {
	let depth = 1;
	for (let i = closeIndex - 1; i >= 0; i--) {
		if (text[i] === ']') {
			depth++;
		} else if (text[i] === '[') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
};

const findMatchingClosingBracket = (text: string, openIndex: number): number => {
	let depth = 1;
	for (let i = openIndex + 1; i < text.length; i++) {
		if (text[i] === '[') {
			depth++;
		} else if (text[i] === ']') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
};

const handleIncompleteUrl = (text: string, lastParenIndex: number): string | null => {
	const afterParen = text.slice(lastParenIndex + 2);
	if (afterParen.includes(')')) {
		return null;
	}

	const openBracketIndex = findMatchingOpeningBracket(text, lastParenIndex);
	if (openBracketIndex === -1 || isInsideCodeBlock(text, openBracketIndex)) {
		return null;
	}

	const isImage = openBracketIndex > 0 && text[openBracketIndex - 1] === '!';
	const startIndex = isImage ? openBracketIndex - 1 : openBracketIndex;
	const beforeLink = text.slice(0, startIndex);
	const linkText = text.slice(openBracketIndex + 1, lastParenIndex);

	return isImage
		? `${beforeLink}![${linkText}](streamdown:incomplete-image)`
		: `${beforeLink}[${linkText}](streamdown:incomplete-link)`;
};

const handleIncompleteTextLink = (text: string, index: number): string | null => {
	const isImage = index > 0 && text[index - 1] === '!';
	const openIndex = isImage ? index - 1 : index;
	const closingIndex = findMatchingClosingBracket(text, index);
	const placeholderProtocol = isImage
		? 'streamdown:incomplete-image'
		: 'streamdown:incomplete-link';

	if (closingIndex === -1) {
		return `${text}](${placeholderProtocol})`;
	}

	const afterClosing = text.slice(closingIndex + 1);
	if (afterClosing.startsWith('(')) {
		return null;
	}

	if (afterClosing.trim().length === 0) {
		const linkText = text.slice(index + 1, closingIndex);
		const beforeLink = text.slice(0, openIndex);
		const shouldRecoverAsLink = isImage || linkText.includes('[') || /[*_~`]/.test(linkText);

		if (!shouldRecoverAsLink) {
			return null;
		}

		const hasOuterBracketTakingPrecedence = Array.from({ length: index }, (_, i) => i).some(
			(i) =>
				text[i] === '[' &&
				!isInsideCodeBlock(text, i) &&
				(() => {
					const outerClosingIndex = findMatchingClosingBracket(text, i);
					return outerClosingIndex === -1 || outerClosingIndex > closingIndex;
				})()
		);

		if (hasOuterBracketTakingPrecedence) {
			return null;
		}

		return isImage
			? `${beforeLink}![${linkText}](${placeholderProtocol})`
			: `${beforeLink}[${linkText}](${placeholderProtocol})`;
	}

	return null;
};

const handleIncompleteLinksAndImages = (text: string): string => {
	const lastParenIndex = text.lastIndexOf('](');
	if (lastParenIndex !== -1 && !isInsideCodeBlock(text, lastParenIndex)) {
		const result = handleIncompleteUrl(text, lastParenIndex);
		if (result !== null) {
			return result;
		}
	}

	for (let i = text.length - 1; i >= 0; i--) {
		if (text[i] === '[' && !isInsideCodeBlock(text, i)) {
			const result = handleIncompleteTextLink(text, i);
			if (result !== null) {
				return result;
			}
		}
	}

	return text;
};

const handleIncompleteStrikethrough = (text: string): string => {
	const strikethroughMatch = text.match(/(~~)([^~]*?)$/);
	if (strikethroughMatch) {
		const contentAfterMarker = strikethroughMatch[2];
		if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
			return text;
		}

		const markerIndex = text.lastIndexOf(strikethroughMatch[1]);
		if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
			return text;
		}

		return (text.match(/~~/g)?.length ?? 0) % 2 === 1 ? `${text}~~` : text;
	}

	const halfCompleteMatch = text.match(halfCompleteTildePattern);
	if (!halfCompleteMatch) {
		return text;
	}

	const markerIndex = text.lastIndexOf(halfCompleteMatch[1]);
	if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
		return text;
	}

	return (text.match(/~~/g)?.length ?? 0) % 2 === 1 ? `${text}~` : text;
};

const escapeSingleTildes = (text: string): string => {
	let result = '';

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char !== '~') {
			result += char;
			continue;
		}

		const prevChar = i > 0 ? text[i - 1] : '';
		const nextChar = i < text.length - 1 ? text[i + 1] : '';
		const isSingleTilde = prevChar !== '~' && nextChar !== '~';
		const shouldEscape =
			isSingleTilde &&
			prevChar !== '\\' &&
			prevChar !== '' &&
			nextChar !== '' &&
			isWordCharacter(prevChar) &&
			isWordCharacter(nextChar) &&
			!isWithinCompleteInlineCode(text, i) &&
			!isWithinMathBlock(text, i);

		result += shouldEscape ? '\\~' : '~';
	}

	return result;
};

const stripTrailingIncompleteHtmlTag = (text: string): string => {
	const trimmedText = text.trimEnd();
	const lastOpeningBracketIndex = trimmedText.lastIndexOf('<');

	if (lastOpeningBracketIndex === -1 || trimmedText.includes('>', lastOpeningBracketIndex)) {
		return text;
	}

	if (
		isWithinCompleteInlineCode(trimmedText, lastOpeningBracketIndex) ||
		isWithinFencedCodeBlock(trimmedText, lastOpeningBracketIndex) ||
		isWithinMathBlock(trimmedText, lastOpeningBracketIndex)
	) {
		return text;
	}

	const candidate = trimmedText.slice(lastOpeningBracketIndex);
	if (!/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^<>]*)?$/.test(candidate)) {
		return text;
	}

	return trimmedText.slice(0, lastOpeningBracketIndex).trimEnd();
};

const isWithinFootnoteRef = (text: string, position: number): boolean => {
	let openBracketPos = -1;
	let caretPos = -1;

	for (let i = position; i >= 0; i--) {
		if (text[i] === ']') return false;
		if (text[i] === '^' && caretPos === -1) caretPos = i;
		if (text[i] === '[') {
			openBracketPos = i;
			break;
		}
	}

	if (openBracketPos !== -1 && caretPos === openBracketPos + 1 && position >= caretPos) {
		for (let i = position + 1; i < text.length; i++) {
			if (text[i] === ']') return true;
			if (text[i] === '[' || text[i] === '\n') break;
		}
	}

	return false;
};

const replaceIncompleteFootnoteRefs = (line: string): string => {
	const matches = line.matchAll(/\[\^[^\]\s,]*/g);
	let result = '';
	let lastIndex = 0;
	let foundMatch = false;

	for (const match of matches) {
		if (match.index === undefined) {
			continue;
		}

		foundMatch = true;
		const start = match.index;
		const end = start + match[0].length;

		result += line.slice(lastIndex, start);
		result += line[end] === ']' ? match[0] : '[^streamdown:footnote]';
		lastIndex = end;
	}

	return foundMatch ? result + line.slice(lastIndex) : line;
};

// Export the class and interfaces
