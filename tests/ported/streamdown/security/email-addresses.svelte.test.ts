import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown security email addresses', () => {
	testInBrowser(
		'renders a bare email address unchanged with incomplete-markdown repair enabled',
		() => {
			const screen = render(Streamdown, {
				content: 'example@gmail.com',
				static: true,
				parseIncompleteMarkdown: true,
				linkSafety: {
					enabled: false
				}
			});

			expect(screen.container.textContent?.trim()).toBe('example@gmail.com');
		}
	);

	testInBrowser('renders email addresses inside sentences and repeated addresses unchanged', () => {
		const screen = render(Streamdown, {
			content: 'Contact admin@site.com or support@site.com for more info.',
			static: true,
			parseIncompleteMarkdown: true,
			linkSafety: {
				enabled: false
			}
		});

		expect(screen.container.textContent?.trim()).toBe(
			'Contact admin@site.com or support@site.com for more info.'
		);
	});

	testInBrowser('preserves email addresses when incomplete-markdown repair is disabled', () => {
		const screen = render(Streamdown, {
			content: 'user+test@example-domain.co.uk',
			static: true,
			parseIncompleteMarkdown: false,
			linkSafety: {
				enabled: false
			}
		});

		expect(screen.container.textContent?.trim()).toBe('user+test@example-domain.co.uk');
	});
});
