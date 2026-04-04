import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown footnote rendering', () => {
	testInBrowser('renders footnote references and a trailing section with backrefs', () => {
		const screen = render(Streamdown, {
			content: [
				'Here is a footnote[^1].',
				'',
				'Another paragraph with[^2].',
				'',
				'[^1]: First footnote.',
				'[^2]: Second footnote with **formatting**.'
			].join('\n')
		});

		const refs = [...screen.container.querySelectorAll('sup[data-streamdown-sup] a')];
		expect(refs).toHaveLength(2);
		expect(refs[0]?.getAttribute('href')).toBe('#footnote-1');

		const section = screen.container.querySelector('section[data-footnotes]');
		expect(section).toBeTruthy();
		expect(section?.querySelectorAll('li')).toHaveLength(2);
		expect(section?.textContent).toContain('First footnote.');
		expect(section?.querySelector('strong')?.textContent).toBe('formatting');
		expect(section?.querySelector('a[data-footnote-backref][href="#footnote-ref-1"]')).toBeTruthy();
	});

	testInBrowser('filters empty footnotes out of the rendered section', () => {
		const screen = render(Streamdown, {
			content: ['Text with empty footnote[^1].', '', '[^1]:'].join('\n')
		});

		expect(screen.container.querySelector('section[data-footnotes]')).toBeNull();
	});

	testInBrowser('keeps multi-line footnotes and excludes the synthetic placeholder entry', () => {
		const screen = render(Streamdown, {
			content: [
				'Text with a note[^1].',
				'',
				'[^1]: First line.',
				'    Second line.',
				'',
				'[^streamdown:footnote]: Placeholder that should stay hidden.'
			].join('\n')
		});

		const section = screen.container.querySelector('section[data-footnotes]');
		expect(section?.querySelectorAll('li')).toHaveLength(1);
		expect(section?.textContent).toContain('First line.');
		expect(section?.textContent).toContain('Second line.');
		expect(section?.textContent).not.toContain('Placeholder');
	});
});
