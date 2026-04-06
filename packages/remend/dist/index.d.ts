export { isWithinCodeBlock, isWithinLinkOrImageUrl, isWithinMathBlock, isWordChar } from './utils.js';

interface Plugin {
	name: string;
	pattern?: RegExp;
	handler?: (payload: HandlerPayload) => string;
	skipInBlockTypes?: string[];
	stopProcessingOnChange?: boolean | ((previousLine: string, nextLine: string) => boolean);
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

declare class IncompleteMarkdownParser {
	private plugins;
	private state;
	setState: (state: Partial<ParseState>) => void;
	constructor(plugins?: Plugin[]);
	parse(text: string): string;
	static createDefaultPlugins(): Plugin[];
}

declare const parseIncompleteMarkdown: (text: string) => string;

type LinkMode = "protocol" | "text-only";

/**
 * Handler function that transforms text during streaming.
 */
interface RemendHandler {
    /** Handler function: takes text, returns modified text */
    handle: (text: string) => string;
    /** Unique identifier for this handler */
    name: string;
    /** Priority (lower runs first). Built-in priorities: 0-100. Default: 100 */
    priority?: number;
}
/**
 * Configuration options for the remend function.
 * Options default to `true` unless noted otherwise.
 * Set an option to `false` to disable that specific completion.
 */
interface RemendOptions {
    /** Complete bold formatting (e.g., `**text` → `**text**`) */
    bold?: boolean;
    /** Complete bold-italic formatting (e.g., `***text` → `***text***`) */
    boldItalic?: boolean;
    /** Escape > as comparison operators in list items (e.g., `- > 25` → `- \> 25`) */
    comparisonOperators?: boolean;
    /** Custom handlers to extend remend */
    handlers?: RemendHandler[];
    /** Strip incomplete HTML tags at end of streaming text (e.g., `text <custom` → `text`) */
    htmlTags?: boolean;
    /** Complete images (e.g., `![alt](url` → removed) */
    images?: boolean;
    /** Complete inline code formatting (e.g., `` `code `` → `` `code` ``) */
    inlineCode?: boolean;
    /**
     * Complete inline KaTeX math (e.g., `$equation` → `$equation$`).
     * Defaults to `false` — single `$` is ambiguous with currency symbols.
     */
    inlineKatex?: boolean;
    /** Complete italic formatting (e.g., `*text` → `*text*` or `_text` → `_text_`) */
    italic?: boolean;
    /** Complete block KaTeX math (e.g., `$$equation` → `$$equation$$`) */
    katex?: boolean;
    /**
     * How to handle incomplete links:
     * - `'protocol'`: Use `streamdown:incomplete-link` placeholder URL (default)
     * - `'text-only'`: Display only the link text without any link markup
     */
    linkMode?: "protocol" | "text-only";
    /** Complete links and images (e.g., `[text](url` → `[text](streamdown:incomplete-link)`) */
    links?: boolean;
    /** Handle incomplete setext headings to prevent misinterpretation */
    setextHeadings?: boolean;
    /** Escape single ~ between word characters to prevent false strikethrough (e.g., `20~25` → `20\~25`) */
    singleTilde?: boolean;
    /** Complete strikethrough formatting (e.g., `~~text` → `~~text~~`) */
    strikethrough?: boolean;
}
declare const remend: (text: string, options?: RemendOptions) => string;

export { IncompleteMarkdownParser, type LinkMode, type Plugin, type RemendHandler, type RemendOptions, remend as default, parseIncompleteMarkdown };
