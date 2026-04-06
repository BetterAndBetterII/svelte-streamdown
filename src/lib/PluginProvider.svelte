<script lang="ts">
	import type { PluginConfig } from './plugins.js';
	import { PluginContext } from './plugin-context.js';

	export let plugins: PluginConfig | null = null;
	PluginContext.provide(() => plugins);
</script>

{#key plugins}
	<slot />
{/key}
