"use client";

// index.ts
import {
  bundledLanguages,
  bundledLanguagesInfo,
  createHighlighter
} from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
var jsEngine = createJavaScriptRegexEngine({ forgiving: true });
var languageAliases = Object.fromEntries(
  bundledLanguagesInfo.flatMap(
    (info) => (info.aliases ?? []).map((alias) => [alias, info.id])
  )
);
var languageNames = new Set(
  Object.keys(bundledLanguages)
);
var normalizeLanguage = (language) => {
  const trimmed = language.trim();
  const lower = trimmed.toLowerCase();
  const alias = languageAliases[lower];
  if (alias) {
    return alias;
  }
  if (languageNames.has(lower)) {
    return lower;
  }
  return lower;
};
var highlighterCache = /* @__PURE__ */ new Map();
var tokensCache = /* @__PURE__ */ new Map();
var subscribers = /* @__PURE__ */ new Map();
var getThemeName = (theme) => typeof theme === "string" ? theme : theme.name ?? "custom";
var getHighlighterCacheKey = (language, themes) => `${language}-${getThemeName(themes[0])}-${getThemeName(themes[1])}`;
var getTokensCacheKey = (code2, language, themeNames) => {
  const start = code2.slice(0, 100);
  const end = code2.length > 100 ? code2.slice(-100) : "";
  return `${language}:${themeNames[0]}:${themeNames[1]}:${code2.length}:${start}:${end}`;
};
var getHighlighter = (language, themes) => {
  const cacheKey = getHighlighterCacheKey(language, themes);
  if (highlighterCache.has(cacheKey)) {
    return highlighterCache.get(cacheKey);
  }
  const highlighterPromise = createHighlighter({
    themes,
    langs: [language],
    engine: jsEngine
  });
  highlighterCache.set(cacheKey, highlighterPromise);
  return highlighterPromise;
};
function createCodePlugin(options = {}) {
  const defaultThemes = options.themes ?? [
    "github-light",
    "github-dark"
  ];
  return {
    name: "shiki",
    type: "code-highlighter",
    supportsLanguage(language) {
      const resolvedLanguage = normalizeLanguage(language);
      return languageNames.has(resolvedLanguage);
    },
    getSupportedLanguages() {
      return Array.from(languageNames);
    },
    getThemes() {
      return defaultThemes;
    },
    highlight({ code: code2, language, themes }, callback) {
      const resolvedLanguage = normalizeLanguage(language);
      const themeNames = [
        getThemeName(themes[0]),
        getThemeName(themes[1])
      ];
      const tokensCacheKey = getTokensCacheKey(
        code2,
        resolvedLanguage,
        themeNames
      );
      if (tokensCache.has(tokensCacheKey)) {
        return tokensCache.get(tokensCacheKey);
      }
      if (callback) {
        if (!subscribers.has(tokensCacheKey)) {
          subscribers.set(tokensCacheKey, /* @__PURE__ */ new Set());
        }
        const subs = subscribers.get(tokensCacheKey);
        subs.add(callback);
      }
      const safeLanguage = languageNames.has(
        resolvedLanguage
      ) ? resolvedLanguage : "text";
      getHighlighter(safeLanguage, themes).then((highlighter) => {
        const availableLangs = highlighter.getLoadedLanguages();
        const langToUse = availableLangs.includes(resolvedLanguage) ? resolvedLanguage : "text";
        const result = highlighter.codeToTokens(code2, {
          lang: langToUse,
          themes: {
            light: themeNames[0],
            dark: themeNames[1]
          }
        });
        tokensCache.set(tokensCacheKey, result);
        const subs = subscribers.get(tokensCacheKey);
        if (subs) {
          for (const sub of subs) {
            sub(result);
          }
          subscribers.delete(tokensCacheKey);
        }
      }).catch((error) => {
        console.error("[Streamdown Code] Failed to highlight code:", error);
        subscribers.delete(tokensCacheKey);
      });
      return null;
    }
  };
}
var code = createCodePlugin();
export {
  code,
  createCodePlugin
};
