<script lang="ts">
	import { useStreamdown, type TableControlsConfig } from '$lib/context.svelte.js';
	import { fullscreenIcon } from './icons.js';
	import TableDownload from './TableDownload.svelte';

	let {
		id,
		children
	}: {
		id: string;
		children?: import('svelte').Snippet;
	} = $props();

	const streamdown = useStreamdown();

	const resolveControls = (
		controls: TableControlsConfig
	): {
		showControls: boolean;
		showCopy: boolean;
		showDownload: boolean;
		showFullscreen: boolean;
	} => {
		if (controls === false) {
			return {
				showControls: false,
				showCopy: false,
				showDownload: false,
				showFullscreen: false
			};
		}

		if (controls === true || controls === undefined) {
			return {
				showControls: true,
				showCopy: true,
				showDownload: true,
				showFullscreen: true
			};
		}

		const resolved = {
			showControls: true,
			showCopy: controls.copy !== false,
			showDownload: controls.download !== false,
			showFullscreen: controls.fullscreen !== false
		};

		return {
			...resolved,
			showControls: resolved.showCopy || resolved.showDownload || resolved.showFullscreen
		};
	};

	const tableControls = $derived(resolveControls(streamdown.controls.table));
	let isFullscreen = $state(false);
</script>

<div class="my-4 flex flex-col gap-2" data-streamdown="table-wrapper">
	{#if tableControls.showControls}
		<div class="flex items-center justify-end gap-1">
			<TableDownload
				showCopy={tableControls.showCopy}
				showDownload={tableControls.showDownload}
				targetSelector={`[data-streamdown-table="${id}"]`}
			/>
			{#if tableControls.showFullscreen}
				<button
					class={streamdown.theme.components.button}
					title={streamdown.translations.viewFullscreen}
					aria-label={streamdown.translations.viewFullscreen}
					type="button"
					onclick={() => {
						isFullscreen = true;
					}}
				>
					{@render (streamdown.icons?.fullscreen || fullscreenIcon)()}
				</button>
			{/if}
		</div>
	{/if}

	<div
		data-streamdown-table={id}
		class={`${streamdown.theme.table.base} group`}
		style:overscroll-behavior-x="none"
	>
		<table data-streamdown="table" class={streamdown.theme.table.table}>
			{@render children?.()}
		</table>
	</div>
</div>

{#if isFullscreen}
	<div
		data-streamdown="table-fullscreen"
		class="fixed inset-0 z-50 flex flex-col bg-background p-4"
		role="dialog"
		aria-modal="true"
		aria-label={streamdown.translations.viewFullscreen}
	>
		<div class="flex items-center justify-end gap-1 pb-4">
			<TableDownload
				showCopy={tableControls.showCopy}
				showDownload={tableControls.showDownload}
				targetSelector={`[data-streamdown-table-fullscreen="${id}"]`}
			/>
			<button
				class={streamdown.theme.components.button}
				title={streamdown.translations.exitFullscreen}
				aria-label={streamdown.translations.exitFullscreen}
				type="button"
				onclick={() => {
					isFullscreen = false;
				}}
			>
				X
			</button>
		</div>

		<div data-streamdown-table-fullscreen={id} class="flex-1 overflow-auto">
			<table data-streamdown="table" class={streamdown.theme.table.table}>
				{@render children?.()}
			</table>
		</div>
	</div>
{/if}
