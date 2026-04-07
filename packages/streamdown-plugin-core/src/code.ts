import type { ThemeRegistration } from 'shiki';
import type { HighlighterCore } from 'shiki/core';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';
import type {
	CodeHighlighterPlugin,
	HighlightResult,
	LanguageDefinition,
	ThemeInput
} from './contracts.js';

const jsEngine = createJavaScriptRegexEngine({ forgiving: true });
const DEFAULT_THEMES = ['github-light', 'github-dark'] as const;
const PLAINTEXT_LANGUAGE = 'text';
const BUILTIN_THEME_REGISTRATIONS: Record<string, ThemeRegistration> = {
	'github-dark': githubDark,
	'github-light': githubLight
};

const themeName = (theme: ThemeInput): string =>
	typeof theme === 'string' ? theme : (theme.name ?? 'custom-theme');

const normalizeLanguage = (language: string): string => language.trim().toLowerCase();

const getPreferredTheme = (themes: [ThemeInput, ThemeInput]): ThemeInput => {
	if (
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-color-scheme: dark)').matches
	) {
		return themes[1];
	}

	return themes[0];
};

const resolveActiveTheme = ({
	activeTheme,
	themes
}: {
	activeTheme?: ThemeInput;
	themes: [ThemeInput, ThemeInput];
}): ThemeInput => activeTheme ?? getPreferredTheme(themes);

const toPlaintextTokens = (code: string): HighlightResult => ({
	tokens: code.split('\n').map((line) => [
		{
			content: line,
			color: undefined,
			bgColor: undefined
		}
	])
});

const resolveThemeRegistration = (
	theme: ThemeInput,
	additionalThemes: Record<string, ThemeRegistration>
): ThemeRegistration | null => {
	if (typeof theme !== 'string') {
		return theme;
	}

	return additionalThemes[theme] ?? BUILTIN_THEME_REGISTRATIONS[theme] ?? null;
};

type Highlighter = HighlighterCore;

type LoadStatus = Promise<void> | true | false;

class PluginHighlighterRuntime {
	private readonly additionalThemes: Record<string, ThemeRegistration>;
	private readonly aliasToId = new Map<string, string>();
	private readonly languageLoaders = new Map<string, () => Promise<unknown>>();
	private readonly supportedLanguages = new Set<string>();
	private readonly loadedLanguages = new Map<string, LoadStatus>();
	private readonly loadedThemes = new Map<string, LoadStatus>();
	private highlighter: Highlighter | Promise<Highlighter> | null = null;

	constructor(languages: readonly LanguageDefinition[], themes: [ThemeInput, ThemeInput]) {
		this.additionalThemes = Object.fromEntries(
			themes
				.filter((theme): theme is ThemeRegistration => typeof theme !== 'string')
				.map((theme) => [themeName(theme), theme])
		);

		for (const language of languages) {
			const canonicalId = normalizeLanguage(language.id);
			this.supportedLanguages.add(canonicalId);
			this.aliasToId.set(canonicalId, canonicalId);
			this.languageLoaders.set(canonicalId, language.import);

			for (const alias of language.aliases ?? []) {
				const normalizedAlias = normalizeLanguage(alias);
				this.supportedLanguages.add(normalizedAlias);
				this.aliasToId.set(normalizedAlias, canonicalId);
				this.languageLoaders.set(normalizedAlias, language.import);
			}
		}
	}

	getSupportedLanguages(): string[] {
		return [...this.supportedLanguages].sort((left, right) => left.localeCompare(right));
	}

	supportsLanguage(language: string): boolean {
		return this.supportedLanguages.has(normalizeLanguage(language));
	}

	private resolveLanguage(language: string | undefined): string | undefined {
		if (!language) {
			return undefined;
		}

		return this.aliasToId.get(normalizeLanguage(language));
	}

	private async loadHighlighter(): Promise<Highlighter> {
		if (this.highlighter instanceof Promise) {
			return this.highlighter;
		}

		if (this.highlighter) {
			return this.highlighter;
		}

		this.highlighter = createHighlighterCore({
			themes: [],
			langs: [],
			engine: jsEngine
		});

		this.highlighter = await this.highlighter;
		return this.highlighter;
	}

	private async ensureTheme(theme: ThemeInput): Promise<string | null> {
		const resolvedThemeName = themeName(theme);
		const loaded = this.loadedThemes.get(resolvedThemeName);
		if (loaded === true) {
			return resolvedThemeName;
		}
		if (loaded instanceof Promise) {
			await loaded;
			return this.loadedThemes.get(resolvedThemeName) === true ? resolvedThemeName : null;
		}
		if (loaded === false) {
			return null;
		}

		const themeRegistration = resolveThemeRegistration(theme, this.additionalThemes);
		if (!themeRegistration) {
			this.loadedThemes.set(resolvedThemeName, false);
			return null;
		}

		const loadingPromise = (async () => {
			const highlighter = await this.loadHighlighter();
			await highlighter.loadTheme(themeRegistration as never);
		})()
			.then(() => {
				this.loadedThemes.set(resolvedThemeName, true);
			})
			.catch((error) => {
				this.loadedThemes.set(resolvedThemeName, false);
				throw error;
			});

		this.loadedThemes.set(resolvedThemeName, loadingPromise);
		await loadingPromise;
		return resolvedThemeName;
	}

