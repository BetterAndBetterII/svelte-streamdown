"use client";

// ../../shared/plugin-core/bundled-languages.ts
var bundledLanguagesInfo = [
  // Web essentials
  {
    id: "javascript",
    aliases: ["js"],
    import: () => import("./javascript-E4JAUN5Z.js")
  },
  {
    id: "typescript",
    aliases: ["ts"],
    import: () => import("./typescript-YHLEOTDS.js")
  },
  {
    id: "html",
    import: () => import("./html-LHUYLEL4.js")
  },
  {
    id: "css",
    import: () => import("./css-LYKGG753.js")
  },
  {
    id: "json",
    import: () => import("./json-27QU5GDG.js")
  },
  {
    id: "jsx",
    import: () => import("./jsx-OOEVEXVE.js")
  },
  {
    id: "tsx",
    import: () => import("./tsx-SZXZ77OM.js")
  },
  {
    id: "markdown",
    aliases: ["md"],
    import: () => import("./markdown-BHSBPZJ2.js")
  },
  {
    id: "yaml",
    aliases: ["yml"],
    import: () => import("./yaml-PLLTNEFW.js")
  },
  {
    id: "xml",
    import: () => import("./xml-PUUPUEF5.js")
  },
  // Backend languages
  {
    id: "python",
    aliases: ["py"],
    import: () => import("./python-WWTVT5BX.js")
  },
  {
    id: "java",
    import: () => import("./java-4A6HJ7HJ.js")
  },
  {
    id: "go",
    import: () => import("./go-2GIIHHWG.js")
  },
  {
    id: "rust",
    aliases: ["rs"],
    import: () => import("./rust-WWTKKXCE.js")
  },
  {
    id: "ruby",
    aliases: ["rb"],
    import: () => import("./ruby-MY4OEHB5.js")
  },
  {
    id: "php",
    import: () => import("./php-WXDE5HEV.js")
  },
  {
    id: "c",
    import: () => import("./c-TE6MFUG6.js")
  },
  {
    id: "cpp",
    aliases: ["c++"],
    import: () => import("./cpp-7NUFJZCQ.js")
  },
  {
    id: "csharp",
    aliases: ["c#", "cs"],
    import: () => import("./csharp-PY4JASM6.js")
  },
  {
    id: "sql",
    import: () => import("./sql-ZZJ2Z25S.js")
  },
  {
    id: "swift",
    import: () => import("./swift-SLQLPBTG.js")
  },
  {
    id: "kotlin",
    aliases: ["kt", "kts"],
    import: () => import("./kotlin-U3BZGNGQ.js")
  },
  // Config/Shell
  {
    id: "shellscript",
    aliases: ["bash", "sh", "shell", "zsh"],
    import: () => import("./shellscript-KFMTNYDM.js")
  },
  {
    id: "docker",
    aliases: ["dockerfile"],
    import: () => import("./docker-6TYBLAL5.js")
  },
  {
    id: "toml",
    import: () => import("./toml-F6UWIVAL.js")
  },
  {
    id: "graphql",
    aliases: ["gql"],
    import: () => import("./graphql-IEXVSGPQ.js")
  },
  {
    id: "svelte",
    import: () => import("./svelte-JU6SFVZV.js")
  },
  {
    id: "vue",
    import: () => import("./vue-A2E2DRUI.js")
  }
];
function createLanguageSet(languages) {
  const set = /* @__PURE__ */ new Set();
  languages.forEach((lang) => {
    set.add(lang.id);
    if (lang.aliases) {
      lang.aliases.forEach((alias) => set.add(alias));
    }
  });
  return set;
}
var supportedLanguages = createLanguageSet(bundledLanguagesInfo);

