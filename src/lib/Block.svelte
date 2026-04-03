<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken } from './marked/index.js';
	import AnimatedText from './AnimatedText.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { getContext } from 'svelte';
	import { renderMarkdownFragment } from './security/html.js';

	let {
		block,
		static: isStatic = false,
		tokens: providedTokens
	}: {
		block: string;
		static?: boolean;
		tokens?: StreamdownToken[];
	} = $props();

	const streamdown = useStreamdown();
	const tokens = $derived(
		providedTokens ??
			lex(isStatic ? block : parseIncompleteMarkdown(block.trim()), streamdown.extensions)
	);
	const insidePopover = getContext('POPOVER');

	const allowedTagNames = $derived(streamdown.allowedTags ? Object.keys(streamdown.allowedTags) : []);

	const shouldRenderSecurityHtmlBlock = $derived.by(() => {
		const trimmed = block.trimStart();
		if (trimmed.startsWith('<')) {
			return true;
		}

		return allowedTagNames.some((tagName) =>
			new RegExp(`<\\/?${tagName}(?=[\\s>/])`, 'i').test(block)
		);
	});

	const securityHtmlBlock = $derived.by(() => {
		if (!shouldRenderSecurityHtmlBlock) {
			return '';
		}

		if (streamdown.renderHtml === false) {
			return block
				.replaceAll('&', '&amp;')
				.replaceAll('<', '&lt;')
				.replaceAll('>', '&gt;')
				.replaceAll('"', '&quot;')
				.replaceAll("'", '&#39;');
		}

		return renderMarkdownFragment(block, {
			allowedImagePrefixes: streamdown.allowedImagePrefixes,
			allowedLinkPrefixes: streamdown.allowedLinkPrefixes,
			allowedTags: streamdown.allowedTags,
			defaultOrigin: streamdown.defaultOrigin
		});
	});
</script>

{#if shouldRenderSecurityHtmlBlock}
	{@html securityHtmlBlock}
{:else}

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token}
		{#if token}
			{@const children = (token as any)?.tokens || []}
			{@const isTextOnlyNode = children.length === 0}
			<Element {token}>
				{#if isTextOnlyNode}
					{#if streamdown.animation.enabled && !insidePopover && !isStatic}
						<AnimatedText text={'text' in token ? token.text || '' : ''} />
					{:else}
						{'text' in token ? token.text : ''}
					{/if}
				{:else}
					{@render renderChildren(children)}
				{/if}
			</Element>
		{/if}
	{/each}
{/snippet}

{@render renderChildren(tokens)}
{/if}
