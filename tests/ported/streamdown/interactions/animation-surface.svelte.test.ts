import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown animation surface', () => {
	testInBrowser(
		'animated compatibility wraps words, preserves text flow, and skips inline code',
		() => {
			const screen = render(StreamdownWithFutureProps, {
				content: 'Hello `world` foo',
				animated: {
					animation: 'fadeIn',
					duration: 150,
					easing: 'ease',
					sep: 'word'
				},
				isAnimating: true
			});

			const spans = [
				...screen.container.querySelectorAll('[data-streamdown-animate]')
			] as HTMLElement[];
			expect(spans.map((span) => span.textContent)).toEqual(['Hello', 'foo']);
			expect(screen.container.querySelector('code [data-streamdown-animate]')).toBeNull();
			expect(screen.container.textContent).toContain('Hello world foo');
		}
	);

	testInBrowser('animated=true uses the default 40ms stagger between words', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: 'Hello world',
			animated: true,
			isAnimating: true
		});

		const spans = [
			...screen.container.querySelectorAll('[data-streamdown-animate]')
		] as HTMLElement[];
		expect(spans.map((span) => span.textContent)).toEqual(['Hello', 'world']);
		expect(spans.map((span) => span.style.getPropertyValue('--sd-delay'))).toEqual(['', '40ms']);
		expect(spans[0]?.style.getPropertyValue('--sd-animation')).toBe('sd-fade');
	});

	testInBrowser(
		'animated compatibility supports custom animation strings, easing, and staggered char delays',
		() => {
			const screen = render(StreamdownWithFutureProps, {
				content: 'Hi there',
				animated: {
					animation: 'myCustomAnim',
					duration: 300,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
					sep: 'char',
					stagger: 20
				},
				isAnimating: true
			});

			const spans = [
				...screen.container.querySelectorAll('[data-streamdown-animate]')
			] as HTMLElement[];
			expect(spans.map((span) => span.textContent)).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);
			expect(spans[0]?.style.getPropertyValue('--sd-animation')).toBe('sd-myCustomAnim');
			expect(spans[0]?.style.getPropertyValue('--sd-duration')).toBe('300ms');
			expect(spans[0]?.style.getPropertyValue('--sd-easing')).toBe(
				'cubic-bezier(0.2, 0.8, 0.2, 1)'
			);
			expect(spans.map((span) => span.style.getPropertyValue('--sd-delay'))).toEqual([
				'',
				'20ms',
				'40ms',
				'60ms',
				'80ms',
				'100ms',
				'120ms'
			]);
		}
	);

	testInBrowser('local animation prop supports staggered character animation', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: 'AB',
			animation: {
				enabled: true,
				type: 'slideUp',
				duration: 250,
				timingFunction: 'ease-out',
				tokenize: 'char',
				stagger: 15
			},
			isAnimating: true
		});

		const spans = [
			...screen.container.querySelectorAll('[data-streamdown-animate]')
		] as HTMLElement[];
		expect(spans.map((span) => span.style.getPropertyValue('--sd-animation'))).toEqual([
			'sd-slideUp',
			'sd-slideUp'
		]);
		expect(spans.map((span) => span.style.getPropertyValue('--sd-delay'))).toEqual(['', '15ms']);
	});
});
