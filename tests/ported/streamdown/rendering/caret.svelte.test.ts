import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown caret rendering', () => {
	testInBrowser('renders block and circle carets while streaming animation is active', async () => {
		const screen = render(Streamdown, {
			content: 'Streaming content',
			caret: 'block',
			isAnimating: true
		});

		expect(
			(screen.container.firstElementChild as HTMLElement).style.getPropertyValue(
				'--streamdown-caret'
			)
		).toBe('" ▋"');

		await screen.rerender({
			content: 'Streaming content updated',
			caret: 'circle',
			isAnimating: true
		});

		await vi.waitFor(() => {
			expect(
				(screen.container.firstElementChild as HTMLElement).style.getPropertyValue(
					'--streamdown-caret'
				)
			).toBe('" ●"');
		});
	});

	testInBrowser('adds and removes caret styles as animation state changes', async () => {
		const screen = render(Streamdown, {
			content: 'Hello world',
			caret: 'block',
			isAnimating: false
		});

		expect(
			(screen.container.firstElementChild as HTMLElement).style.getPropertyValue(
				'--streamdown-caret'
			)
		).toBe('');

		await screen.rerender({
			content: 'Hello world',
			caret: 'block',
			isAnimating: true
		});

		await vi.waitFor(() => {
			expect(
				(screen.container.firstElementChild as HTMLElement).style.getPropertyValue(
					'--streamdown-caret'
				)
			).toBe('" ▋"');
		});

		await screen.rerender({
			content: 'Hello world',
			caret: undefined,
			isAnimating: true
		});

		await vi.waitFor(() => {
			expect(
				(screen.container.firstElementChild as HTMLElement).style.getPropertyValue(
					'--streamdown-caret'
				)
			).toBe('');
		});
	});

	testInBrowser('shows an empty caret placeholder for empty content', () => {
		const screen = render(Streamdown, {
			content: '',
			caret: 'block',
			isAnimating: true
		});

		expect(screen.container.querySelector('span')).toBeTruthy();
		expect(screen.container.querySelector('[data-streamdown-caret-placeholder]')).toBeNull();
	});

	testInBrowser('does not apply caret styles in static mode', () => {
		const screen = render(Streamdown, {
			content: 'Completed content',
			caret: 'block',
			isAnimating: true,
			mode: 'static'
		});

		expect(
			(screen.container.firstElementChild as HTMLElement).style.getPropertyValue(
				'--streamdown-caret'
			)
		).toBe('');
	});
});
