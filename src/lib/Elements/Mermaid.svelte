<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { Tokens } from 'marked';
	import type { MermaidConfig } from 'mermaid';
	import { usePanzoom } from '$lib/utils/panzoom.svelte';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import {
		checkIcon,
		copyIcon,
		fitViewIcon,
		fullscreenIcon,
		resolveIcon,
		zoomInIcon,
		zoomOutIcon
	} from './icons.js';
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
	let container: HTMLDivElement | null = $state(null);
	let mermaid = $state<any>(null);
	let svgContent = $state('');
	let lastValidSvg = $state('');
	let error = $state<string | null>(null);
	let retryCount = $state(0);
	let shouldRender = $state(false);

	onMount(async () => {
		if (!mermaidPlugin) {
			try {
				mermaid = (await import('mermaid')).default;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Mermaid library not available';
			}
		}

		if (import.meta.env.MODE === 'test') {
			shouldRender = true;
			return;
		}

		const requestIdleCallbackWrapper =
			typeof window !== 'undefined' && 'requestIdleCallback' in window
				? (
						callback: IdleRequestCallback,
						options?: IdleRequestOptions
					): number => window.requestIdleCallback(callback, options)
				: (callback: IdleRequestCallback): number => {
						const start = Date.now();
						return window.setTimeout(() => {
							callback({
								didTimeout: false,
								timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
							});
						}, 1);
					};
		const cancelIdleCallbackWrapper =
			typeof window !== 'undefined' && 'cancelIdleCallback' in window
				? (id: number) => window.cancelIdleCallback(id)
				: (id: number) => window.clearTimeout(id);

		if (!container) {
			return;
		}

		let renderTimeout: number | null = null;
		let idleCallback: number | null = null;
		const clearPendingRenders = () => {
			if (renderTimeout !== null) {
				window.clearTimeout(renderTimeout);
				renderTimeout = null;
			}
			if (idleCallback !== null) {
				cancelIdleCallbackWrapper(idleCallback);
				idleCallback = null;
			}
		};
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) {
						clearPendingRenders();
						continue;
					}

					clearPendingRenders();
					renderTimeout = window.setTimeout(() => {
						const records = observer.takeRecords();
						const isStillInView =
							records.length === 0 || (records.at(-1)?.isIntersecting ?? false);
						if (!isStillInView) {
							return;
						}

						idleCallback = requestIdleCallbackWrapper(
							(deadline) => {
								if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
									shouldRender = true;
									observer.disconnect();
									return;
								}

								idleCallback = requestIdleCallbackWrapper(() => {
									shouldRender = true;
									observer.disconnect();
								});
							},
							{ timeout: 500 }
						);
					}, 300);
				}
			},
			{
				rootMargin: '300px',
				threshold: 0
			}
		);

		observer.observe(container);

		return () => {
			clearPendingRenders();
			observer.disconnect();
		};
	});

	const panzoom = usePanzoom({
		activateMouseWheel: true,
		minZoom: 0.5,
		maxZoom: 4,
		zoomSpeed: 1
	});

	const MermaidErrorComponent = $derived(
		streamdown.components?.mermaidError ?? streamdown.mermaid?.errorComponent
	);
	const renderedSvg = $derived(svgContent || lastValidSvg);
	const chartSource = $derived(
		isIncomplete && token.text.length > 0 && !token.text.endsWith('\n')
			? `${token.text}\n`
			: token.text
	);
	const controls = $derived(streamdown.controls.mermaid);
	const showCopy = $derived(streamdown.controls.code && streamdown.codeControls.copy);
	const actionButtonDisabled = $derived(streamdown.isAnimating);
	const showActionBar = $derived(
		!!(mermaidPlugin || mermaid) &&
			controls.enabled &&
			(controls.download || controls.fullscreen || controls.panZoom || showCopy)
	);
	const copy = useCopy({
		get content() {
			return chartSource;
		}
	});

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
		if (panzoom.expanded) {
			shouldRender = true;
		}
	});

	$effect(() => {
		const chart = chartSource;
		const currentRetry = retryCount;
		const currentMermaid = mermaid;
		const currentConfig = streamdown.mermaidConfig;
		const scheduledToRender = shouldRender;

		if (!scheduledToRender) {
			return;
		}

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

<div bind:this={container} data-streamdown-mermaid={id}>
	<div
		style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		class={streamdown.theme.mermaid.base}
		data-expanded={panzoom.expanded ? 'true' : 'false'}
	>
		<span class={streamdown.theme.code.language}>mermaid</span>
		{#if showActionBar}
			<div class={streamdown.theme.mermaid.buttons}>
				{#if controls.download}
					<MermaidDownload {id} chart={chartSource} renderSvg={() => renderSvgMarkup(chartSource)} />
				{/if}
				{#if showCopy}
					<button
						class={streamdown.theme.components.button}
						title={streamdown.translations.copyCode}
						type="button"
						onclick={() => {
							if (!actionButtonDisabled) {
								void copy.copy();
							}
						}}
						disabled={actionButtonDisabled}
						data-panzoom-ignore
					>
						{#if copy.isCopied}
							{@render resolveIcon(streamdown.icons, 'check', checkIcon)()}
						{:else}
							{@render resolveIcon(streamdown.icons, 'copy', copyIcon)()}
						{/if}
					</button>
				{/if}
				{#if controls.fullscreen}
					<button
						class={streamdown.theme.components.button}
						title={panzoom.expanded
							? streamdown.translations.exitFullscreen
							: streamdown.translations.viewFullscreen}
						type="button"
						onclick={() => panzoom.toggleExpand()}
						disabled={actionButtonDisabled}
						data-panzoom-ignore
					>
						{@render resolveIcon(streamdown.icons, 'fullscreen', fullscreenIcon)()}
					</button>
				{/if}
				{#if controls.panZoom && renderedSvg}
					<button
						class={streamdown.theme.components.button}
						title="Zoom in"
						type="button"
						onclick={() => panzoom.zoomIn()}
						data-panzoom-ignore
					>
						{@render resolveIcon(streamdown.icons, 'zoomIn', zoomInIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						title="Zoom out"
						type="button"
						onclick={() => panzoom.zoomOut()}
						data-panzoom-ignore
					>
						{@render resolveIcon(streamdown.icons, 'zoomOut', zoomOutIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						title="Reset zoom and pan"
						type="button"
						onclick={() => panzoom.zoomToFit()}
						data-panzoom-ignore
					>
						{@render resolveIcon(streamdown.icons, 'fitView', fitViewIcon)()}
					</button>
				{/if}
			</div>
		{/if}

		{#if renderedSvg}
			<div {@attach panzoom.attach} role="application">
				<div data-mermaid-svg aria-label="Mermaid chart" role="img">
					{@html renderedSvg}
				</div>
			</div>
		{:else if error}
			{#if MermaidErrorComponent}
				<MermaidErrorComponent chart={chartSource} {error} {id} retry={retryRender} />
			{:else}
				<div class="rounded-md bg-red-50 p-4" data-streamdown-mermaid-error>
					<p class="font-mono text-sm text-red-700">Mermaid Error: {error}</p>
					<details class="mt-2">
						<summary class="cursor-pointer text-xs text-red-600">Show Code</summary>
						<pre class="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-800">
{chartSource}</pre>
					</details>
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
