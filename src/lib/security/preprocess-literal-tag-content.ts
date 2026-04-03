const MARKDOWN_ESCAPE_RE = /([\\`*_~[\]|])/g;

const escapeMarkdown = (text: string): string => text.replace(MARKDOWN_ESCAPE_RE, '\\$1');

export const preprocessLiteralTagContent = (markdown: string, tagNames: string[]): string => {
	if (!tagNames.length) {
		return markdown;
	}

	let result = markdown;

	for (const tagName of tagNames) {
		const pattern = new RegExp(
			`(<${tagName}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${tagName}\\s*>)`,
			'gi'
		);

		result = result.replace(pattern, (_match, open: string, content: string, close: string) => {
			const escaped = escapeMarkdown(content).replace(/\n\n/g, '&#10;&#10;');
			return open + escaped + close;
		});
	}

	return result;
};
