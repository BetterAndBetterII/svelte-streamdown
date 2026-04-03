import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import { expect, vi } from 'vitest';

describeInBrowser('ported streamdown image and footnote rendering', () => {
	testInBrowser('renders safe images with src and alt text', () => {
		const screen = render(Streamdown, {
			content: '![Example image](https://example.com/example.png)'
		});

		const image = screen.container.querySelector('img[alt="Example image"]');
		expect(image).toBeTruthy();
		expect(image?.getAttribute('src')).toBe('https://example.com/example.png');
	});

	testInBrowser('renders the approved local footnote popover interaction model', async () => {
		const screen = render(Streamdown, {
			content: ['Text with footnote[^1].', '', '[^1]: Footnote content for the popover.'].join('\n')
		});

		const trigger = screen.container.querySelector('[data-streamdown-footnote-ref]');
		expect(trigger).toBeTruthy();
		expect(trigger?.textContent).toBe('1');

		(trigger as HTMLButtonElement).click();

		await vi.waitFor(() => {
			const popover = document.querySelector('[data-streamdown-footnote-popover]');
			expect(popover).toBeTruthy();
			expect(popover?.textContent).toContain('Footnote content for the popover.');
		});
	});
});
