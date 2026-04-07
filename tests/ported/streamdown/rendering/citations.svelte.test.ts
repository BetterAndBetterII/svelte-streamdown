import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

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

	testInBrowser(
		'keeps carousel navigation live when sources expand after the popover is already open',
		async () => {
			const screen = render(StreamdownWithFutureProps, {
				content: 'Carousel mode [alpha] [beta]',
				sources: {
					alpha: sources.alpha
				},
				inlineCitationsMode: 'carousel'
			});

			const preview = screen.container.querySelector(
				'[data-streamdown-citation-preview]'
			) as HTMLButtonElement | null;
			expect(preview).toBeTruthy();

			preview?.click();

			await vi.waitFor(() => {
				const popover = document.querySelector('[data-streamdown-citation-popover]');
				expect(popover?.textContent).toContain('Alpha Source');
				expect(popover?.textContent?.replace(/\s+/g, ' ')).not.toContain('1 / 2');
			});

			await screen.rerender({
				content: 'Carousel mode [alpha] [beta]',
				sources,
				inlineCitationsMode: 'carousel'
			});

			await vi.waitFor(() => {
				const popover = document.querySelector('[data-streamdown-citation-popover]');
				const buttons = popover?.querySelectorAll('button') ?? [];
				const nextButton = buttons[1] as HTMLButtonElement | undefined;

				expect(preview?.textContent).toContain('+1');
				expect(popover?.textContent?.replace(/\s+/g, ' ')).toContain('1 / 2');
				expect(nextButton).toBeTruthy();
				expect(nextButton?.disabled).toBe(false);
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
		}
	);
});
