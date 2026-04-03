<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken } from './marked/index.js';
	import AnimatedText from './AnimatedText.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { getContext } from 'svelte';
	import { containsHtml, renderMarkdownToHtml } from './utils/html-support.js';

	let {
		block,
		static: isStatic = false
	}: {
		block: string;
		static?: boolean;
	} = $props();

	const streamdown = useStreamdown();
	const normalizedBlock = $derived(isStatic ? block : parseIncompleteMarkdown(block.trim()));
	const shouldRenderHtmlBlock = $derived(
		typeof streamdown.renderHtml !== 'function' &&
			streamdown.renderHtml !== false &&
			containsHtml(normalizedBlock)
	);
	const renderedHtml = $derived(
		shouldRenderHtmlBlock
			? renderMarkdownToHtml(normalizedBlock, {
					allowedTags: streamdown.allowedTags,
					literalTagContent: streamdown.literalTagContent
				})
			: ''
	);
	const tokens = $derived(lex(normalizedBlock, streamdown.extensions));
	const insidePopover = getContext('POPOVER');
</script>

{#if shouldRenderHtmlBlock}
	{@html renderedHtml}
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