// ../../shared/plugin-core/code.ts
import { createHighlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
var jsEngine = createJavaScriptRegexEngine({ forgiving: true });
var DEFAULT_THEMES = ["github-light", "github-dark"];
var PLAINTEXT_LANGUAGE = "text";
var themeName = (theme) => typeof theme === "string" ? theme : theme.name ?? "custom-theme";
var normalizeLanguage = (language) => language.trim().toLowerCase();
var getPreferredTheme = (themes) => {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return themes[1];
  }
  return themes[0];
};
var toPlaintextTokens = (code3) => ({
  tokens: code3.split("\n").map((line) => [
    {
      content: line,
      color: void 0,
      bgColor: void 0
    }
  ])
});
var PluginHighlighterRuntime = class {
  additionalThemes;
  aliasToId = /* @__PURE__ */ new Map();
  languageLoaders = /* @__PURE__ */ new Map();
  supportedLanguages = /* @__PURE__ */ new Set();
  loadedLanguages = /* @__PURE__ */ new Map();
  loadedThemes = /* @__PURE__ */ new Map();
  highlighter = null;
  constructor(languages, themes) {
    this.additionalThemes = Object.fromEntries(
      themes.filter((theme) => typeof theme !== "string").map((theme) => [themeName(theme), theme])
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
  getSupportedLanguages() {
    return [...this.supportedLanguages].sort((left, right) => left.localeCompare(right));
  }
  supportsLanguage(language) {
    return this.supportedLanguages.has(normalizeLanguage(language));
  }
  resolveLanguage(language) {
    if (!language) {
      return void 0;
    }
    return this.aliasToId.get(normalizeLanguage(language));
  }
  async loadHighlighter() {
    if (this.highlighter instanceof Promise) {
      return this.highlighter;
    }
    if (this.highlighter) {
      return this.highlighter;
    }
    this.highlighter = createHighlighter({
      themes: [],
      langs: [],
      engine: jsEngine
    });
    this.highlighter = await this.highlighter;
    return this.highlighter;
  }
  async ensureTheme(theme) {
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
    const loadingPromise = (async () => {
      const highlighter = await this.loadHighlighter();
      await highlighter.loadTheme(theme);
    })().then(() => {
      this.loadedThemes.set(resolvedThemeName, true);
    }).catch((error) => {
      this.loadedThemes.set(resolvedThemeName, false);
      throw error;
    });
    this.loadedThemes.set(resolvedThemeName, loadingPromise);
    await loadingPromise;
    return resolvedThemeName;
  }
  async ensureLanguage(language) {
    const resolvedLanguage = this.resolveLanguage(language);
    if (!resolvedLanguage) {
      return void 0;
    }
    const loaded = this.loadedLanguages.get(resolvedLanguage);
    if (loaded === true) {
      return resolvedLanguage;
    }
    if (loaded instanceof Promise) {
      await loaded;
      return this.loadedLanguages.get(resolvedLanguage) === true ? resolvedLanguage : void 0;
    }
    if (loaded === false) {
      return void 0;
    }
    const loader = this.languageLoaders.get(resolvedLanguage);
    if (!loader) {
      this.loadedLanguages.set(resolvedLanguage, false);
      return void 0;
    }
    const loadingPromise = (async () => {
      const highlighter = await this.loadHighlighter();
      const loadedModule = await loader();
      const languageDefinition = typeof loadedModule === "object" && loadedModule && "default" in loadedModule ? loadedModule.default : loadedModule;
      await highlighter.loadLanguage(languageDefinition);
    })().then(() => {
      this.loadedLanguages.set(resolvedLanguage, true);
    }).catch((error) => {
      this.loadedLanguages.set(resolvedLanguage, false);
      throw error;
    });
    this.loadedLanguages.set(resolvedLanguage, loadingPromise);
    await loadingPromise;
    return resolvedLanguage;
  }
  isReady(theme, language) {
    const resolvedThemeName = themeName(theme);
    if (this.loadedThemes.get(resolvedThemeName) !== true) {
      return false;
    }
    const resolvedLanguage = this.resolveLanguage(language);
    if (!resolvedLanguage) {
      return !!this.highlighter && !(this.highlighter instanceof Promise);
    }
    return !!this.highlighter && !(this.highlighter instanceof Promise) && this.loadedLanguages.get(resolvedLanguage) === true;
  }
  async load(theme, language) {
    await this.loadHighlighter();
    await Promise.all([this.ensureTheme(theme), this.ensureLanguage(language)]);
  }
  highlightCode(code3, language, theme) {
    const highlighter = this.highlighter;
    if (!highlighter || highlighter instanceof Promise) {
      return toPlaintextTokens(code3);
    }
    const resolvedLanguage = this.resolveLanguage(language) ?? PLAINTEXT_LANGUAGE;
    const resolvedThemeName = themeName(theme);
    try {
      return {
        tokens: highlighter.codeToTokensBase(code3, {
          lang: resolvedLanguage,
          theme: resolvedThemeName
        })
      };
    } catch {
      return toPlaintextTokens(code3);
    }
  }
};
function createCodePlugin(options) {
  const themes = options.themes ?? [...DEFAULT_THEMES];
  const runtime = new PluginHighlighterRuntime(options.languages, themes);
  const tokenCache = /* @__PURE__ */ new Map();
  return {
    name: "shiki",
    type: "code-highlighter",
    getSupportedLanguages() {
      return runtime.getSupportedLanguages();
    },
    getThemes() {
      return themes;
    },
    supportsLanguage(language) {
      return runtime.supportsLanguage(language);
    },
    highlight({ code: code3, language, themes: runtimeThemes }, callback) {
      const activeThemes = runtimeThemes ?? themes;
      const activeTheme = getPreferredTheme(activeThemes);
      const activeThemeName = themeName(activeTheme);
      const normalizedLanguage = normalizeLanguage(language);
      const cacheKey = `${normalizedLanguage}:${activeThemeName}:${code3}`;
      const cached = tokenCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const produce = () => {
        const result = runtime.highlightCode(code3, normalizedLanguage, activeTheme);
        tokenCache.set(cacheKey, result);
        return result;
      };
      if (!runtime.isReady(activeTheme, normalizedLanguage)) {
        void runtime.load(activeTheme, normalizedLanguage).then(() => {
          callback?.(produce());
        });
        return null;
      }
      return produce();
    }
  };
}
var code = createCodePlugin({
  languages: []
});

// index.ts
var createCodePlugin2 = (options = {}) => createCodePlugin({
  languages: bundledLanguagesInfo,
  themes: options.themes
});
var code2 = createCodePlugin2();
export {
  code2 as code,
  createCodePlugin2 as createCodePlugin
};
