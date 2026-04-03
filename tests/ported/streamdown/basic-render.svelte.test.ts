import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../src/lib/Streamdown.svelte';
import {
	describeInBrowser,
	expectNormalizedHtml,
	loadFixturePair,
	testInBrowser
} from '../../helpers/index.js';

describeInBrowser('ported streamdown render helpers', () => {
	testInBrowser('renders a fixture through shared DOM helpers', async () => {
		const { input, expected } = await loadFixturePair(
			'ported/streamdown/basic-render/input.md',
			'ported/streamdown/basic-render/expected.html'
		);

		const screen = render(Streamdown, {
			content: input,
			static: true
		});

		expectNormalizedHtml(screen.container, expected);
	});
});
