<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import AnimatedText from './AnimatedText.svelte';
	import Element from './Elements/Element.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { filterMarkdownTokens } from './markdown.js';
	import { lex, type StreamdownToken } from './marked/index.js';
	import { applyPluginMarkdownTransforms } from './plugins.js';
	import { renderMarkdownFragment } from './security/html.js';
	import { detectTextDirection } from './utils/detectDirection.js';
	import { parseIncompleteMarkdown as completeIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import { hasIncompleteCodeFence } from './utils/code-block.js';

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
	const markdown = $derived(
		applyPluginMarkdownTransforms(
			providedTokens
				? block
				: isStatic || !shouldParseIncompleteMarkdown || streamdown.parseIncompleteMarkdown === false
					? block
					: completeIncompleteMarkdown(block.trim()),
			streamdown.plugins
		)
	);
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
	const insidePopover = getContext('POPOVER');
	const allowedTagNames = $derived(
		streamdown.allowedTags ? Object.keys(streamdown.allowedTags) : []
	);

	const shouldRenderSecurityHtmlBlock = $derived.by(() => {
		if (streamdown.skipHtml) {
			return false;
		}

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
			defaultOrigin: streamdown.defaultOrigin,
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

	const namedHtmlEntities: Record<string, string> = {
		amp: '&',
		apos: "'",
		bull: '•',
		copy: '©',
		gt: '>',
		hearts: '♥',
		lt: '<',
		mdash: '—',
		nbsp: '\u00A0',
		quot: '"'
	};

	const decodeHtmlEntities = (value: string): string =>
		value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, entity) => {
			if (entity.startsWith('#x') || entity.startsWith('#X')) {
				const codePoint = Number.parseInt(entity.slice(2), 16);
				return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
			}

			if (entity.startsWith('#')) {
				const codePoint = Number.parseInt(entity.slice(1), 10);
				return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
			}

			return namedHtmlEntities[entity] ?? match;
		});

	const renderLeafText = (token: StreamdownToken): string => {
		if (!('text' in token) || typeof token.text !== 'string') {
			return '';
		}

		return token.type === 'text' ? decodeHtmlEntities(token.text) : token.text;
	};

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
							<AnimatedText text={renderLeafText(token)} />
						{:else}
							{renderLeafText(token)}
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
