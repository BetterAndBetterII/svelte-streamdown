<script lang="ts">
	import { useStreamdown } from './context.svelte.js';
	let { text }: { text: string } = $props();

	const streamdown = useStreamdown();
	const whitespaceOnlyPattern = /^\s+$/;
	let previousRenderedLength = $state(0);
	let committedText = $state('');

	const tokenizeNewContent = (text: string) => {
		if (!text) return [];

		let splitRegex;
		if (streamdown.animation.tokenize === 'word') {
			splitRegex = /(\s+)/;
		} else {
			splitRegex = /(.)/;
		}

		return text.split(splitRegex).filter((token) => token.length > 0);
	};

	const tokens = $derived.by(() => {
		let cursor = 0;
		let newAnimatedTokenIndex = 0;
		const stagger = streamdown.animation.stagger ?? 0;

		return tokenizeNewContent(text).map((token) => {
			const start = cursor;
			cursor += token.length;

			if (whitespaceOnlyPattern.test(token)) {
				return {
					content: token,
					animated: false,
					style: undefined
				};
			}

			const isAlreadyRendered = previousRenderedLength > 0 && start < previousRenderedLength;
			const duration = isAlreadyRendered ? 0 : streamdown.animation.duration;
			const delay = !isAlreadyRendered && stagger > 0 ? newAnimatedTokenIndex * stagger : 0;

			if (!isAlreadyRendered) {
				newAnimatedTokenIndex += 1;
			}

			return {
				content: token,
				animated: true,
				style: `--sd-animation:sd-${streamdown.animation.type};
--sd-duration:${duration}ms;
--sd-easing:${streamdown.animation.timingFunction};
${delay > 0 ? `--sd-delay:${delay}ms;\n` : ''}animation-name: var(--sd-animation);
animation-duration: var(--sd-duration);
animation-timing-function: var(--sd-easing);
animation-delay: var(--sd-delay, 0ms);
animation-iteration-count: 1;
animation-fill-mode: forwards;
white-space: pre-wrap;
display: inline-block;
text-decoration: inherit;`
			};
		});
	});

	$effect(() => {
		if (!(streamdown.animation.enabled && streamdown.isAnimating)) {
			previousRenderedLength = 0;
			committedText = '';
			return;
		}

		if (text !== committedText) {
			previousRenderedLength = committedText.length;
			committedText = text;
		}
	});
</script>

{#if streamdown.animation.enabled}
	{#each tokens as token}
		{#if token.animated}
			<span data-streamdown-animate="" style={token.style}>
				{token.content}
			</span>
		{:else}
			{token.content}
		{/if}
	{/each}
{:else}
	{text}
{/if}
