<script lang="ts">
	import type { IconMap } from './context.svelte.js';
	import { IconContext } from './icon-context.js';

	export let icons: Partial<IconMap> | undefined = undefined;
	IconContext.provide(() => icons);
</script>

{#key icons}
	<slot />
{/key}
