<script lang="ts">
	import { setContext } from 'svelte';
	import BlockTokens from './block/BlockTokens.svelte';
	import { renderBlockHtml } from './block/html.js';
	import { useStreamdown } from './context.svelte.js';
	import { filterMarkdownTokens } from './markdown.js';
	import { lex, type StreamdownToken } from './marked/index.js';
	import { applyPluginMarkdownTransforms } from './plugins.js';
	import { repairIncompleteMarkdown } from './streamdown/incomplete-markdown.js';
	import { detectTextDirection } from './utils/detectDirection.js';
	import { hasIncompleteCodeFence, STREAMDOWN_BLOCK_CONTEXT } from './incomplete-code.js';

	let {
		block,
		static: isStatic = false,
		tokens: providedTokens,
		parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
		isIncomplete = false
	}: {
		block: string;
		static?: boolean;
		tokens?: StreamdownToken[];
		parseIncompleteMarkdown?: boolean;
		isIncomplete?: boolean;
	} = $props();

	const streamdown = useStreamdown();
	const repairedBlock = $derived.by(() => {
		if (providedTokens) {
			return block;
		}

		if (isStatic || !shouldParseIncompleteMarkdown || streamdown.parseIncompleteMarkdown === false) {
			return block;
		}

		return repairIncompleteMarkdown(block, streamdown.remend);
	});
	const markdown = $derived(applyPluginMarkdownTransforms(repairedBlock, streamdown.plugins));
	const isIncompleteCodeFence = $derived(
		streamdown.isAnimating && !isStatic && hasIncompleteCodeFence(block)
	);
	const tokens = $derived(
		filterMarkdownTokens(providedTokens ?? lex(markdown, streamdown.extensions), {
			allowedElements: streamdown.allowedElements,
			allowElement: streamdown.allowElement,
			disallowedElements: streamdown.disallowedElements,
			skipHtml: streamdown.skipHtml,
			unwrapDisallowed: streamdown.unwrapDisallowed
		})
	);
	const securityHtmlBlock = $derived.by(() => {
		return renderBlockHtml(markdown, {
			allowedImagePrefixes: streamdown.allowedImagePrefixes,
			allowedLinkPrefixes: streamdown.allowedLinkPrefixes,
			allowedTags: streamdown.allowedTags,
			defaultOrigin: streamdown.defaultOrigin,
			renderHtml: streamdown.renderHtml,
			skipHtml: streamdown.skipHtml,
			urlTransform: streamdown.urlTransform
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

	setContext(STREAMDOWN_BLOCK_CONTEXT, {
		get isIncompleteCodeFence() {
			return isIncompleteCodeFence;
		}
	});
</script>

{#if securityHtmlBlock !== null}
	{@html securityHtmlBlock}
{:else}
	{#if dir}
		<div data-streamdown-dir={dir} {dir} style="display: contents;">
			<BlockTokens {tokens} {isIncomplete} {isStatic} />
		</div>
	{:else}
		<BlockTokens {tokens} {isIncomplete} {isStatic} />
	{/if}
{/if}
