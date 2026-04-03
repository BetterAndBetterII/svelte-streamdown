import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown security allowed tags', () => {
	testInBrowser('preserves explicitly allowed custom tags', () => {
		const screen = render(Streamdown, {
			content: 'Hello <custom>world</custom>',
			static: true,
			allowedTags: {
				custom: []
			}
		});

		const custom = screen.container.querySelector('custom');
		expect(custom).toBeTruthy();
		expect(custom?.textContent).toBe('world');
	});

	testInBrowser('keeps allowed attributes and strips blocked ones', () => {
		const screen = render(Streamdown, {
			content: '<custom allowed="yes" blocked="no">content</custom>',
			static: true,
			allowedTags: {
				custom: ['allowed']
			}
		});

		const custom = screen.container.querySelector('custom');
		expect(custom).toBeTruthy();
		expect(custom?.getAttribute('allowed')).toBe('yes');
		expect(custom?.getAttribute('blocked')).toBeNull();
		expect(custom?.textContent).toBe('content');
	});

	testInBrowser('strips unknown custom tags while preserving text content', () => {
		const screen = render(Streamdown, {
			content: 'Hello <custom>world</custom>',
			static: true
		});

		expect(screen.container.querySelector('custom')).toBeNull();
		expect(screen.container.textContent).toContain('Hello world');
	});

	testInBrowser('keeps multiline custom tags intact across blank lines', () => {
		const screen = render(Streamdown, {
			content: `<snippet id="1">
Line one

Line two
</snippet>

After snippet`,
			static: true,
			allowedTags: {
				snippet: ['id']
			}
		});

		const snippet = screen.container.querySelector('snippet');
		const paragraph = [...screen.container.querySelectorAll('p')].find((element) =>
			element.textContent?.includes('After snippet')
		);

		expect(snippet).toBeTruthy();
		expect(snippet?.getAttribute('id')).toBe('user-content-1');
		expect(snippet?.textContent).toContain('Line one');
		expect(snippet?.textContent).toContain('Line two');
		expect(snippet?.textContent).not.toContain('After snippet');
		expect(paragraph).toBeTruthy();
	});

	testInBrowser('keeps sibling multiline custom tag blocks separate in streaming mode', () => {
		const screen = render(Streamdown, {
			content: `<snippet id="1">
First snippet

Still inside snippet
</snippet>

<snippet id="2">
Second snippet
</snippet>`,
			static: false,
			allowedTags: {
				snippet: ['id']
			}
		});

		const snippets = screen.container.querySelectorAll('snippet');
		expect(snippets).toHaveLength(2);
		expect(snippets[0]?.textContent).toContain('First snippet');
		expect(snippets[0]?.textContent).not.toContain('Second snippet');
		expect(snippets[1]?.textContent).toContain('Second snippet');
	});
});
