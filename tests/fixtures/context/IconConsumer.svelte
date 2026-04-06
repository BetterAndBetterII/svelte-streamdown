<script lang="ts">
	import { useIcons } from '../../../src/lib/index.js';
	import type { IconMap } from '../../../src/lib/context.svelte.js';

	let { iconName }: { iconName: keyof IconMap } = $props();
	const icons = useIcons();
	const icon = $derived(icons[iconName]);
</script>

<div data-testid="icon-consumer">
	{#if icon}
		{@render icon()}
	{/if}
</div>
