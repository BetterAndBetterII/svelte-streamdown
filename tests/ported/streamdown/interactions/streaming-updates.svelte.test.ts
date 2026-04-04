import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown streaming update behavior', () => {
	testInBrowser(
		'fires animation lifecycle callbacks on streaming state transitions only',
		async () => {
			const onAnimationStart = vi.fn();
			const onAnimationEnd = vi.fn();

			const screen = render(StreamdownWithFutureProps, {
				content: 'content',
				isAnimating: false,
				onAnimationStart,
				onAnimationEnd
			});

			await screen.rerender({
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(onAnimationStart).toHaveBeenCalledTimes(1);
			});

			await screen.rerender({
				isAnimating: false
			});

			await vi.waitFor(() => {
				expect(onAnimationEnd).toHaveBeenCalledTimes(1);
			});

			const staticScreen = render(StreamdownWithFutureProps, {
				content: 'content',
				mode: 'static',
				isAnimating: false,
				onAnimationStart,
				onAnimationEnd
			});

			await staticScreen.rerender({
				mode: 'static',
				isAnimating: true
			});

			await staticScreen.rerender({
				mode: 'static',
				isAnimating: false
			});

			expect(onAnimationStart).toHaveBeenCalledTimes(1);
			expect(onAnimationEnd).toHaveBeenCalledTimes(1);
		}
	);

	testInBrowser(
		'hides the caret for an incomplete code fence and restores it when the fence closes',
		async () => {
			const screen = render(StreamdownWithFutureProps, {
				content: '```javascript\nconst x = 1;',
				caret: 'block',
				isAnimating: true
			});

			let wrapper = screen.container.firstElementChild as HTMLElement;
			expect(wrapper.style.getPropertyValue('--streamdown-caret')).toBe('');

			await screen.rerender({
				content: '```javascript\nconst x = 1;\n```',
				caret: 'block',
				isAnimating: true
			});

			await vi.waitFor(() => {
				wrapper = screen.container.firstElementChild as HTMLElement;
				expect(wrapper.style.getPropertyValue('--streamdown-caret')).toBe('" ▋"');
			});
		}
	);

	testInBrowser(
		'keeps existing list item spans mounted when a new list group appears',
		async () => {
			const animated = {
				animation: 'fadeIn',
				duration: 700,
				easing: 'ease-in-out',
				sep: 'char'
			} as const;

			const screen = render(StreamdownWithFutureProps, {
				content: '1. Item 1\n2. Item 2\n',
				animated,
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(
					screen.container.querySelectorAll('[data-streamdown-animate]').length
				).toBeGreaterThan(0);
			});

			const initialSpans = [
				...screen.container.querySelectorAll('[data-streamdown-animate]')
			] as HTMLElement[];

			await screen.rerender({
				content: '1. Item 1\n2. Item 2\n\n1. Item A\n',
				animated: {
					animation: 'fadeIn',
					duration: 700,
					easing: 'ease-in-out',
					sep: 'char'
				},
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(
					screen.container.querySelectorAll('[data-streamdown-animate]').length
				).toBeGreaterThan(initialSpans.length);
			});

			expect(initialSpans.filter((span) => !screen.container.contains(span))).toHaveLength(0);
		}
	);

	testInBrowser('keeps existing animated characters at 0ms when streamed text grows', async () => {
		const animated = {
			animation: 'fadeIn',
			duration: 700,
			easing: 'ease-in-out',
			sep: 'char'
		} as const;

		const screen = render(StreamdownWithFutureProps, {
			content: '- AB\n',
			animated,
			isAnimating: true
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelectorAll('[data-streamdown-animate]').length).toBe(2);
		});

		let spans = [
			...screen.container.querySelectorAll('[data-streamdown-animate]')
		] as HTMLElement[];
		expect(spans.map((span) => span.style.getPropertyValue('--sd-duration'))).toEqual([
			'700ms',
			'700ms'
		]);

		await screen.rerender({
			content: '- AB CD\n',
			animated: {
				animation: 'fadeIn',
				duration: 700,
				easing: 'ease-in-out',
				sep: 'char'
			},
			isAnimating: true
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelectorAll('[data-streamdown-animate]').length).toBe(4);
		});

		spans = [...screen.container.querySelectorAll('[data-streamdown-animate]')] as HTMLElement[];
		expect(spans.map((span) => span.style.getPropertyValue('--sd-duration'))).toEqual([
			'0ms',
			'0ms',
			'700ms',
			'700ms'
		]);
	});
});
