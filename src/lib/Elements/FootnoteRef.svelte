<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { FootnoteRef } from '$lib/marked/marked-footnotes.js';

	const streamdown = useStreamdown();

	const {
		token
	}: {
		token: FootnoteRef;
	} = $props();

	const id = $props.id();
</script>

{#if token.label !== 'streamdown:footnote'}
	<sup data-streamdown-sup={id} class={streamdown.theme.sup.base}>
		<a
			id={'footnote-ref-' + token.label}
			href={'#footnote-' + token.label}
			data-footnote-ref
			data-streamdown-footnote-ref={id}
			class={streamdown.theme.footnoteRef.base}
			aria-describedby="footnote-label"
			style={streamdown.animationBlockStyle}
		>
			{token.label.replace('^', '')}
		</a>
	</sup>
{/if}
