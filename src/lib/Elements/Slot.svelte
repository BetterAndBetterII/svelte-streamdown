<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	let {
		children,
		render,
		component: ComponentOverride,
		props
	}: {
		children: Snippet;
		render?: Snippet<[any]>;
		component?: Component<any>;
		props: Record<string, any>;
	} = $props();
</script>

{#if render}
	{@render render(props)}
{:else if ComponentOverride}
	<ComponentOverride {...props} />
{:else}
	{@render children()}
{/if}
