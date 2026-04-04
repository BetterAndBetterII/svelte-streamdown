import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import IncompleteCodeFenceProbe from './fixtures/IncompleteCodeFenceProbe.svelte';

describeInBrowser('ported streamdown incomplete code block handling', () => {
	testInBrowser(
		'useIsCodeFenceIncomplete returns true for an unclosed streamed fence',
		async () => {
			const screen = render(Streamdown, {
				content: '```javascript\nconst x = 1;',
				isAnimating: true,
				components: {
					code: IncompleteCodeFenceProbe
				}
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-hook-probe="code"]')).toHaveAttribute(
					'data-hook-incomplete',
					'true'
				);
			});
		}
	);

	testInBrowser(
		'useIsCodeFenceIncomplete stays false once the last streamed block is complete',
		() => {
			const screen = render(Streamdown, {
				content: '```javascript\nconst x = 1;\n```\n\nSome text',
				isAnimating: true,
				components: {
					p: IncompleteCodeFenceProbe
				}
			});

			expect(screen.container.querySelector('[data-hook-probe="paragraph"]')).toHaveAttribute(
				'data-hook-incomplete',
				'false'
			);
		}
	);

	testInBrowser(
		'marks only unclosed streamed code blocks with the data-incomplete attribute',
		async () => {
			const incomplete = render(Streamdown, {
				content: '```javascript\nconst x = 1;',
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(
					incomplete.container.querySelector('[data-streamdown="code-block"]')
				).toHaveAttribute('data-incomplete', 'true');
			});

			const complete = render(Streamdown, {
				content: '```javascript\nconst x = 1;\n```',
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(complete.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
			});

			expect(
				complete.container.querySelector('[data-streamdown="code-block"]')
			).not.toHaveAttribute('data-incomplete');
		}
	);
});
