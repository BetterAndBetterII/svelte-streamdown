<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { Tokens } from 'marked';
	import type { MermaidConfig } from 'mermaid';
	import { usePanzoom } from '$lib/utils/panzoom.svelte';
	import { fitViewIcon, fullscreenIcon, zoomInIcon, zoomOutIcon } from './icons.js';
	import MermaidDownload from './MermaidDownload.svelte';

	const streamdown = useStreamdown();

	const {
		token,
		id,
		isIncomplete = false
	}: {
		token: Tokens.Code;
		id: string;
		isIncomplete?: boolean;
	} = $props();

	const mermaidPlugin = $derived(streamdown.plugins?.mermaid ?? null);
	let mermaid = $state<any>(null);
	let svgContent = $state('');
	let lastValidSvg = $state('');
	let error = $state<string | null>(null);
	let retryCount = $state(0);

	onMount(async () => {
		if (!mermaidPlugin) {
			try {
				mermaid = (await import('mermaid')).default;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Mermaid library not available';
			}
		}
	});

	const panzoom = usePanzoom({
		activateMouseWheel: true,
		minZoom: 0.5,
		maxZoom: 4,
		zoomSpeed: 1
	});

	const MermaidErrorComponent = $derived(streamdown.components?.mermaidError);
	const renderedSvg = $derived(svgContent || lastValidSvg);
	const controls = $derived(streamdown.controls.mermaid);
	const showActionBar = $derived(
		!!(mermaidPlugin || mermaid) &&
			controls.enabled &&
			(controls.download || controls.fullscreen || controls.panZoom)
	);

	const createRenderId = (chart: string) => {
		const chartHash = chart.split('').reduce((acc, char) => {
			return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
		}, 0);

		return `mermaid-${Math.abs(chartHash)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	};

	const renderSvgMarkup = async (
		chart: string,
		mermaidConfig: MermaidConfig | undefined = streamdown.mermaidConfig,
		mermaidInstance: any = mermaid
	): Promise<string> => {
		const defaultConfig: MermaidConfig = {
			theme: 'base',
			startOnLoad: false,
			securityLevel: 'strict',
			fontFamily: 'monospace',
			suppressErrorRendering: true,
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true,
				curve: 'basis'
			},
			...(mermaidConfig || {})
		};

		const resolvedMermaidInstance = mermaidPlugin
			? mermaidPlugin.getMermaid(defaultConfig)
			: mermaidInstance;

		if (!resolvedMermaidInstance) {
			throw new Error('Mermaid library not available');
		}

		resolvedMermaidInstance.initialize(defaultConfig);

		const { svg } = await resolvedMermaidInstance.render(createRenderId(chart), chart);
		return svg;
	};

	const retryRender = () => {
		retryCount += 1;
	};

	$effect(() => {
		const chart = token.text;
		const currentRetry = retryCount;
		const currentMermaid = mermaid;
		const currentConfig = streamdown.mermaidConfig;

		if (!mermaidPlugin && !currentMermaid) {
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				const svg = await renderSvgMarkup(chart, currentConfig, currentMermaid);
				if (cancelled) {
					return;
				}

				error = null;
				svgContent = svg;
				lastValidSvg = svg;
			} catch (err) {
				if (cancelled) {
					return;
				}
				if (!(lastValidSvg || svgContent)) {
					error = err instanceof Error ? err.message : 'Failed to render Mermaid chart';
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const currentSvg = renderedSvg;

		if (!currentSvg) {
			return;
		}

		void tick().then(() => {
			panzoom.zoomToFit();
		});
	});
</script>

<div data-streamdown-mermaid={id} data-incomplete={isIncomplete || undefined}>
	<div
		style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		class={streamdown.theme.mermaid.base}
		data-expanded={panzoom.expanded ? 'true' : 'false'}
	>
		{#if showActionBar}
			<div class={streamdown.theme.mermaid.buttons}>
				{#if controls.panZoom}
					<button
						class={streamdown.theme.components.button}
						aria-label="Zoom to fit"
						title="Zoom to fit"
						onclick={() => panzoom.zoomToFit()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.fitView || fitViewIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						aria-label="Zoom in"
						title="Zoom in"
						onclick={() => panzoom.zoomIn()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.zoomIn || zoomInIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						aria-label="Zoom out"
						title="Zoom out"
						onclick={() => panzoom.zoomOut()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.zoomOut || zoomOutIcon)()}
					</button>
				{/if}
				{#if controls.fullscreen}
					<button
						class={streamdown.theme.components.button}
						aria-label={panzoom.expanded
							? streamdown.translations.exitFullscreen
							: streamdown.translations.viewFullscreen}
						title={panzoom.expanded
							? streamdown.translations.exitFullscreen
							: streamdown.translations.viewFullscreen}
						onclick={() => panzoom.toggleExpand()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.fullscreen || fullscreenIcon)()}
					</button>
				{/if}
				{#if controls.download}
					<MermaidDownload {id} chart={token.text} renderSvg={() => renderSvgMarkup(token.text)} />
				{/if}
			</div>
		{/if}

		{#if renderedSvg}
			<div {@attach panzoom.attach} data-mermaid-svg aria-label="Mermaid chart" role="img">
				{@html renderedSvg}
			</div>
		{:else if error}
			{#if MermaidErrorComponent}
				<MermaidErrorComponent chart={token.text} {error} {id} retry={retryRender} />
			{:else}
				<div class="rounded-md bg-red-50 p-4" data-streamdown-mermaid-error>
					<p class="font-mono text-sm text-red-700">Mermaid Error: {error}</p>
					<details class="mt-2">
						<summary class="cursor-pointer text-xs text-red-600">Show Code</summary>
						<pre class="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-800">
{token.text}</pre>
					</details>
					<button type="button" class={streamdown.theme.components.button} onclick={retryRender}>
						Retry
					</button>
				</div>
			{/if}
		{:else}
			<div data-mermaid-placeholder></div>
		{/if}
	</div>
</div>

<style>
	:global([data-expanded='true']) {
		position: fixed;
		top: 16px;
		left: 16px;
		width: calc(100vw - 32px);
		height: calc(100vh - 32px);
		z-index: 2147483647;
		margin: 0px;
	}

	:global(div[id^='dmermaid-']) {
		position: absolute !important;
		left: -9999px !important;
		top: -9999px !important;
		visibility: hidden !important;
		pointer-events: none !important;
	}
</style>
