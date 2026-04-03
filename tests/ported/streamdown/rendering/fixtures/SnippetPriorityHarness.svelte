<script lang="ts">
	import Streamdown from '../../../../../src/lib/Streamdown.svelte';
	import ComponentOverrideProbe from './ComponentOverrideProbe.svelte';

	let { content }: { content: string } = $props();
</script>

<Streamdown {content} components={{ p: ComponentOverrideProbe }}>
	{#snippet paragraph({ children })}
		<p data-snippet="paragraph">
			{@render children()}
		</p>
	{/snippet}
</Streamdown>
