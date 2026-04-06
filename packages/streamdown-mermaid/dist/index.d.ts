import { MermaidConfig } from 'mermaid';
export { MermaidConfig } from 'mermaid';

/**
 * Mermaid instance interface
 */
interface MermaidInstance {
    initialize: (config: MermaidConfig) => void;
    render: (id: string, source: string) => Promise<{
        svg: string;
    }>;
}
/**
 * Plugin for diagram rendering (Mermaid)
 */
interface DiagramPlugin {
    /**
     * Get the mermaid instance (initialized with optional config)
     */
    getMermaid: (config?: MermaidConfig) => MermaidInstance;
    /**
     * Language identifier for code blocks
     */
    language: string;
    name: "mermaid";
    type: "diagram";
}
/**
 * Options for creating a Mermaid plugin
 */
interface MermaidPluginOptions {
    /**
     * Default Mermaid configuration
     */
    config?: MermaidConfig;
}
/**
 * Create a Mermaid plugin with optional configuration
 */
declare function createMermaidPlugin(options?: MermaidPluginOptions): DiagramPlugin;
/**
 * Pre-configured Mermaid plugin with default settings
 */
declare const mermaid: DiagramPlugin;

export { type DiagramPlugin, type MermaidInstance, type MermaidPluginOptions, createMermaidPlugin, mermaid };
