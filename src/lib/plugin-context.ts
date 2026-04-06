import { getContext, setContext } from 'svelte';
import { findCustomRenderer, type PluginConfig } from './plugins.js';

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
