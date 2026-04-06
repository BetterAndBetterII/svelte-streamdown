import { getContext, setContext } from 'svelte';
import { findCustomRenderer, type PluginConfig } from './plugins.js';

export { STREAMDOWN_CONTEXT_KEY } from './context-key.js';
export {
	StreamdownContext,
	useStreamdown,
	type AnimateOptions,
	type BlockProps,
	type CodeControlsConfig,
	type Components,
	type ControlsConfig,
	type IconMap,
	type LinkSafetyConfig,
	type LinkSafetyModalProps,
	type MermaidControls,
	type MermaidErrorComponentProps,
	type MermaidOptions,
	type NormalizedMermaidControls,
	type StreamdownComponents,
	type StreamdownContext as StreamdownContextType,
	type StreamdownControlsConfig,
	type StreamdownProps,
	type TableControlsConfig
} from './context.svelte.js';

const PLUGIN_CONTEXT_KEY = Symbol('streamdown.plugins');

type PluginContextGetter = {
	getValue: () => PluginConfig | null;
};

const defaultPluginGetter: PluginContextGetter = {
	getValue: () => null
};

export const PluginContext = {
	key: PLUGIN_CONTEXT_KEY,
	provide(getValue: () => PluginConfig | null): PluginContextGetter {
		const value = { getValue };
		setContext(PLUGIN_CONTEXT_KEY, value);
		return value;
	},
	set(plugins: PluginConfig | null | undefined): PluginContextGetter {
		return this.provide(() => plugins ?? null);
	},
	get(): PluginConfig | null {
		return (getContext<PluginContextGetter>(PLUGIN_CONTEXT_KEY) ?? defaultPluginGetter).getValue();
	}
};

export function usePlugins(): PluginConfig | null {
	return PluginContext.get();
}

export function useCodePlugin() {
	return usePlugins()?.code ?? null;
}

export function useMermaidPlugin() {
	return usePlugins()?.mermaid ?? null;
}

export function useMathPlugin() {
	return usePlugins()?.math ?? null;
}

export function useCjkPlugin() {
	return usePlugins()?.cjk ?? null;
}

export function useCustomRenderer(language: string) {
	return findCustomRenderer(usePlugins()?.renderers, language) ?? null;
}
