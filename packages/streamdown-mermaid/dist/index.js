"use client";

// index.ts
import mermaidLib from "mermaid";
var defaultConfig = {
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  fontFamily: "monospace",
  suppressErrorRendering: true
};
function createMermaidPlugin(options = {}) {
  let initialized = false;
  let currentConfig = { ...defaultConfig, ...options.config };
  const mermaidInstance = {
    initialize(config) {
      currentConfig = { ...defaultConfig, ...options.config, ...config };
      mermaidLib.initialize(currentConfig);
      initialized = true;
    },
    async render(id, source) {
      if (!initialized) {
        mermaidLib.initialize(currentConfig);
        initialized = true;
      }
      return await mermaidLib.render(id, source);
    }
  };
  return {
    name: "mermaid",
    type: "diagram",
    language: "mermaid",
    getMermaid(config) {
      if (config) {
        mermaidInstance.initialize(config);
      }
      return mermaidInstance;
    }
  };
}
var mermaid = createMermaidPlugin();
export {
  createMermaidPlugin,
  mermaid
};
