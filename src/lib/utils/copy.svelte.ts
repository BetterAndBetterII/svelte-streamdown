import { onDestroy } from 'svelte';
import { isTestMode } from './runtime-env.js';

export const useCopy = (opts: { content: string; timeout?: number }) => {
	let isCopied = $state(false);
	let timeoutId: number | undefined;
	const copy = async () => {
		if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
			if (!isTestMode()) {
				console.error('Clipboard API not available');
			}
			return;
		}

		try {
			await navigator.clipboard.writeText(opts.content);
			isCopied = true;

			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = window.setTimeout(() => {
				isCopied = false;
			}, opts.timeout ?? 2000);
		} catch (error) {
			if (!isTestMode()) {
				console.error('Failed to copy to clipboard:', error);
			}
		}
	};

	onDestroy(() => {
		if (timeoutId) clearTimeout(timeoutId);
	});

	return {
		get isCopied() {
			return isCopied;
		},
		copy
	};
};
