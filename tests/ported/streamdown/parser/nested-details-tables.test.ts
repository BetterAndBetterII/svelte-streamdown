import { expect } from 'vitest';
import { describeInNode, testInNode, parseMarkdownBlocks } from '../../../helpers/index.js';

describeInNode('ported streamdown nested details elements (parseBlocks)', () => {
	testInNode('keeps nested same-tag HTML blocks as a single balanced block', () => {
		const markdown = `Text before

<details>
<summary>Outer</summary>

<details>
<summary>Inner</summary>

Inner content

</details>

Outer content after inner closes

</details>

Text after`;

		const blocks = parseMarkdownBlocks(markdown);
		const detailsBlock = blocks.find((b) => b.includes('<details>'));

		const openCount = (detailsBlock?.match(/<details>/g) ?? []).length;
		const closeCount = (detailsBlock?.match(/<\/details>/g) ?? []).length;
		expect(openCount).toBe(2);
		expect(closeCount).toBe(2);
		expect(detailsBlock).toContain('Outer content after inner closes');
		expect(detailsBlock).not.toContain('Text after');
	});

	testInNode('handles triple-nested same-tag HTML blocks', () => {
		const markdown = `<details>
<summary>L1</summary>

<details>
<summary>L2</summary>

<details>
<summary>L3</summary>

Deep content

</details>

</details>

</details>`;

		const blocks = parseMarkdownBlocks(markdown);
		const detailsBlock = blocks.find((b) => b.includes('<details>'));

		const openCount = (detailsBlock?.match(/<details>/g) ?? []).length;
		const closeCount = (detailsBlock?.match(/<\/details>/g) ?? []).length;
		expect(openCount).toBe(3);
		expect(closeCount).toBe(3);
	});
});
