"use client";

// ../../shared/plugin-core/mermaid.ts
var defaultMermaidConfig = {
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  fontFamily: "monospace",
  suppressErrorRendering: true
};
var resolveMermaidModule = async (loadMermaid) => {
  const loadedModule = loadMermaid ? await loadMermaid() : await import("mermaid");
  return "default" in loadedModule ? loadedModule.default : loadedModule;
};
function createMermaidPlugin(options = {}) {
  let initialized = false;
  let currentConfig = { ...defaultMermaidConfig, ...options.config };
  let mermaidModulePromise = null;
  const getMermaidModule = () => {
    mermaidModulePromise ??= resolveMermaidModule(options.loadMermaid);
    return mermaidModulePromise;
  };
  const mermaidInstance = {
    initialize(config) {
      currentConfig = { ...defaultMermaidConfig, ...options.config, ...config };
      void getMermaidModule().then((mermaid2) => {
        mermaid2.initialize(currentConfig);
        initialized = true;
      });
    },
    async render(id, source) {
      const mermaid2 = await getMermaidModule();
      if (!initialized) {
        mermaid2.initialize(currentConfig);
        initialized = true;
      }
      return mermaid2.render(id, source);
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
