import { MermaidConfig } from 'mermaid';
export { MermaidConfig } from 'mermaid';

interface MermaidInstance {
    initialize: (config: MermaidConfig) => void;
    render: (id: string, source: string) => Promise<{
        svg: string;
    }>;
}
interface MermaidModule {
    initialize: (config: MermaidConfig) => void;
    render: (id: string, source: string) => Promise<{
        svg: string;
    }>;
}
type MermaidModuleLoader = () => Promise<MermaidModule | {
    default: MermaidModule;
}>;
interface DiagramPlugin {
    getMermaid: (config?: MermaidConfig) => MermaidInstance;
    language: string;
    name: 'mermaid';
    type: 'diagram';
}
interface MermaidPluginOptions {
    config?: MermaidConfig;
    loadMermaid?: MermaidModuleLoader;
}

declare function createMermaidPlugin(options?: MermaidPluginOptions): DiagramPlugin;
declare const mermaid: DiagramPlugin;

export { type DiagramPlugin, type MermaidInstance, type MermaidModule, type MermaidModuleLoader, type MermaidPluginOptions, createMermaidPlugin, mermaid };
