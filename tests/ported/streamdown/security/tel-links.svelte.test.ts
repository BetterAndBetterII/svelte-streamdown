import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown security tel links', () => {
	testInBrowser('renders tel links', () => {
		const screen = render(Streamdown, {
			content: '[call me](tel:01392498505)',
			static: true,
			linkSafety: {
				enabled: false
			}
		});

		const link = screen.container.querySelector('a');
		expect(link).toBeTruthy();
		expect(link?.getAttribute('href')).toBe('tel:01392498505');
		expect(link?.textContent).toBe('call me');
	});

	testInBrowser('renders tel, mailto, and http links together', () => {
		const screen = render(Streamdown, {
			content:
				'[phone](tel:01392498505) [email](mailto:foo@example.com) [website](http://example.com)',
			static: true,
			linkSafety: {
				enabled: false
			}
		});

		const links = screen.container.querySelectorAll('a');
		expect(links).toHaveLength(3);
		expect(links[0]?.getAttribute('href')).toBe('tel:01392498505');
		expect(links[1]?.getAttribute('href')).toBe('mailto:foo@example.com');
		expect(links[2]?.getAttribute('href')).toBe('http://example.com/');
	});

	testInBrowser('renders international tel links', () => {
		const screen = render(Streamdown, {
			content: '[call](tel:+44-1392-498505)',
			static: true,
			linkSafety: {
				enabled: false
			}
		});

		expect(screen.container.querySelector('a')?.getAttribute('href')).toBe('tel:+44-1392-498505');
	});
});
