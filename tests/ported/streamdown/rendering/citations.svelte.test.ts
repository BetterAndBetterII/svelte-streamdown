import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const sources = {
	alpha: {
		title: 'Alpha Source',
		url: 'https://alpha.example.com/report',
		content: 'Alpha summary content.'
	},
	beta: {
		title: 'Beta Source',
		url: 'https://beta.example.com/post',
		content: 'Beta summary content.'
	}
};

describeInBrowser('inline citation widgets', () => {
	testInBrowser('renders list-mode citations with linked source entries', () => {
		const screen = render(Streamdown, {
			content: 'List mode [alpha] [beta]',
			sources,
			inlineCitationsMode: 'list'
		});

		const preview = screen.container.querySelector('[data-streamdown-citation-preview]');
		expect(preview).toBeTruthy();
		expect(preview?.textContent).toContain('alpha.example.com');
		expect(preview?.textContent).toContain('+1');

		(preview as HTMLButtonElement).click();

		return vi.waitFor(() => {
			const popover = document.querySelector('[data-streamdown-citation-popover]');
			expect(popover).toBeTruthy();

			const links = [...(popover?.querySelectorAll('a[href]') ?? [])].map((link) =>
				link.getAttribute('href')
			);
			expect(links).toEqual(['https://alpha.example.com/report', 'https://beta.example.com/post']);
			expect(popover?.textContent).toContain('Alpha Source');
			expect(popover?.textContent).toContain('Beta Source');
		});
	});

	testInBrowser('renders carousel-mode citations with navigation controls', async () => {
		const screen = render(Streamdown, {
			content: 'Carousel mode [alpha] [beta]',
			sources,
			inlineCitationsMode: 'carousel'
		});

		const preview = screen.container.querySelector('[data-streamdown-citation-preview]');
		expect(preview).toBeTruthy();

		(preview as HTMLButtonElement).click();

		await vi.waitFor(() => {
			const popover = document.querySelector('[data-streamdown-citation-popover]');
			expect(popover?.textContent).toContain('Alpha Source');
			expect(popover?.textContent).toContain('Alpha summary content.');
			expect(popover?.textContent?.replace(/\s+/g, ' ')).toContain('1 / 2');
		});

		const popover = document.querySelector('[data-streamdown-citation-popover]');
		const nextButton = popover?.querySelectorAll('button')[1] as HTMLButtonElement | undefined;
		expect(nextButton).toBeTruthy();

		nextButton?.click();

		await vi.waitFor(() => {
			expect(popover?.textContent).toContain('Beta Source');
			expect(popover?.textContent).toContain('Beta summary content.');
			expect(popover?.textContent?.replace(/\s+/g, ' ')).toContain('2 / 2');
		});
	});
});
