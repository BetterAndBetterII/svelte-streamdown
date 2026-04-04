<script lang="ts">
	import { useStreamdown, type LinkSafetyModalProps } from '$lib/context.svelte.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { checkIcon, copyIcon } from './icons.js';

	let { url, isOpen, onClose, onConfirm }: LinkSafetyModalProps = $props();

	const streamdown = useStreamdown();
	const copy = useCopy({
		get content() {
			return url;
		}
	});

	const handleCopy = async () => {
		await copy.copy();
	};

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	$effect(() => {
		if (!isOpen || typeof document === 'undefined') {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = previousOverflow;
		};
	});
</script>

{#if isOpen}
	<div
		data-streamdown="link-safety-modal"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
		role="button"
		tabindex="0"
		aria-label={streamdown.translations.close}
		onclick={onClose}
		onkeydown={(event) => {
			if (event.key === 'Escape') {
				onClose();
			}
		}}
	>
		<div
			role="presentation"
			class="relative flex w-full max-w-md flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<button
				type="button"
				class="absolute top-4 right-4 rounded-md px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
				title={streamdown.translations.close}
				aria-label={streamdown.translations.close}
				onclick={onClose}
			>
				{streamdown.translations.close}
			</button>

			<div class="flex flex-col gap-2 pr-12">
				<h2 class="text-lg font-semibold text-gray-900">
					{streamdown.translations.openExternalLink}
				</h2>
				<p class="text-sm text-gray-600">{streamdown.translations.externalLinkWarning}</p>
			</div>

			<div
				class={`rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-sm break-all text-gray-700 ${
					url.length > 100 ? 'max-h-32 overflow-y-auto' : ''
				}`}
			>
				{url}
			</div>

			<div class="flex gap-2">
				<button
					type="button"
					class="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					onclick={() => void handleCopy()}
				>
					<span class="h-4 w-4">
						{#if copy.isCopied}
							{@render (streamdown.icons?.check || checkIcon)()}
						{:else}
							{@render (streamdown.icons?.copy || copyIcon)()}
						{/if}
					</span>
					<span
						>{copy.isCopied
							? streamdown.translations.copied
							: streamdown.translations.copyLink}</span
					>
				</button>
				<button
					type="button"
					class="flex flex-1 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
					onclick={handleConfirm}
				>
					{streamdown.translations.openLink}
				</button>
			</div>
		</div>
	</div>
{/if}
