import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown html entities', () => {
	testInBrowser(
		'decodes html entities in plain text and link text without decoding code spans',
		() => {
			const screen = render(Streamdown, {
				content: [
					'Entities: &copy; 2026 &mdash; Streamdown &bull; Built with &hearts;',
					'',
					'[&amp; Entity Link](https://example.com?q=1&lang=en)',
					'',
					'Use `&lt;section&gt;` literally.'
				].join('\n'),
				mode: 'static'
			});

			expect(screen.container.textContent).toContain(
				'Entities: © 2026 — Streamdown • Built with ♥'
			);
			expect(screen.container.textContent).toContain('& Entity Link');
			expect(screen.container.querySelector('[data-streamdown-link]')?.textContent).toBe(
				'& Entity Link'
			);
			expect(screen.container.querySelector('[data-streamdown-codespan]')?.textContent).toBe(
				'&lt;section&gt;'
			);
		}
	);
});
