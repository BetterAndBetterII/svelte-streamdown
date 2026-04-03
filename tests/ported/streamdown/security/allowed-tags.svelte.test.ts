import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import { expect } from 'vitest';

describeInBrowser('ported streamdown security allowed tags', () => {
	testInBrowser('reference allowedTags support preserves explicitly allowed custom tags', () => {
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

	testInBrowser(
		'reference allowedTags support keeps allowed attributes and strips blocked ones',
		() => {
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
		}
	);

	testInBrowser('reference strips unknown custom tags while preserving their text content', () => {
		const screen = render(Streamdown, {
			content: 'Hello <custom>world</custom>',
			static: true
		});

		expect(screen.container.querySelector('custom')).toBeNull();
		expect(screen.container.textContent).toContain('Hello world');
	});

	testInBrowser('reference literalTagContent renders markdown markers as plain text', () => {
		const screen = render(Streamdown, {
			content: '<mention user_id="123">_some_username_</mention>',
			static: true,
			allowedTags: {
				mention: ['user_id']
			},
			literalTagContent: ['mention']
		});

		const mention = screen.container.querySelector('mention');
		expect(mention).toBeTruthy();
		expect(mention?.querySelector('em')).toBeNull();
		expect(mention?.textContent).toBe('_some_username_');
	});

	testInBrowser('reference keeps multiline custom tag blocks intact', () => {
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
