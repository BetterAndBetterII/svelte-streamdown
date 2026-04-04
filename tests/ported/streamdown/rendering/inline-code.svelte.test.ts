import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Code from '../../../../src/lib/Elements/Code.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import ComponentOverrideProbe from './fixtures/ComponentOverrideProbe.svelte';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown inline code contract', () => {
	testInBrowser('renders custom inlineCode components for codespans', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: 'Use `useState` for state',
			mode: 'static',
			components: {
				inlineCode: ComponentOverrideProbe
			}
		});

		expect(screen.container.querySelector('code[data-override="inlineCode"]')?.textContent).toBe(
			'useState'
		);
	});

	testInBrowser('does not apply inlineCode overrides to fenced code blocks', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: '```js\nconst x = 1;\n```',
			mode: 'static',
			components: {
				inlineCode: ComponentOverrideProbe
			}
		});

		expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
		expect(screen.container.querySelector('code[data-override="inlineCode"]')).toBeNull();
	});

	testInBrowser('lets code and inlineCode be overridden independently', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: 'Use `hook` here\n\n```js\nconst x = 1;\n```',
			mode: 'static',
			components: {
				code: Code,
				inlineCode: ComponentOverrideProbe
			}
		});

		expect(screen.container.querySelector('code[data-override="inlineCode"]')?.textContent).toBe(
			'hook'
		);
		expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
	});
});
