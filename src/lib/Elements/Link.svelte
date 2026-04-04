<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { applyMarkdownUrlTransform, createMarkdownElement } from '$lib/markdown.js';
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

	const resolvedLink = $derived.by(() => {
		if (token.href === 'streamdown:incomplete-link') {
			return {
				href: undefined,
				rel: undefined,
				state: 'anchor' as const,
				target: undefined
			};
		}

		const transformedHref = applyMarkdownUrlTransform(
			token.href,
			'href',
			createMarkdownElement('a', {
				href: token.href,
				title: token.title ?? undefined
			}),
			streamdown.urlTransform
		);

		if (transformedHref == null) {
			return {
				href: undefined,
				rel: undefined,
				state: 'anchor' as const,
				target: undefined
			};
		}

		if (transformedHref === '') {
			return {
				href: '',
				rel: undefined,
				state: 'anchor' as const,
				target: undefined
			};
		}

		if (isPathRelativeUrl(transformedHref)) {
			return {
				href: transformedHref,
				rel: undefined,
				state: 'anchor' as const,
				target: undefined
			};
		}

		const safeHref = transformUrl(
			transformedHref,
			streamdown.allowedLinkPrefixes ?? [],
			streamdown.defaultOrigin,
			{
				kind: 'link'
			}
		);

		if (safeHref) {
			return {
				href: safeHref,
				rel: 'noopener noreferrer',
				state: 'anchor' as const,
				target: '_blank'
			};
		}

		return {
			href: undefined,
			rel: undefined,
			state: 'blocked' as const,
			target: undefined
		};
	});
</script>

{#if resolvedLink.state === 'anchor'}
	<Slot
		props={{
			href: resolvedLink.href,
			target: resolvedLink.target,
			rel: resolvedLink.rel,
			title: token.title,
			class: streamdown.theme.link.base,
			children,
			token
		}}
		render={streamdown.snippets.link}
		component={streamdown.components?.a}
	>
		<a
			data-streamdown-link={id}
			class={streamdown.theme.link.base}
			href={resolvedLink.href}
			target={resolvedLink.target}
			rel={resolvedLink.rel}
		>
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
