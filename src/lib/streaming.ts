export const carets = {
	block: ' ▋',
	circle: ' ●'
} as const;

const CODE_FENCE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})/;
const TABLE_DELIMITER_PATTERN = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;

export const hasIncompleteCodeFence = (markdown: string): boolean => {
	const lines = markdown.split('\n');
	let openFenceChar: string | null = null;
	let openFenceLength = 0;

	for (const line of lines) {
		const match = CODE_FENCE_PATTERN.exec(line);

		if (openFenceChar === null) {
			if (match) {
				const fenceRun = match[1];
				openFenceChar = fenceRun[0];
				openFenceLength = fenceRun.length;
			}
			continue;
		}

		if (!match) {
			continue;
		}

		const fenceRun = match[1];
		if (fenceRun[0] === openFenceChar && fenceRun.length >= openFenceLength) {
			openFenceChar = null;
			openFenceLength = 0;
		}
	}

	return openFenceChar !== null;
};

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
