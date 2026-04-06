import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import IconConsumer from '../../../fixtures/context/IconConsumer.svelte';
import IconProviderHarness from '../../../fixtures/context/IconProviderHarness.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const iconSnippet = (name: string) =>
	createRawSnippet(() => ({
		render: () => `<svg data-icon="${name}" viewBox="0 0 24 24"></svg>`
	}));

describeInBrowser('ported streamdown icon context surface', () => {
	testInBrowser('falls back to default icons outside a provider', async () => {
		const screen = render(IconConsumer, {
			iconName: 'CheckIcon'
		});

		expect(screen.container.querySelector('svg')).toBeTruthy();
	});

	testInBrowser('overrides a specific icon via the provider boundary', async () => {
		const screen = render(IconProviderHarness, {
			iconName: 'CheckIcon',
			icons: {
				CheckIcon: iconSnippet('custom-check')
			}
		});

		expect(screen.container.querySelector('svg[data-icon="custom-check"]')).toBeTruthy();
	});
});
