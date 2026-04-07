import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { createMathPlugin } from '../../../../src/lib/index.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown remaining-coverage regressions', () => {
	testInBrowser('unwraps standalone images while keeping ordinary text in paragraphs', () => {
		const screen = render(Streamdown, {
			content: ['![Diagram](https://example.com/diagram.png)', '', 'Just some text'].join('\n')
		});

		const imageWrapper = screen.container.querySelector('[data-streamdown-image]');
		expect(imageWrapper).toBeTruthy();
		expect(imageWrapper?.closest('p')).toBeNull();

		const paragraphs = [...screen.container.querySelectorAll('p')];
		expect(paragraphs.some((paragraph) => paragraph.textContent?.includes('Just some text'))).toBe(
			true
		);
	});

	testInBrowser(
		'preserves whitespace-only animation tokens and skips animated spans inside inline math',
		async () => {
			const textScreen = render(Streamdown, {
				content: 'A B ',
				animated: {
					animation: 'fadeIn',
					duration: 120,
					easing: 'ease',
					sep: 'char',
					stagger: 20
				},
				isAnimating: true
			});

			const textSpans = [
				...textScreen.container.querySelectorAll('[data-streamdown-animate]')
			] as HTMLElement[];
			expect(textSpans.map((span) => span.textContent)).toEqual(['A', 'B']);
			expect(textScreen.container.textContent).toContain('A B');

			const mathScreen = render(Streamdown, {
				content: 'Value $x^2$ end',
				animated: {
					animation: 'fadeIn',
					duration: 120,
					easing: 'ease',
					sep: 'char',
					stagger: 20
				},
				isAnimating: true,
				plugins: {
					math: createMathPlugin({ singleDollarTextMath: true })
				}
			});

			const mathNode = mathScreen.container.querySelector(
				'[data-streamdown-inline-math], [data-streamdown-block-math]'
			);
			expect(mathNode).toBeTruthy();
			await vi.waitFor(() => {
				expect(mathNode?.querySelector('.katex')).toBeTruthy();
			});
			expect(mathNode?.querySelector('[data-streamdown-animate]')).toBeNull();
		}
	);
});
