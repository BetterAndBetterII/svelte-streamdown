import { ThemeRegistration } from 'shiki';

type ThemeInput = string | ThemeRegistration;
interface HighlightToken {
    bgColor?: string;
    color?: string;
    content: string;
}
interface HighlightResult {
    bg?: string;
    fg?: string;
    rootStyle?: string | false;
    tokens: HighlightToken[][];
}
interface HighlightOptions {
    code: string;
    language: string;
    themes: [ThemeInput, ThemeInput];
}
interface CodeHighlighterPlugin {
    getSupportedLanguages: () => string[];
    getThemes: () => [ThemeInput, ThemeInput];
    highlight: (options: HighlightOptions, callback?: (result: HighlightResult) => void) => HighlightResult | null;
    name: 'shiki';
    supportsLanguage: (language: string) => boolean;
    type: 'code-highlighter';
}

interface CodePluginOptions {
    themes?: [ThemeInput, ThemeInput];
}
declare const createCodePlugin: (options?: CodePluginOptions) => CodeHighlighterPlugin;
declare const code: CodeHighlighterPlugin;

export { type CodeHighlighterPlugin, type CodePluginOptions, type HighlightOptions, type HighlightResult, type HighlightToken, type ThemeInput, code, createCodePlugin };
