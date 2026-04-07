import type { Tokens } from 'marked';
import { createMarkedMathExtensions } from './marked/marked-math.js';
import type { Extension } from './marked/index.js';
export { cjk, createCjkPlugin, type CjkPlugin } from './plugins/cjk-shared.js';
import {
	createCodePlugin as createSharedCodePlugin,
	createMathPlugin as createSharedMathPlugin,
	createMermaidPlugin as createSharedMermaidPlugin,
	getThemeName
} from '@streamdown-svelte/plugin-core';
import type {
	CodeHighlighterPlugin,
	CodePluginOptions,
	CustomRenderer,
	CustomRendererProps,
	DiagramPlugin,
	HighlightOptions,
	MathPlugin,
	MathPluginOptions,
	MermaidInstance,
	MermaidPluginOptions,
	PluginConfig,
	ThemeInput
} from './contracts/plugins.js';
import {
	bundledLanguagesInfo
} from './utils/bundledLanguages.js';
export type {
	CodeHighlighterPlugin,
	CodePluginOptions,
	CustomRenderer,
	CustomRendererProps,
	DiagramPlugin,
	HighlightOptions,
	HighlightResult,
	HighlightToken,
	MathPlugin,
	MathPluginOptions,
	MermaidInstance,
	MermaidPluginOptions,
	PluginConfig,
	ThemeInput
} from './contracts/plugins.js';
export { getThemeName };

const CJK_AUTOLINK_BOUNDARY_CHARS = '[。．，、？！：；）】」』〉》]';
const CJK_AUTOLINK_PREFIX_CHARS = '(^|[\\s（【「『〈《：])';
const CJK_AUTOLINK_PATTERN = new RegExp(
	`${CJK_AUTOLINK_PREFIX_CHARS}((?:https?:\\/\\/|mailto:)[^\\s<>。．，、？！：；（）【】「」『』〈〉《》]+)(?=${CJK_AUTOLINK_BOUNDARY_CHARS})`,
	'gu'
);

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

export function resolveParserExtensions(
	extensions: Extension[] | undefined,
	plugins: PluginConfig | undefined
): Extension[] | undefined {
	const singleDollarTextMath = getMathPluginOptions(plugins?.math).singleDollarTextMath;
	if (!singleDollarTextMath) {
		return extensions;
	}

	if (extensions?.some((extension) => extension.name === 'math')) {
		return extensions;
	}

	return [...createMarkedMathExtensions({ singleDollarTextMath: true }), ...(extensions ?? [])];
}

export function createCodePlugin(options: CodePluginOptions = {}): CodeHighlighterPlugin {
	return createSharedCodePlugin({
		themes: options.themes,
		languages: options.languages ?? bundledLanguagesInfo
	});
}

export function createMathPlugin(options: MathPluginOptions = {}): MathPlugin {
	return createSharedMathPlugin(options);
}

export function createMermaidPlugin(options: MermaidPluginOptions = {}): DiagramPlugin {
	return createSharedMermaidPlugin(options);
}

export const code = /* @__PURE__ */ createCodePlugin();
export const math = /* @__PURE__ */ createMathPlugin();
export const mermaid = /* @__PURE__ */ createMermaidPlugin();
