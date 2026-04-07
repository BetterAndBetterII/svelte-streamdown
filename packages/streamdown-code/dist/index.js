"use client";

// index.ts
import { bundledLanguagesInfo } from "@streamdown-svelte/plugin-core";
import {
  createCodePlugin as createSharedCodePlugin
} from "@streamdown-svelte/plugin-core";
var createCodePlugin = (options = {}) => createSharedCodePlugin({
  languages: bundledLanguagesInfo,
  themes: options.themes
});
var code = createCodePlugin();
export {
  code,
  createCodePlugin
};
