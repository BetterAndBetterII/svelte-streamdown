import type { MermaidConfig } from 'mermaid';
import type { Component } from 'svelte';
import type { ThemeRegistration } from 'shiki';
import type { Pluggable } from 'unified';
import type { Tokens } from 'marked';
import { HighlighterManager } from './utils/hightlighter.svelte.js';
import {
	bundledLanguagesInfo,
	createLanguageSet,
	type LanguageInfo
} from './utils/bundledLanguages.js';

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

export interface CjkPlugin {
	name: 'cjk';
	remarkPlugins: Pluggable[];
	remarkPluginsAfter: Pluggable[];
	remarkPluginsBefore: Pluggable[];
	type: 'cjk';
}

export interface CustomRendererProps {
	code: string;
	isIncomplete: boolean;
	language: string;
	meta?: string;
}

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

export interface MathPluginOptions {
	errorColor?: string;
	singleDollarTextMath?: boolean;
}

export interface MermaidPluginOptions {
	config?: MermaidConfig;
}

const supportedLanguages = createLanguageSet(bundledLanguagesInfo);

const noopPluggable = () => undefined;

const CJK_AUTOLINK_BOUNDARY_CHARS = '[。．，、？！：；）】」』〉》]';
const CJK_AUTOLINK_PREFIX_CHARS = '(^|[\\s（【「『〈《：])';
const CJK_AUTOLINK_PATTERN = new RegExp(
	`${CJK_AUTOLINK_PREFIX_CHARS}((?:https?:\\/\\/|mailto:)[^\\s<>。．，、？！：；（）【】「」『』〈〉《》]+)(?=${CJK_AUTOLINK_BOUNDARY_CHARS})`,
	'gu'
);

const defaultMermaidConfig: MermaidConfig = {
	startOnLoad: false,
	theme: 'default',
	securityLevel: 'strict',
	fontFamily: 'monospace',
	suppressErrorRendering: true
};

function themeName(theme: ThemeInput): string {
	return typeof theme === 'string' ? theme : (theme.name ?? 'custom-theme');
}

function normalizeLanguage(language: string): string {
	return language.trim().toLowerCase();
}

function normalizeHighlightResult(tokens: HighlightToken[][]): HighlightResult {
	return { tokens };
}

function extractAdditionalThemes(
	themes: [ThemeInput, ThemeInput]
): Record<string, ThemeRegistration> {
	const registrations = themes.filter(
		(theme): theme is ThemeRegistration => typeof theme !== 'string'
	);

	return Object.fromEntries(registrations.map((theme) => [themeName(theme), theme]));
}

function resolvePreferredTheme(themes: [ThemeInput, ThemeInput]): string {
	if (
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-color-scheme: dark)').matches
	) {
		return themeName(themes[1]);
	}

	return themeName(themes[0]);
}

export function getThemeName(theme: ThemeInput): string {
	return themeName(theme);
}

export function extractCodeFenceMeta(token: Tokens.Code): string | undefined {
	const firstLine = token.raw.split('\n', 1)[0]?.trimEnd() ?? '';
	if (!firstLine.startsWith('```')) {
		const language = token.lang?.trim() ?? '';
		const parts = language.split(/\s+/);
		return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
	}

	const fenceContent = firstLine.slice(3).trim();
	if (!fenceContent) {
		const language = token.lang?.trim() ?? '';
		const parts = language.split(/\s+/);
		return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
	}

	const language = extractCodeFenceLanguage(token);
	if (!language || fenceContent === language) {
		const langValue = token.lang?.trim() ?? '';
		const parts = langValue.split(/\s+/);
		return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
	}

	const meta = fenceContent.startsWith(language)
		? fenceContent.slice(language.length).trim()
		: fenceContent;

	return meta.length > 0 ? meta : undefined;
}

export function extractCodeFenceLanguage(token: Tokens.Code): string {
	const langValue = token.lang?.trim() ?? '';
	if (langValue) {
		return langValue.split(/\s+/, 1)[0] ?? '';
	}

	const firstLine = token.raw.split('\n', 1)[0]?.trimEnd() ?? '';
	if (!firstLine.startsWith('```')) {
		return '';
	}

	const fenceContent = firstLine.slice(3).trim();
	if (!fenceContent) {
		return '';
	}

	return fenceContent.split(/\s+/, 1)[0] ?? token.lang ?? '';
}

export function findCustomRenderer(
	renderers: CustomRenderer[] | undefined,
	language: string | undefined
): CustomRenderer | null {
	if (!(renderers && language)) {
		return null;
	}

	return (
		renderers.find((renderer) =>
			Array.isArray(renderer.language)
				? renderer.language.includes(language)
				: renderer.language === language
		) ?? null
	);
}

