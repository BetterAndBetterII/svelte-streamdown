<script lang="ts">
	import type { IconMap } from '../../../src/lib/context.svelte.js';
	import IconProvider from '../../../src/lib/IconProvider.svelte';
	import IconConsumer from './IconConsumer.svelte';

	let {
		icons,
		iconName
	}: {
		icons?: Partial<IconMap>;
		iconName: keyof IconMap;
	} = $props();
</script>

<IconProvider {icons}>
	<IconConsumer {iconName} />
</IconProvider>
