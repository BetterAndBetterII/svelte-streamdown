import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown code block features', () => {
	testInBrowser(
		'shows line numbers by default and strips metastring from the language label',
		async () => {
			const screen = render(Streamdown, {
				content: '```js startLine=5\nconst x = 1;\n```'
			});

			const code = screen.container.querySelector('code');
			expect(code?.className).toContain('[counter-reset:line]');
			expect(code?.getAttribute('style')).toContain('counter-reset: line 4');

			const line = screen.container.querySelector(
				'[data-streamdown="code-block-body"] code > span'
			);
			expect(line?.className).toContain('before:content-[counter(line)]');

			const header = screen.container.querySelector('[data-streamdown="code-block-header"]');
			expect(header?.textContent?.trim()).toBe('js');
		}
	);

	testInBrowser('hides line numbers when lineNumbers is disabled globally', async () => {
		const screen = render(Streamdown, {
			content: '```js\nconst x = 1;\n```',
			lineNumbers: false
		});

		const code = screen.container.querySelector('code');
		expect(code?.className ?? '').not.toContain('[counter-reset:line]');

		const line = screen.container.querySelector('[data-streamdown="code-block-body"] code > span');
		expect(line?.className ?? '').not.toContain('before:content-[counter(line)]');
	});

	testInBrowser('hides line numbers for noLineNumbers fenced-code metadata', async () => {
		const screen = render(Streamdown, {
			content: '```js noLineNumbers\nconst x = 1;\n```',
			lineNumbers: true
		});

		const code = screen.container.querySelector('code');
		expect(code?.className ?? '').not.toContain('[counter-reset:line]');
	});
});
