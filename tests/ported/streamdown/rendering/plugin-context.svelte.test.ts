import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import PluginProviderHarness from '../../../fixtures/context/PluginProviderHarness.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown plugin context surface', () => {
	testInBrowser('exposes plugin helpers through the provider boundary', async () => {
		const codePlugin = { name: 'code' };
		const mermaidPlugin = { name: 'mermaid' };
		const mathPlugin = { name: 'math' };
		const cjkPlugin = { name: 'cjk' };
		const renderer = { language: ['vega', 'vega-lite'], component: {} as never };

		const screen = render(PluginProviderHarness, {
			plugins: {
				code: codePlugin as never,
				mermaid: mermaidPlugin as never,
				math: mathPlugin as never,
				cjk: cjkPlugin as never,
				renderers: [renderer]
			},
			language: 'vega-lite'
		});

		const probe = screen.container.querySelector('div');
		expect(probe?.getAttribute('data-plugins')).toBe('present');
		expect(probe?.getAttribute('data-code')).toBe('code');
		expect(probe?.getAttribute('data-mermaid')).toBe('mermaid');
		expect(probe?.getAttribute('data-math')).toBe('math');
		expect(probe?.getAttribute('data-cjk')).toBe('cjk');
		expect(probe?.getAttribute('data-renderer')).toBe('present');
	});
});
