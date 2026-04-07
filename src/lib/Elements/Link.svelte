<script lang="ts">
	import { useStreamdown, type LinkSafetyModalProps } from '$lib/context.svelte.js';
	import { applyMarkdownUrlTransform, createMarkdownElement } from '$lib/markdown.js';
	import { isPathRelativeUrl, transformUrl } from '$lib/utils/url.js';
	import Slot from './Slot.svelte';
	import LinkSafetyModal from './LinkSafetyModal.svelte';
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
				state: 'blocked' as const,
				target: undefined,
				isIncomplete: true,
				isRelative: false
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
				state: 'literal' as const,
				target: undefined,
				isIncomplete: false,
				isRelative: false
			};
		}

		if (transformedHref === '') {
			return {
				href: '',
				rel: undefined,
				state: 'anchor' as const,
				target: undefined,
				isIncomplete: false,
				isRelative: false
			};
		}

		if (isPathRelativeUrl(transformedHref)) {
			return {
				href: transformedHref,
				rel: undefined,
				state: 'anchor' as const,
				target: undefined,
				isIncomplete: false,
				isRelative: true
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
				target: '_blank',
				isIncomplete: false,
				isRelative: false
			};
		}

		return {
			href: undefined,
			rel: undefined,
			state: 'blocked' as const,
			target: undefined,
			isIncomplete: false,
			isRelative: false
		};
	});

	const shouldIntercept = $derived(
		Boolean(
			streamdown.linkSafety?.enabled &&
				resolvedLink.state === 'anchor' &&
				resolvedLink.href &&
				!resolvedLink.isRelative &&
				!resolvedLink.isIncomplete
		)
	);
	const splitMailtoLabel = $derived.by(() => {
		if (!token.href.startsWith('mailto:')) {
			return null;
		}

		const text = typeof token.text === 'string' ? token.text : '';
		if (!text.startsWith('mailto:')) {
			return null;
		}

		return {
			prefix: 'mailto:',
			label: text.slice('mailto:'.length)
		};
	});
	const customModal = $derived(
		streamdown.linkSafety?.renderModal as Snippet<[LinkSafetyModalProps]> | undefined
	);
	let isModalOpen = $state(false);

	const openHref = () => {
		if (typeof window === 'undefined' || !resolvedLink.href || resolvedLink.isIncomplete) {
			return;
		}

		window.open(resolvedLink.href, '_blank', 'noreferrer');
	};

	const handleInterceptedClick = async (event: MouseEvent) => {
		if (!shouldIntercept || resolvedLink.isIncomplete || !resolvedLink.href) {
			return;
		}

		event.preventDefault();

		try {
			if (streamdown.linkSafety?.onLinkCheck) {
				const isAllowed = await streamdown.linkSafety.onLinkCheck(resolvedLink.href);
				if (isAllowed) {
					openHref();
					return;
				}
			}
		} catch {
			// Fall through to the confirmation modal when the checker fails closed.
		}

		isModalOpen = true;
	};

	const modalProps = $derived({
		url: resolvedLink.href ?? '',
		isOpen: isModalOpen,
		onClose: () => {
			isModalOpen = false;
		},
		onConfirm: openHref
	} satisfies LinkSafetyModalProps);
</script>

{#if resolvedLink.state === 'anchor'}
	{#if shouldIntercept}
		{#if splitMailtoLabel}{splitMailtoLabel.prefix}{/if}
		<button
			type="button"
			data-streamdown="link"
			data-streamdown-link={id}
			data-incomplete={resolvedLink.isIncomplete ? 'true' : undefined}
			class={`${streamdown.theme.link.base} appearance-none border-none bg-transparent p-0 text-left`}
			onclick={(event) => void handleInterceptedClick(event)}
		>{#if splitMailtoLabel}{splitMailtoLabel.label}{:else}{@render children()}{/if}</button>{#if customModal}{@render customModal(modalProps)}{:else}<LinkSafetyModal {...modalProps} />{/if}
	{:else}
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
				data-streamdown="link"
				data-streamdown-link={id}
				data-incomplete={resolvedLink.isIncomplete ? 'true' : undefined}
				class={streamdown.theme.link.base}
				href={resolvedLink.href}
				target={resolvedLink.target}
				rel={resolvedLink.rel}
			>{#if splitMailtoLabel}{splitMailtoLabel.prefix}{splitMailtoLabel.label}{:else}{@render children()}{/if}</a>
		</Slot>
	{/if}
{:else if resolvedLink.state === 'literal'}
	{'['}{@render children()}{']'}
{:else}
	<span
		data-streamdown-link-blocked={id}
		class={streamdown.theme.link.blocked}
		title={`Blocked URL: ${resolvedLink.href}`}
	>{@render children()} [blocked]</span>
{/if}
