<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { scale } from 'svelte/transition';
	import { checkIcon, copyIcon, downloadIcon, resolveIcon } from './icons.js';
	import { Popover } from './popover.svelte.js';
	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { save } from '$lib/utils/save.js';
	import {
		extractTableDataFromElement,
		tableDataToCSV,
		tableDataToMarkdown,
		tableDataToTSV
	} from '$lib/utils/table.js';

	let {
		showCopy = true,
		showDownload = true,
		targetSelector
	}: {
		showCopy?: boolean;
		showDownload?: boolean;
		targetSelector: string;
	} = $props();
	const streamdown = useStreamdown();
	const popover = new Popover();
	let modeState = $state<'download' | 'copy'>('download');

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

	let copyValue = $state('');

	const copy = useCopy({
		get content() {
			return copyValue;
		}
	});

	const copyOrDownload = async (type: 'Markdown' | 'CSV' | 'TSV') => {
		const tableRoot = document.querySelector(targetSelector);
		const table = tableRoot?.querySelector('table');
		if (!table) {
			popover.isOpen = false;
			return;
		}

		const tableData = extractTableDataFromElement(table);
		if (type === 'Markdown') {
			copyValue = tableDataToMarkdown(tableData);
			if (modeState === 'copy') {
				if (
					typeof navigator?.clipboard?.write === 'function' &&
					typeof ClipboardItem !== 'undefined'
				) {
					const html = table.outerHTML;
					const plainText = copyValue;
					try {
						await navigator.clipboard.write([
							new ClipboardItem({
								'text/plain': new Blob([plainText], { type: 'text/plain' }),
								'text/html': new Blob([html], { type: 'text/html' })
							})
						]);
					} catch {
						await copy.copy();
					}
				} else {
					await copy.copy();
				}
			} else {
				save('table.md', copyValue, 'text/markdown');
			}
		} else if (type === 'CSV') {
			copyValue = tableDataToCSV(tableData);
			if (modeState === 'copy') {
				if (
					typeof navigator?.clipboard?.write === 'function' &&
					typeof ClipboardItem !== 'undefined'
				) {
					try {
						await navigator.clipboard.write([
							new ClipboardItem({
								'text/plain': new Blob([copyValue], { type: 'text/plain' }),
								'text/html': new Blob([table.outerHTML], { type: 'text/html' })
							})
						]);
					} catch {
						await copy.copy();
					}
				} else {
					await copy.copy();
				}
			} else {
				save('table.csv', copyValue, 'text/csv');
			}
		} else {
			copyValue = tableDataToTSV(tableData);
			await copy.copy();
		}

		popover.isOpen = false;
	};

	const menuOptions = $derived(
		modeState === 'download' ? ['Markdown', 'CSV'] : ['Markdown', 'CSV', 'TSV']
	);
	const buttonModes = $derived(
		[showCopy ? 'copy' : null, showDownload ? 'download' : null].filter(
			(mode): mode is 'download' | 'copy' => mode !== null
		)
	);
</script>

{#if popover.isOpen}
	<dialog
		id={'table-download-popover'}
		aria-modal="false"
		transition:scale|global={{ start: 0.95, duration: 100 }}
		{@attach clickOutside.attachment}
		{@attach popover.popoverAttachment}
		open
		style:width="fit-content !important"
		style:min-width="fit-content !important"
		class={streamdown.theme.components.popover}
	>
		{#each menuOptions as type}
			{@const label =
				modeState === 'download'
					? type === 'Markdown'
						? streamdown.translations.downloadTableAsMarkdown
						: streamdown.translations.downloadTableAsCsv
					: type === 'Markdown'
						? streamdown.translations.copyTableAsMarkdown
						: type === 'CSV'
							? streamdown.translations.copyTableAsCsv
							: streamdown.translations.copyTableAsTsv}
			<button
				style="width: 100%; text-align: left; justify-content: flex-start; padding: 1rem 1rem; margin: 0.2rem 0;"
				onclick={() => copyOrDownload(type as 'Markdown' | 'CSV' | 'TSV')}
				class={streamdown.theme.components.button}
				title={label}
				type="button"
			>
				{type === 'Markdown'
					? streamdown.translations.tableFormatMarkdown
					: type === 'CSV'
						? streamdown.translations.tableFormatCsv
						: streamdown.translations.tableFormatTsv}
			</button>
		{/each}
	</dialog>
{/if}

{#if buttonModes.length > 0}
	<div
		data-streamdown-table-download
		class=" right-0 ml-auto flex items-center justify-end gap-2 p-1"
	>
		{#each buttonModes as mode (mode)}
			<button
				class={streamdown.theme.components.button}
				onclick={async (e: MouseEvent) => {
					if (streamdown.isAnimating) {
						return;
					}
					if (modeState === mode && popover.isOpen) {
						popover.isOpen = false;
						return;
					}
					if (popover.isOpen && modeState !== mode) {
						popover.isOpen = false;
						const wait = new Promise((resolve) => {
							setTimeout(resolve, 80);
						});
						await wait;
					}
					popover.reference = e.target as HTMLButtonElement;
					popover.isOpen = true;
					modeState = mode as 'download' | 'copy';
				}}
				{@attach clickOutside.attachment}
				title={mode === 'download'
					? streamdown.translations.downloadTable
					: streamdown.translations.copyTable}
				disabled={streamdown.isAnimating}
				type="button"
			>
				{#if mode === 'download'}
					{@render resolveIcon(streamdown.icons, 'download', downloadIcon)()}
				{:else if copy.isCopied}
					{@render resolveIcon(streamdown.icons, 'check', checkIcon)()}
				{:else}
					{@render resolveIcon(streamdown.icons, 'copy', copyIcon)()}
				{/if}
			</button>
		{/each}
	</div>
{/if}

<style>
	:global([data-streamdown-table-download] + div) {
		margin-top: 0px;
	}
</style>
