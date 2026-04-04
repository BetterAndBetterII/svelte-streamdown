import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import { Streamdown, defaultUrlTransform } from '../../../../src/lib/index.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown markdown filtering surface', () => {
	testInBrowser('defaultUrlTransform passes through URLs unchanged', () => {
		expect(
			defaultUrlTransform('https://example.com', 'href', { tagName: 'a', properties: {} })
		).toBe('https://example.com');
		expect(defaultUrlTransform('./page', 'href', { tagName: 'a', properties: {} })).toBe('./page');
	});

	testInBrowser('allowedElements keeps only the allowed markdown elements', () => {
		const screen = render(Streamdown, {
			allowedElements: ['p', 'em'],
			content: '# Heading\n\n**bold** and *italic*',
			static: true
		});

		expect(screen.container.querySelector('h1')).toBeNull();
		expect(screen.container.querySelector('strong')).toBeNull();
		expect(screen.container.querySelector('em')).toBeTruthy();
	});

	testInBrowser('disallowedElements removes targeted elements', () => {
		const screen = render(Streamdown, {
			content: '**bold** and *italic*',
			disallowedElements: ['strong'],
			static: true
		});

		expect(screen.container.querySelector('strong')).toBeNull();
		expect(screen.container.querySelector('em')).toBeTruthy();
	});

	testInBrowser('allowElement filters elements with a callback', () => {
		const allowElement = vi.fn((element) => element.tagName !== 'h2');
		const screen = render(Streamdown, {
			allowElement,
			content: '# Keep\n\n## Remove',
			static: true
		});

		expect(allowElement).toHaveBeenCalled();
		expect(screen.container.querySelector('h1')).toBeTruthy();
		expect(screen.container.querySelector('h2')).toBeNull();
	});

	testInBrowser('allowElement receives parent children for sibling-aware filtering', () => {
		const allowElement = vi.fn((element, index, parent) => {
			if (element.tagName !== 'li') {
				return true;
			}

			return parent?.children?.length === 2 ? index > 0 : true;
		});
		const screen = render(Streamdown, {
			allowElement,
			content: '- first\n- second',
			static: true
		});

		expect(allowElement).toHaveBeenCalled();
		expect(screen.container.querySelectorAll('li')).toHaveLength(1);
		expect(screen.container.textContent).toContain('second');
		expect(screen.container.textContent).not.toContain('first');
	});

	testInBrowser('unwrapDisallowed keeps children when a wrapper element is filtered', () => {
		const screen = render(Streamdown, {
			content: '**bold text**',
			disallowedElements: ['strong'],
			static: true,
			unwrapDisallowed: true
		});

		expect(screen.container.querySelector('strong')).toBeNull();
		expect(screen.container.textContent).toContain('bold text');
	});

	testInBrowser('skipHtml strips raw HTML tokens while keeping surrounding markdown text', () => {
		const screen = render(Streamdown, {
			content: 'Text before\n\n<b>bold</b>\n\nText after',
			skipHtml: true,
			static: true
		});

		expect(screen.container.innerHTML).not.toContain('<b>');
		expect(screen.container.textContent).toContain('Text before');
		expect(screen.container.textContent).toContain('Text after');
	});

	testInBrowser('urlTransform rewrites image URLs before rendering', () => {
		const transform = vi.fn((url: string) =>
			url.replace('https://example.com', 'https://proxy.test')
		);
		const screen = render(Streamdown, {
			content: '![alt](https://example.com/image.png)',
			static: true,
			urlTransform: transform
		});

		expect(transform).toHaveBeenCalled();
		expect(screen.container.querySelector('img')?.getAttribute('src')).toBe(
			'https://proxy.test/image.png'
		);
	});

	testInBrowser('urlTransform can remove link href values without removing the anchor text', () => {
		const transform = vi.fn(() => null);
		const screen = render(Streamdown, {
			content: '[link](https://evil.test)',
			static: true,
			urlTransform: transform
		});

		expect(transform).toHaveBeenCalled();
		const link = screen.container.querySelector('a');
		expect(link).toBeTruthy();
		expect(link?.getAttribute('href')).toBeNull();
		expect(link?.textContent).toBe('link');
	});
});
