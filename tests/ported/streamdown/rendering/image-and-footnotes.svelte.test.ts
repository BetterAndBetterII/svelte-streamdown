import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import { expect } from 'vitest';

describeInBrowser('ported streamdown image and footnote rendering', () => {
	testInBrowser('renders safe images with src and alt text', () => {
		const screen = render(Streamdown, {
			content: '![Example image](https://example.com/example.png)'
		});

		const image = screen.container.querySelector('img[alt="Example image"]');
		expect(image).toBeTruthy();
		expect(image?.getAttribute('src')).toBe('https://example.com/example.png');
	});

	testInBrowser(
		'renders footnote references and definitions through a trailing footnotes section',
		() => {
			const screen = render(Streamdown, {
				content: [
					'Here is a simple footnote[^1].',
					'',
					'A footnote can also have multiple lines[^2].',
					'',
					'[^1]: This is the first footnote.',
					'[^2]: This is a multi-line footnote.',
					'    It can have multiple paragraphs.'
				].join('\n')
			});

			const footnoteRefs = screen.container.querySelectorAll('sup[data-streamdown-sup]');
			expect(footnoteRefs.length).toBeGreaterThanOrEqual(2);

			const firstRefLink = screen.container.querySelector(
				'sup[data-streamdown-sup] a[href="#footnote-1"]'
			);
			expect(firstRefLink).toBeTruthy();
			expect(firstRefLink?.textContent).toContain('1');

			const footnotesSection = screen.container.querySelector('section[data-footnotes]');
			expect(footnotesSection).toBeTruthy();

			const footnoteItems = footnotesSection?.querySelectorAll('li');
			expect(footnoteItems?.length).toBe(2);
			expect(footnotesSection?.textContent).toContain('This is the first footnote.');
			expect(footnotesSection?.textContent).toContain('This is a multi-line footnote.');

			const firstBackref = footnotesSection?.querySelector(
				'a[data-footnote-backref][href="#footnote-ref-1"]'
			);
			expect(firstBackref).toBeTruthy();
			expect(firstBackref?.textContent).toContain('↩');
		}
	);

	testInBrowser('hides empty footnote items until definition content exists', () => {
		const screen = render(Streamdown, {
			content: ['Text with footnote[^1].', '', '[^1]:'].join('\n')
		});

		const footnotesSection = screen.container.querySelector('section[data-footnotes]');
		if (!footnotesSection) {
			expect(footnotesSection).toBeNull();
			return;
		}

		expect(footnotesSection.querySelectorAll('li').length).toBe(0);
	});
});