	private async ensureLanguage(language: string | undefined): Promise<string | undefined> {
		const resolvedLanguage = this.resolveLanguage(language);
		if (!resolvedLanguage) {
			return undefined;
		}

		const loaded = this.loadedLanguages.get(resolvedLanguage);
		if (loaded === true) {
			return resolvedLanguage;
		}
		if (loaded instanceof Promise) {
			await loaded;
			return this.loadedLanguages.get(resolvedLanguage) === true ? resolvedLanguage : undefined;
		}
		if (loaded === false) {
			return undefined;
		}

		const loader = this.languageLoaders.get(resolvedLanguage);
		if (!loader) {
			this.loadedLanguages.set(resolvedLanguage, false);
			return undefined;
		}

		const loadingPromise = (async () => {
			const highlighter = await this.loadHighlighter();
			const loadedModule = await loader();
			const languageDefinition =
				typeof loadedModule === 'object' && loadedModule && 'default' in loadedModule
					? (loadedModule as { default: unknown }).default
					: loadedModule;
			await highlighter.loadLanguage(languageDefinition as never);
		})()
			.then(() => {
				this.loadedLanguages.set(resolvedLanguage, true);
			})
			.catch((error) => {
				this.loadedLanguages.set(resolvedLanguage, false);
				throw error;
			});

		this.loadedLanguages.set(resolvedLanguage, loadingPromise);
		await loadingPromise;
		return resolvedLanguage;
	}

	isReady(theme: ThemeInput, language: string | undefined): boolean {
		const resolvedThemeName = themeName(theme);
		if (this.loadedThemes.get(resolvedThemeName) !== true) {
			return false;
		}

		const resolvedLanguage = this.resolveLanguage(language);
		if (!resolvedLanguage) {
			return !!this.highlighter && !(this.highlighter instanceof Promise);
		}

		return (
			!!this.highlighter &&
			!(this.highlighter instanceof Promise) &&
			this.loadedLanguages.get(resolvedLanguage) === true
		);
	}

	async load(theme: ThemeInput, language: string | undefined): Promise<void> {
		await this.loadHighlighter();
		await Promise.all([this.ensureTheme(theme), this.ensureLanguage(language)]);
	}

	highlightCode(code: string, language: string | undefined, theme: ThemeInput): HighlightResult {
		const highlighter = this.highlighter;
		if (!highlighter || highlighter instanceof Promise) {
			return toPlaintextTokens(code);
		}

		const resolvedLanguage = this.resolveLanguage(language) ?? PLAINTEXT_LANGUAGE;
		const resolvedThemeName = themeName(theme);
		try {
			return {
				tokens: highlighter.codeToTokensBase(code, {
					lang: resolvedLanguage,
					theme: resolvedThemeName
				})
			};
		} catch {
			return toPlaintextTokens(code);
		}
	}
}

export interface CodePluginCoreOptions {
	languages: readonly LanguageDefinition[];
	themes?: [ThemeInput, ThemeInput];
}

export function createCodePlugin(options: CodePluginCoreOptions): CodeHighlighterPlugin {
	const themes = options.themes ?? [...DEFAULT_THEMES];
	const runtime = new PluginHighlighterRuntime(options.languages, themes);
	const tokenCache = new Map<string, HighlightResult>();

	return {
		name: 'shiki',
		type: 'code-highlighter',
		getSupportedLanguages() {
			return runtime.getSupportedLanguages();
		},
		getThemes() {
			return themes;
		},
		supportsLanguage(language: string) {
			return runtime.supportsLanguage(language);
		},
		highlight({ code, language, themes: runtimeThemes, activeTheme }, callback) {
			const activeThemes = runtimeThemes ?? themes;
			const resolvedActiveTheme = resolveActiveTheme({
				activeTheme,
				themes: activeThemes
			});
			const activeThemeName = themeName(resolvedActiveTheme);
			const normalizedLanguage = normalizeLanguage(language);
			const cacheKey = `${normalizedLanguage}:${activeThemeName}:${code}`;
			const cached = tokenCache.get(cacheKey);
			if (cached) {
				return cached;
			}

			const produce = () => {
				const result = runtime.highlightCode(code, normalizedLanguage, resolvedActiveTheme);
				tokenCache.set(cacheKey, result);
				return result;
			};

			if (!runtime.isReady(resolvedActiveTheme, normalizedLanguage)) {
				void runtime.load(resolvedActiveTheme, normalizedLanguage).then(() => {
					callback?.(produce());
				});
				return null;
			}

			return produce();
		}
	};
}

export const code = createCodePlugin({
	languages: []
});

export const getThemeName = themeName;
export type {
	CodeHighlighterPlugin,
	HighlightOptions,
	HighlightResult,
	HighlightToken,
	ThemeInput
} from './contracts.js';
