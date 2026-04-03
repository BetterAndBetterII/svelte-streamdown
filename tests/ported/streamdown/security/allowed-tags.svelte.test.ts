import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import { expect } from 'vitest';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown security allowed tags', () => {
	testInBrowser('preserves explicitly allowed custom tags', () => {
		const screen = render(StreamdownWithFutureProps, {
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
		const screen = render(StreamdownWithFutureProps, {
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

	testInBrowser('keeps multiline custom tags intact across blank lines', () => {
		const screen = render(StreamdownWithFutureProps, {
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
});
