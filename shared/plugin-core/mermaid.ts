import type { MermaidConfig } from 'mermaid';
import type {
	DiagramPlugin,
	MermaidInstance,
	MermaidModule,
	MermaidModuleLoader,
	MermaidPluginOptions
} from './contracts.js';

const defaultMermaidConfig: MermaidConfig = {
	startOnLoad: false,
	theme: 'default',
	securityLevel: 'strict',
	fontFamily: 'monospace',
	suppressErrorRendering: true
};

const resolveMermaidModule = async (
	loadMermaid?: MermaidModuleLoader
): Promise<MermaidModule> => {
	const loadedModule = loadMermaid ? await loadMermaid() : await import('mermaid');
	return 'default' in loadedModule ? loadedModule.default : loadedModule;
};

export function createMermaidPlugin(options: MermaidPluginOptions = {}): DiagramPlugin {
	let initialized = false;
	let currentConfig: MermaidConfig = { ...defaultMermaidConfig, ...options.config };
	let mermaidModulePromise: Promise<MermaidModule> | null = null;

	const getMermaidModule = () => {
		mermaidModulePromise ??= resolveMermaidModule(options.loadMermaid);
		return mermaidModulePromise;
	};

	const mermaidInstance: MermaidInstance = {
		initialize(config: MermaidConfig) {
			currentConfig = { ...defaultMermaidConfig, ...options.config, ...config };
			void getMermaidModule().then((mermaid) => {
				mermaid.initialize(currentConfig);
				initialized = true;
			});
		},
		async render(id: string, source: string) {
			const mermaid = await getMermaidModule();
			if (!initialized) {
				mermaid.initialize(currentConfig);
				initialized = true;
			}
			return mermaid.render(id, source);
		}
	};

	return {
		name: 'mermaid',
		type: 'diagram',
		language: 'mermaid',
		getMermaid(config?: MermaidConfig) {
			if (config) {
				mermaidInstance.initialize(config);
			}
			return mermaidInstance;
		}
	};
}

export const mermaid = createMermaidPlugin();
export type {
	DiagramPlugin,
	MermaidInstance,
	MermaidModule,
	MermaidModuleLoader,
	MermaidPluginOptions
} from './contracts.js';
export type { MermaidConfig } from 'mermaid';
