<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useIsCodeFenceIncomplete } from '../../../../../src/lib/index.js';

	type TokenLike = {
		type: string;
		text?: string;
	};

	let {
		token,
		children
	}: {
		token: TokenLike;
		children?: Snippet;
	} = $props();

	const isIncompleteCodeFence = useIsCodeFenceIncomplete();
</script>

{#if token.type === 'code'}
	<div data-hook-probe="code" data-hook-incomplete={String(isIncompleteCodeFence)}>
		{token.text}
	</div>
{:else}
	<p data-hook-probe="paragraph" data-hook-incomplete={String(isIncompleteCodeFence)}>
		{@render children?.()}
	</p>
{/if}