export function getMathPluginOptions(plugin: MathPlugin | undefined): Required<MathPluginOptions> {
	const defaultOptions = {
		errorColor: 'var(--color-muted-foreground)',
		singleDollarTextMath: false
	};

	if (!plugin) {
		return defaultOptions;
	}

	const remarkOptions =
		Array.isArray(plugin.remarkPlugin) && typeof plugin.remarkPlugin[1] === 'object'
			? (plugin.remarkPlugin[1] as Partial<MathPluginOptions>)
			: {};
	const rehypeOptions =
		Array.isArray(plugin.rehypePlugin) && typeof plugin.rehypePlugin[1] === 'object'
			? (plugin.rehypePlugin[1] as Partial<MathPluginOptions>)
			: {};

	return {
		errorColor: rehypeOptions.errorColor ?? defaultOptions.errorColor,
		singleDollarTextMath: remarkOptions.singleDollarTextMath ?? defaultOptions.singleDollarTextMath
	};
}

export function applyPluginMarkdownTransforms(
	markdown: string,
	plugins: PluginConfig | undefined
): string {
	if (!plugins?.cjk) {
		return markdown;
	}

	return markdown.replace(CJK_AUTOLINK_PATTERN, (_match, prefix: string, url: string) => {
		return `${prefix}<${url}>`;
	});
}

export function createCodePlugin(options: CodePluginOptions = {}): CodeHighlighterPlugin {
	const themes = options.themes ?? ['github-light', 'github-dark'];
	const languages = options.languages ?? bundledLanguagesInfo;
	const supported = createLanguageSet(languages);
	let highlighter: HighlighterManager | null = null;

	const getHighlighter = () => {
		highlighter ??= HighlighterManager.create(
			languages,
			extractAdditionalThemes(themes),
			options.languages
		);
		return highlighter;
	};

	return {
		name: 'shiki',
		type: 'code-highlighter',
		getSupportedLanguages() {
			return [...supported].sort((left, right) => left.localeCompare(right));
		},
		getThemes() {
			return themes;
		},
		supportsLanguage(language: string) {
			return supported.has(normalizeLanguage(language));
		},
		highlight({ code, language }, callback) {
			const activeTheme = resolvePreferredTheme(themes);
			const activeHighlighter = getHighlighter();
			const produce = () =>
				normalizeHighlightResult(
					activeHighlighter.highlightCode(code, normalizeLanguage(language), activeTheme)
				);

			if (!activeHighlighter.isReady(activeTheme, normalizeLanguage(language))) {
				void activeHighlighter.load(activeTheme, normalizeLanguage(language)).then(() => {
					callback?.(produce());
				});
				return null;
			}

			return produce();
		}
	};
}

export function createMathPlugin(options: MathPluginOptions = {}): MathPlugin {
	return {
		name: 'katex',
		type: 'math',
		remarkPlugin: [noopPluggable, { singleDollarTextMath: options.singleDollarTextMath ?? false }],
		rehypePlugin: [
			noopPluggable,
			{ errorColor: options.errorColor ?? 'var(--color-muted-foreground)' }
		],
		getStyles() {
			return 'katex/dist/katex.min.css';
		}
	};
}

export function createMermaidPlugin(options: MermaidPluginOptions = {}): DiagramPlugin {
	let initialized = false;
	let currentConfig: MermaidConfig = { ...defaultMermaidConfig, ...options.config };

	return {
		name: 'mermaid',
		type: 'diagram',
		language: 'mermaid',
		getMermaid(config?: MermaidConfig) {
			if (config) {
				currentConfig = { ...defaultMermaidConfig, ...options.config, ...config };
			}

			return {
				initialize(mermaidConfig: MermaidConfig) {
					currentConfig = { ...defaultMermaidConfig, ...options.config, ...mermaidConfig };
					initialized = true;
				},
				async render(id: string, source: string) {
					const mermaid = (await import('mermaid')).default;
					if (!initialized) {
						mermaid.initialize(currentConfig);
						initialized = true;
					}
					return mermaid.render(id, source);
				}
			};
		}
	};
}

export function createCjkPlugin(): CjkPlugin {
	const remarkPluginsBefore: Pluggable[] = [noopPluggable];
	const remarkPluginsAfter: Pluggable[] = [noopPluggable, noopPluggable];

	return {
		name: 'cjk',
		type: 'cjk',
		remarkPluginsBefore,
		remarkPluginsAfter,
		remarkPlugins: [...remarkPluginsBefore, ...remarkPluginsAfter]
	};
}

export const code = createCodePlugin();
export const math = createMathPlugin();
export const mermaid = createMermaidPlugin();
export const cjk = createCjkPlugin();
