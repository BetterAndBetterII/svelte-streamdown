<script lang="ts">
	import type { PluginConfig } from '../../../src/lib/plugins.js';
	import PluginProvider from '../../../src/lib/PluginProvider.svelte';
	import PluginContextProbe from './PluginContextProbe.svelte';

	let {
		plugins = null,
		language = 'vega'
	}: {
		plugins?: PluginConfig | null;
		language?: string;
	} = $props();
</script>

<PluginProvider {plugins}>
	<PluginContextProbe {language} />
</PluginProvider>
