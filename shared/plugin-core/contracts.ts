import type { MermaidConfig } from 'mermaid';
import type { ThemeRegistration } from 'shiki';
import type { Pluggable } from 'unified';

export type ThemeInput = string | ThemeRegistration;

export interface HighlightToken {
	bgColor?: string;
	color?: string;
	content: string;
}

export interface HighlightResult {
	bg?: string;
	fg?: string;
	rootStyle?: string | false;
	tokens: HighlightToken[][];
}

export interface HighlightOptions {
	code: string;
	language: string;
	themes: [ThemeInput, ThemeInput];
}

export interface CodeHighlighterPlugin {
	getSupportedLanguages: () => string[];
	getThemes: () => [ThemeInput, ThemeInput];
	highlight: (
		options: HighlightOptions,
		callback?: (result: HighlightResult) => void
	) => HighlightResult | null;
	name: 'shiki';
	supportsLanguage: (language: string) => boolean;
	type: 'code-highlighter';
}

export interface MermaidInstance {
	initialize: (config: MermaidConfig) => void;
	render: (id: string, source: string) => Promise<{ svg: string }>;
}

export interface MermaidModule {
	initialize: (config: MermaidConfig) => void;
	render: (id: string, source: string) => Promise<{ svg: string }>;
}

export type MermaidModuleLoader = () => Promise<MermaidModule | { default: MermaidModule }>;

export interface DiagramPlugin {
	getMermaid: (config?: MermaidConfig) => MermaidInstance;
	language: string;
	name: 'mermaid';
	type: 'diagram';
}

export interface MathPlugin {
	getStyles?: () => string;
	name: 'katex';
	reason?: string;
	rehypePlugin: Pluggable;
	remarkPlugin: Pluggable;
	type: 'math';
}

export interface MathPluginOptions {
	errorColor?: string;
	singleDollarTextMath?: boolean;
}

export interface MermaidPluginOptions {
	config?: MermaidConfig;
	loadMermaid?: MermaidModuleLoader;
}

export interface LanguageDefinition {
	aliases?: string[];
	id: string;
	import: () => Promise<unknown>;
}
