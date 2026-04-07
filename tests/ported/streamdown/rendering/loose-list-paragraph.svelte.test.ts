import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown loose list paragraph rendering', () => {
	testInBrowser('renders internal blank lines in list items as paragraph blocks', () => {
		const screen = render(Streamdown, {
			content: '- Item 1\n\n  Some paragraph\n- Item 2',
			static: true
		});

		const items = [...screen.container.querySelectorAll('li')];
		expect(items).toHaveLength(2);

		const firstItemParagraphs = [...items[0].querySelectorAll('p')].map((paragraph) =>
			paragraph.textContent?.trim()
		);
		expect(firstItemParagraphs).toEqual(['Item 1', 'Some paragraph']);

		const secondItemParagraphs = [...items[1].querySelectorAll('p')].map((paragraph) =>
			paragraph.textContent?.trim()
		);
		expect(secondItemParagraphs).toEqual([]);
		expect(items[1].textContent?.trim()).toBe('Item 2');
	});
});
