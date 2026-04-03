import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown security literal tag rendering', () => {
	testInBrowser('treats configured custom-tag content as literal text', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: '<mention user_id=\"123\">_some_username_</mention>',
			static: true,
			allowedTags: {
				mention: ['user_id']
			},
			literalTagContent: ['mention']
		});

		const mention = screen.container.querySelector('mention');
		expect(mention).toBeTruthy();
		expect(mention?.getAttribute('user_id')).toBe('123');
		expect(mention?.textContent).toBe('_some_username_');
		expect(mention?.querySelector('em')).toBeNull();
	});
});
