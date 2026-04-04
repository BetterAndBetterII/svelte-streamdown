import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown node attribute removal regression', () => {
	testInBrowser(
		'removes the code-block incomplete attribute when a streamed fence becomes complete',
		async () => {
			const screen = render(Streamdown, {
				content: '```ts\nconst x = 1;',
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="code-block"]')).toHaveAttribute(
					'data-incomplete',
					'true'
				);
			});

			await screen.rerender({
				content: '```ts\nconst x = 1;\n```',
				isAnimating: true
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
				expect(
					screen.container.querySelector('[data-streamdown="code-block"]')
				).not.toHaveAttribute('data-incomplete');
			});
		}
	);
});
