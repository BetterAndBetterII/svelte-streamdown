import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import { Streamdown } from '../../../../src/lib/index.js';
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

	testInBrowser('allowedImagePrefixes keeps only approved image origins', () => {
		const allowed = render(Streamdown, {
			content: '![Allowed](https://cdn.example.com/allowed.png)',
			static: true,
			allowedImagePrefixes: ['https://cdn.example.com/'],
			linkSafety: {
				enabled: false
			}
		});
		const blocked = render(Streamdown, {
			content: '![Blocked](https://evil.test/blocked.png)',
			static: true,
			allowedImagePrefixes: ['https://cdn.example.com/'],
			linkSafety: {
				enabled: false
			}
		});

		expect(allowed.container.querySelector('img')?.getAttribute('src')).toBe(
			'https://cdn.example.com/allowed.png'
		);
		expect(blocked.container.querySelector('img')).toBeNull();
		expect(blocked.container.textContent).toContain('[Image blocked: Blocked]');
	});

	testInBrowser(
		'protocol-only allowedLinkPrefixes can allow all https links while blocking http',
		() => {
			const allowed = render(Streamdown, {
				content: '[Allowed](https://example.com/path)',
				static: true,
				allowedLinkPrefixes: ['https://'],
				linkSafety: {
					enabled: false
				}
			});
			const blocked = render(Streamdown, {
				content: '[Blocked](http://example.com/path)',
				static: true,
				allowedLinkPrefixes: ['https://'],
				linkSafety: {
					enabled: false
				}
			});

			expect(allowed.container.querySelector('a')?.getAttribute('href')).toBe(
				'https://example.com/path'
			);
			expect(blocked.container.querySelector('a')).toBeNull();
			expect(blocked.container.textContent).toContain('Blocked [blocked]');
		}
	);

	testInBrowser('protocol-only allowedLinkPrefixes also harden raw HTML links', () => {
		const allowed = render(Streamdown, {
			content: '<a href="https://example.com/path">Allowed</a>',
			static: true,
			allowedLinkPrefixes: ['https://']
		});
		const blocked = render(Streamdown, {
			content: '<a href="http://example.com/path">Blocked</a>',
			static: true,
			allowedLinkPrefixes: ['https://']
		});

		expect(allowed.container.querySelector('a')?.getAttribute('href')).toBe(
			'https://example.com/path'
		);
		expect(blocked.container.querySelector('a')).toBeNull();
		expect(blocked.container.textContent).toContain('Blocked');
		expect(blocked.container.innerHTML).not.toContain('http://example.com/path');
	});

	testInBrowser(
		'protocol-only allowedImagePrefixes can allow all https images while blocking http',
		() => {
			const allowed = render(Streamdown, {
				content: '![Allowed](https://cdn.example.com/allowed.png)',
				static: true,
				allowedImagePrefixes: ['https://'],
				linkSafety: {
					enabled: false
				}
			});
			const blocked = render(Streamdown, {
				content: '![Blocked](http://cdn.example.com/blocked.png)',
				static: true,
				allowedImagePrefixes: ['https://'],
				linkSafety: {
					enabled: false
				}
			});

			expect(allowed.container.querySelector('img')?.getAttribute('src')).toBe(
				'https://cdn.example.com/allowed.png'
			);
			expect(blocked.container.querySelector('img')).toBeNull();
			expect(blocked.container.textContent).toContain('[Image blocked: Blocked]');
		}
	);

	testInBrowser('allowedImagePrefixes also hardens raw HTML image tags', () => {
		const allowed = render(Streamdown, {
			content: '<img src="https://cdn.example.com/allowed.png" alt="Allowed">',
			static: true,
			allowedImagePrefixes: ['https://cdn.example.com/']
		});
		const blocked = render(Streamdown, {
			content: '<img src="https://evil.test/blocked.png" alt="Blocked">',
			static: true,
			allowedImagePrefixes: ['https://cdn.example.com/']
		});

		expect(allowed.container.querySelector('img')?.getAttribute('src')).toBe(
			'https://cdn.example.com/allowed.png'
		);
		expect(blocked.container.querySelector('img')).toBeNull();
		expect(blocked.container.innerHTML).not.toContain('https://evil.test/blocked.png');
	});

	testInBrowser('protocol-only allowedImagePrefixes also harden raw HTML image tags', () => {
		const allowed = render(Streamdown, {
			content: '<img src="https://cdn.example.com/allowed.png" alt="Allowed">',
			static: true,
			allowedImagePrefixes: ['https://']
		});
		const blocked = render(Streamdown, {
			content: '<img src="http://cdn.example.com/blocked.png" alt="Blocked">',
			static: true,
			allowedImagePrefixes: ['https://']
		});

		expect(allowed.container.querySelector('img')?.getAttribute('src')).toBe(
			'https://cdn.example.com/allowed.png'
		);
		expect(blocked.container.querySelector('img')).toBeNull();
		expect(blocked.container.innerHTML).not.toContain('http://cdn.example.com/blocked.png');
	});
});
