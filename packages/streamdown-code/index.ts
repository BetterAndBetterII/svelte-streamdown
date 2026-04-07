"use client";

import { bundledLanguagesInfo } from "@streamdown-svelte/plugin-core";
import {
	createCodePlugin as createSharedCodePlugin,
	type CodeHighlighterPlugin,
	type HighlightOptions,
	type HighlightResult,
	type HighlightToken,
	type ThemeInput
} from "@streamdown-svelte/plugin-core";

export type {
	CodeHighlighterPlugin,
	HighlightOptions,
	HighlightResult,
	HighlightToken,
	ThemeInput
};

export interface CodePluginOptions {
	themes?: [ThemeInput, ThemeInput];
}

export const createCodePlugin = (options: CodePluginOptions = {}): CodeHighlighterPlugin =>
	createSharedCodePlugin({
		languages: bundledLanguagesInfo,
		themes: options.themes
	});

export const code = createCodePlugin();
