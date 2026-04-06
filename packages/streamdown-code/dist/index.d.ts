import { BundledTheme, ThemeRegistrationAny, TokensResult, BundledLanguage } from 'shiki';

type ThemeInput = BundledTheme | ThemeRegistrationAny;
/**
 * Result from code highlighting
 */
type HighlightResult = TokensResult;
/**
 * Options for highlighting code
 */
interface HighlightOptions {
    code: string;
    language: BundledLanguage;
    themes: [ThemeInput, ThemeInput];
}
/**
 * Plugin for code syntax highlighting (Shiki)
 */
interface CodeHighlighterPlugin {
    /**
     * Get list of supported languages
     */
    getSupportedLanguages: () => BundledLanguage[];
    /**
     * Get the configured themes
     */
    getThemes: () => [ThemeInput, ThemeInput];
    /**
     * Highlight code and return tokens
     * Returns null if highlighting not ready yet (async loading)
     * Use callback for async result
     */
    highlight: (options: HighlightOptions, callback?: (result: HighlightResult) => void) => HighlightResult | null;
    name: "shiki";
    /**
     * Check if language is supported
     */
    supportsLanguage: (language: BundledLanguage) => boolean;
    type: "code-highlighter";
}
/**
 * Options for creating a code plugin
 */
interface CodePluginOptions {
    /**
     * Default themes for syntax highlighting [light, dark]
     * @default ["github-light", "github-dark"]
     */
    themes?: [ThemeInput, ThemeInput];
}
/**
 * Create a code plugin with optional configuration
 */
declare function createCodePlugin(options?: CodePluginOptions): CodeHighlighterPlugin;
/**
 * Pre-configured code plugin with default settings
 */
declare const code: CodeHighlighterPlugin;

export { type CodeHighlighterPlugin, type CodePluginOptions, type HighlightOptions, type HighlightResult, type ThemeInput, code, createCodePlugin };
