export interface Plugin {
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

export declare class IncompleteMarkdownParser {
	private plugins;
	private state;
	setState: (state: Partial<ParseState>) => void;
	constructor(plugins?: Plugin[]);
	parse(text: string): string;
	static createDefaultPlugins(): Plugin[];
}

export declare const parseIncompleteMarkdown: (text: string) => string;
