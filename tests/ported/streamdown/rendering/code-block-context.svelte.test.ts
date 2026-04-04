import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import CodeContextProbe from './fixtures/CodeContextProbe.svelte';

describeInBrowser('ported streamdown code block context analogue', () => {
	testInBrowser(
		'exposes the active streamdown context to custom code components through useStreamdown',
		() => {
			const screen = render(Streamdown, {
				content: '```ts\nconst x = 1;\n```',
				lineNumbers: false,
				shikiTheme: 'github-dark',
				translations: {
					downloadFile: 'Save snippet'
				},
				controls: {
					code: {
						copy: false,
						download: true
					}
				},
				components: {
					code: CodeContextProbe
				}
			});

			const probe = screen.container.querySelector('[data-probe="code-context"]');

			expect(probe?.getAttribute('data-code-id')).toBeTruthy();
			expect(probe?.getAttribute('data-language')).toBe('ts');
			expect(probe?.getAttribute('data-copy-enabled')).toBe('false');
			expect(probe?.getAttribute('data-download-enabled')).toBe('true');
			expect(probe?.getAttribute('data-line-numbers')).toBe('false');
			expect(probe?.getAttribute('data-theme')).toBe('github-dark');
			expect(probe?.getAttribute('data-translation-download')).toBe('Save snippet');
		}
	);
});
