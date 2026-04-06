import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import type { IconMap } from '../../../../src/lib/icon-context.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(async () => ({
			svg: '<svg width="120" height="80"><text>Graph</text></svg>'
		}))
	}
}));

const iconSnippet = (name: string) =>
	createRawSnippet(() => ({
		render: () => `<svg data-icon="${name}" viewBox="0 0 24 24"></svg>`
	}));

describeInBrowser('ported streamdown icon overrides', () => {
	testInBrowser('accepts reference IconMap-style keys for shared control icons', async () => {
		const icons: Partial<IconMap> = {
			CopyIcon: iconSnippet('copy'),
			DownloadIcon: iconSnippet('download'),
			CheckIcon: iconSnippet('check'),
			Maximize2Icon: iconSnippet('maximize'),
			ZoomInIcon: iconSnippet('zoom-in'),
			ZoomOutIcon: iconSnippet('zoom-out'),
			RotateCcwIcon: iconSnippet('fit-view')
		};

		const screen = render(Streamdown, {
			content: [
				'```js',
				'console.log("hello");',
				'```',
				'',
				'| Name | Value |',
				'| ---- | ----- |',
				'| Foo | Bar |',
				'',
				'```mermaid',
				'graph TD; A-->B',
				'```'
			].join('\n'),
			components: {
				mermaid: Mermaid
			},
			icons
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('svg[data-icon="copy"]')).toBeTruthy();
			expect(screen.container.querySelectorAll('svg[data-icon="download"]').length).toBeGreaterThan(
				0
			);
			expect(screen.container.querySelector('svg[data-icon="maximize"]')).toBeTruthy();
			expect(screen.container.querySelector('svg[data-icon="zoom-in"]')).toBeTruthy();
			expect(screen.container.querySelector('svg[data-icon="zoom-out"]')).toBeTruthy();
			expect(screen.container.querySelector('svg[data-icon="fit-view"]')).toBeTruthy();
		});
	});
});
