import { getContext } from 'svelte';
import { hasIncompleteCodeFence as detectIncompleteCodeFence } from './utils/code-block.js';

export const STREAMDOWN_BLOCK_CONTEXT = 'STREAMDOWN_BLOCK';

type StreamdownBlockContext = {
	isIncompleteCodeFence: boolean;
};

const TABLE_DELIMITER_PATTERN = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;

export const hasIncompleteCodeFence = detectIncompleteCodeFence;

export const hasTable = (markdown: string): boolean => {
	for (const line of markdown.split('\n')) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || !trimmed.includes('|')) {
			continue;
		}

		if (TABLE_DELIMITER_PATTERN.test(trimmed)) {
			return true;
		}
	}

	return false;
};

export function useIsCodeFenceIncomplete(): boolean {
	return Boolean(
		getContext<StreamdownBlockContext | undefined>(STREAMDOWN_BLOCK_CONTEXT)?.isIncompleteCodeFence
	);
}
