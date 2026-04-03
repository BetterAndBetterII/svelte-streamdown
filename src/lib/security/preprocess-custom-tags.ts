export const preprocessCustomTags = (markdown: string, tagNames: string[]): string => {
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
			if (!content.includes('\n\n')) {
				return open + content + close;
			}

			const fixedContent = content.replace(/\n\n/g, '\n<!---->\n');
			const paddedContent =
				(fixedContent.startsWith('\n') ? '' : '\n') +
				fixedContent +
				(fixedContent.endsWith('\n') ? '' : '\n');

			return `${open}${paddedContent}${close}\n\n`;
		});
	}

	return result;
};
