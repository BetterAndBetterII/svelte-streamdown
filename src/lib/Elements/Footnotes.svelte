<script lang="ts">
	import type { Footnote } from '$lib/marked/marked-footnotes.js';
	import { useStreamdown } from '$lib/context.svelte.js';
	import Block from '$lib/Block.svelte';

	const {
		entries
	}: {
		entries: Footnote[];
	} = $props();

	const streamdown = useStreamdown();

	const visibleEntries = $derived.by(() =>
		entries
			.map((entry) => ({
				...entry,
				content: entry.lines.join('\n').trim()
			}))
			.filter((entry) => entry.label !== 'streamdown:footnote' && entry.content.length > 0)
	);
</script>

{#if visibleEntries.length > 0}
	<section data-footnotes class="footnotes">
		<h2 id="footnote-label" class="sr-only">Footnotes</h2>
		<ol class={streamdown.theme.ol.base}>
			{#each visibleEntries as entry}
				<li
					id={'footnote-' + entry.label}
					data-streamdown="list-item"
					class={streamdown.theme.li.base}
				>
					<Block static={true} block={entry.content} tokens={entry.tokens} />
					<a
						href={'#footnote-ref-' + entry.label}
						data-footnote-backref
						class={streamdown.theme.footnoteRef.base}
						aria-label={'Back to reference ' + entry.label}
					>
						↩
					</a>
				</li>
			{/each}
		</ol>
	</section>
{/if}
