import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown security URL rendering', () => {
	testInBrowser('renders tel, mailto, and http links with the default wildcard policy', () => {
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

	testInBrowser('preserves relative and fragment links', () => {
		const screen = render(Streamdown, {
			content: '[Page](./page.html) [Section](#section-1) [Search](?tab=preview)',
			static: true
		});

		const links = screen.container.querySelectorAll('a');
		expect(links).toHaveLength(3);
		expect(links[0]?.getAttribute('href')).toBe('./page.html');
		expect(links[1]?.getAttribute('href')).toBe('#section-1');
		expect(links[2]?.getAttribute('href')).toBe('?tab=preview');
	});

	testInBrowser('blocks javascript links instead of rendering anchors', () => {
		const screen = render(Streamdown, {
			content: '[danger](javascript:alert(1))',
			static: true,
			linkSafety: {
				enabled: false
			}
		});

		expect(screen.container.querySelector('a')).toBeNull();
		expect(screen.container.textContent).toContain('danger [blocked]');
	});

	testInBrowser('renders data images under the default wildcard image policy', () => {
		const screen = render(Streamdown, {
			content: '![Data image](data:image/png;base64,AAAA)',
			static: true,
			linkSafety: {
				enabled: false
			}
		});

		const image = screen.container.querySelector('img');
		expect(image).toBeTruthy();
		expect(image?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
		expect(image?.getAttribute('alt')).toBe('Data image');
	});

	testInBrowser('blocks javascript images and renders the fallback text', () => {
		const screen = render(Streamdown, {
			content: '![Blocked image](javascript:alert(1))',
			static: true,
			linkSafety: {
				enabled: false
			}
		});

		expect(screen.container.querySelector('img')).toBeNull();
		expect(screen.container.textContent).toContain('[Image blocked: Blocked image]');
	});
});
