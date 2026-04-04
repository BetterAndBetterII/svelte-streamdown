<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { scale } from 'svelte/transition';
	import { downloadIcon } from './icons.js';
	import { Popover } from './popover.svelte.js';
	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { getMermaidSvgMarkup, svgToPngBlob } from '$lib/utils/mermaid.js';

	let {
		id,
		chart,
		renderSvg
	}: {
		id: string;
		chart: string;
		renderSvg?: () => Promise<string>;
	} = $props();

	const streamdown = useStreamdown();
	const popover = new Popover();

	useKeyDown({
		keys: ['Escape'],
		get isActive() {
			return popover.isOpen;
		},
		callback: () => {
			popover.isOpen = false;
		}
	});

	const clickOutside = useClickOutside({
		get isActive() {
			return popover.isOpen;
		},
		callback: () => {
			popover.isOpen = false;
		}
	});

	const getSvgMarkup = async (): Promise<string | null> => {
		return getMermaidSvgMarkup({ id, renderSvg });
	};

	const downloadSvg = async () => {
		try {
			const svgString = await getSvgMarkup();
			if (!svgString) return;

			save('diagram.svg', svgString, 'image/svg+xml');
			popover.isOpen = false;
		} catch (err) {
			console.error('Failed to download SVG:', err);
		}
	};

	const downloadPng = async () => {
		try {
			const svgString = await getSvgMarkup();
			if (!svgString) return;

			const blob = await svgToPngBlob(svgString);
			save('diagram.png', blob, 'image/png');
			popover.isOpen = false;
		} catch (err) {
			console.error('Failed to download PNG:', err);
		}
	};

	const download = async (type: 'SVG' | 'PNG') => {
		if (type === 'SVG') {
			await downloadSvg();
		} else {
			await downloadPng();
		}
	};
</script>

{#if popover.isOpen}
	<dialog
		id={'mermaid-download-popover'}
		aria-modal="false"
		transition:scale|global={{ start: 0.95, duration: 100 }}
		{@attach clickOutside.attachment}
		{@attach popover.popoverAttachment}
		open
		style:width="fit-content !important"
		style:min-width="fit-content !important"
		class={streamdown.theme.components.popover}
	>
		{#each ['PNG', 'SVG', 'MMD'] as type}
			{@const label =
				type === 'PNG'
					? streamdown.translations.downloadDiagramAsPng
					: type === 'SVG'
						? streamdown.translations.downloadDiagramAsSvg
						: streamdown.translations.downloadDiagramAsMmd}
			<button
				style="width: 100%; text-align: left; justify-content: flex-start; padding: 1rem 1rem; margin: 0.2rem 0;"
				onclick={async () => {
					if (type === 'MMD') {
						save('diagram.mmd', chart, 'text/plain');
						popover.isOpen = false;
						return;
					}
					await download(type as 'SVG' | 'PNG');
				}}
				class={streamdown.theme.components.button}
				title={label}
				aria-label={label}
			>
				{type === 'PNG'
					? streamdown.translations.mermaidFormatPng
					: type === 'SVG'
						? streamdown.translations.mermaidFormatSvg
						: streamdown.translations.mermaidFormatMmd}
			</button>
		{/each}
	</dialog>
{/if}

<button
	class={streamdown.theme.components.button}
	onclick={(e: MouseEvent) => {
		if (popover.isOpen) {
			popover.isOpen = false;
			return;
		}
		popover.reference = e.target as HTMLButtonElement;
		popover.isOpen = true;
	}}
	{@attach clickOutside.attachment}
	title={streamdown.translations.downloadDiagram}
	aria-label={streamdown.translations.downloadDiagram}
	data-panzoom-ignore
>
	{@render (streamdown.icons?.download || downloadIcon)()}
</button>
