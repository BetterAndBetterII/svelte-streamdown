<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import AnimatedText from './AnimatedText.svelte';
	import Element from './Elements/Element.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { lex, type StreamdownToken } from './marked/index.js';
	import { applyPluginMarkdownTransforms } from './plugins.js';
	import { renderMarkdownFragment } from './security/html.js';
	import { detectTextDirection } from './utils/detectDirection.js';
	import { parseIncompleteMarkdown as completeIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import { hasIncompleteCodeFence } from './utils/code-block.js';

	let {
		block,
		static: isStatic = false,
		parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
		isIncomplete = false
	}: {
		block: string;
		static?: boolean;
		parseIncompleteMarkdown?: boolean;
		isIncomplete?: boolean;
	} = $props();

	const streamdown = useStreamdown();
	const markdown = $derived(
		applyPluginMarkdownTransforms(
			isStatic || !shouldParseIncompleteMarkdown || streamdown.parseIncompleteMarkdown === false
				? block
				: completeIncompleteMarkdown(block.trim()),
			streamdown.plugins
		)
	);
	const isIncompleteCodeFence = $derived(streamdown.isAnimating && !isStatic && hasIncompleteCodeFence(block));
	const tokens = $derived(lex(markdown, streamdown.extensions));
	const insidePopover = getContext('POPOVER');
	const allowedTagNames = $derived(
		streamdown.allowedTags ? Object.keys(streamdown.allowedTags) : []
	);

	const shouldRenderSecurityHtmlBlock = $derived.by(() => {
		const trimmed = markdown.trimStart();
		if (trimmed.startsWith('<')) {
			return true;
		}

		return allowedTagNames.some((tagName) =>
			new RegExp(`<\\/?${tagName}(?=[\\s>/])`, 'i').test(markdown)
		);
	});

	const securityHtmlBlock = $derived.by(() => {
		if (!shouldRenderSecurityHtmlBlock) {
			return '';
		}

		if (streamdown.renderHtml === false) {
			return markdown
				.replaceAll('&', '&amp;')
				.replaceAll('<', '&lt;')
				.replaceAll('>', '&gt;')
				.replaceAll('"', '&quot;')
				.replaceAll("'", '&#39;');
		}

		return renderMarkdownFragment(markdown, {
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
			return detectTextDirection(markdown);
		}

		return streamdown.dir;
	});

	setContext('STREAMDOWN_BLOCK', {
		get isIncompleteCodeFence() {
			return isIncompleteCodeFence;
		}
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
				<Element {token} {isIncomplete}>
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
