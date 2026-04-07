import type { Component } from 'svelte';
import type { LanguageInfo } from '../utils/bundledLanguages.js';
import type { CjkPlugin } from '../plugins/cjk-shared.js';
import type {
	CodeHighlighterPlugin,
	DiagramPlugin,
	HighlightOptions,
	HighlightResult,
	HighlightToken,
	LanguageDefinition,
	MathPlugin,
	MathPluginOptions,
	MermaidInstance,
	MermaidPluginOptions,
	ThemeInput
} from '../../../shared/plugin-core/contracts.js';

export type {
	CodeHighlighterPlugin,
	DiagramPlugin,
	HighlightOptions,
	HighlightResult,
	HighlightToken,
	LanguageDefinition,
	MathPlugin,
	MathPluginOptions,
	MermaidInstance,
	MermaidPluginOptions,
	ThemeInput
};

export type CustomRendererProps = {
	code: string;
	isIncomplete: boolean;
	language: string;
	meta?: string;
};

export interface CustomRenderer {
	component: Component<CustomRendererProps>;
	language: string | string[];
}

export interface PluginConfig {
	cjk?: CjkPlugin;
	code?: CodeHighlighterPlugin;
	math?: MathPlugin;
	mermaid?: DiagramPlugin;
	renderers?: CustomRenderer[];
}

export interface CodePluginOptions {
	themes?: [ThemeInput, ThemeInput];
	languages?: LanguageInfo[];
}
