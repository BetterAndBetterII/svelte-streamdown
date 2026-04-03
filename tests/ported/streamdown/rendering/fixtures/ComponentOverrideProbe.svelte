<script lang="ts">
	import type { Snippet } from 'svelte';

	type TokenLike = {
		type: string;
		depth?: number;
	};

	let {
		token,
		children,
		href,
		target,
		rel,
		title,
		src,
		alt,
		class: className,
		style
	}: {
		token: TokenLike;
		children?: Snippet;
		href?: string;
		target?: string;
		rel?: string;
		title?: string;
		src?: string;
		alt?: string;
		class?: string;
		style?: string;
	} = $props();

	const headingTag = $derived(`h${token.depth ?? 1}`);
</script>

{#if token.type === 'heading'}
	<svelte:element this={headingTag} data-override={headingTag} class={className} {style}>
		{@render children?.()}
	</svelte:element>
{:else if token.type === 'paragraph'}
	<p data-override="p" class={className} {style}>
		{@render children?.()}
	</p>
{:else if token.type === 'link'}
	<a data-override="a" {href} {target} {rel} {title} class={className} {style}>
		{@render children?.()}
	</a>
{:else if token.type === 'image'}
	<img data-override="img" {src} {alt} class={className} {style} />
{:else if token.type === 'table'}
	<table data-override="table" class={className} {style}>
		{@render children?.()}
	</table>
{:else if token.type === 'codespan'}
	<code data-override="inlineCode" class={className} {style}>
		{@render children?.()}
	</code>
{/if}
