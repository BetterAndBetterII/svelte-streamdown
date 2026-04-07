"use client";

import { bundledLanguagesInfo } from "../../shared/plugin-core/bundled-languages.js";
import {
	createCodePlugin as createSharedCodePlugin,
	type CodeHighlighterPlugin,
	type HighlightOptions,
	type HighlightResult,
	type HighlightToken,
	type ThemeInput
} from "../../shared/plugin-core/code.js";

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
