<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { isPathRelativeUrl, transformUrl } from '$lib/utils/url.js';
	import Slot from './Slot.svelte';
	import type { Tokens } from 'marked';
	import type { Snippet } from 'svelte';

	const streamdown = useStreamdown();

	const {
		children,
		token,
		id
	}: {
		children: Snippet;
		token: Tokens.Link;
		id: string;
	} = $props();

	const isRelativeUrl = $derived(isPathRelativeUrl(token.href));

	const transformedUrl = $derived(
		transformUrl(token.href, streamdown.allowedLinkPrefixes ?? [], streamdown.defaultOrigin, {
			kind: 'link'
		})
	);
	const href = $derived(isRelativeUrl ? token.href : (transformedUrl ?? token.href));
	const target = $derived(isRelativeUrl ? undefined : '_blank');
	const rel = $derived(isRelativeUrl ? undefined : 'noopener noreferrer');
</script>

{#if transformedUrl || token.href === 'streamdown:incomplete-link' || isRelativeUrl}
	<Slot
		props={{
			href,
			target,
			rel,
			title: token.title,
			class: streamdown.theme.link.base,
			children,
			token
		}}
		render={streamdown.snippets.link}
		component={streamdown.components?.a}
	>
		<a data-streamdown-link={id} class={streamdown.theme.link.base} {href} {target} {rel}>
			{@render children()}
		</a>
	</Slot>
{:else}
	<span
		data-streamdown-link-blocked={id}
		class={streamdown.theme.link.blocked}
		title={token.title ? `Blocked URL: ${token.href}` : undefined}
	>
		{@render children()} [blocked]
	</span>
{/if}
