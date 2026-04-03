<script lang="ts">
	import { detectTextDirection } from './utils/detectDirection.js';
	import Element from './Elements/Element.svelte';
	import AnimatedText from './AnimatedText.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { renderMarkdownFragment } from './security/html.js';
	import { lex, type StreamdownToken } from './marked/index.js';
	import { parseIncompleteMarkdown as completeIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import { getContext } from 'svelte';

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
	const markdown = $derived(
		providedTokens
			? block
			: isStatic || streamdown.parseIncompleteMarkdown === false
			? block
			: completeIncompleteMarkdown(block.trim())
	);
	const tokens = $derived(providedTokens ?? lex(markdown, streamdown.extensions));
	const insidePopover = getContext('POPOVER');

	const allowedTagNames = $derived(
		streamdown.allowedTags ? Object.keys(streamdown.allowedTags) : []
	);

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

	const dir = $derived.by(() => {
		if (!streamdown.dir) {
			return undefined;
		}

		if (streamdown.dir === 'auto') {
			return detectTextDirection(block);
		}

		return streamdown.dir;
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

	{#if dir}
		<div data-streamdown-dir={dir} {dir} style="display: contents;">
			{@render renderChildren(tokens)}
		</div>
	{:else}
		{@render renderChildren(tokens)}
	{/if}
{/if}
