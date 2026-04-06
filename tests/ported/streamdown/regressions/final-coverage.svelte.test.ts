import { expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { initializeMock, renderMock } = vi.hoisted(() => ({
	initializeMock: vi.fn(),
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><text>Aggregate Diagram</text></svg>'
	}))
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: initializeMock,
		render: renderMock
	}
}));

describeInBrowser('ported streamdown final aggregate closeout', () => {
	testInBrowser('honors mermaid control config through the public root surface', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>Aggregate Diagram</text></svg>'
		});

		const disabled = render(Streamdown, {
			content: ['```mermaid', 'graph TD; Start-->Finish', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			},
			controls: {
				mermaid: {
					download: false,
					fullscreen: false,
					panZoom: false
				}
			}
		});

		await vi.waitFor(() => {
			expect(disabled.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
		});

		expect(disabled.container.querySelector('button[title="Download diagram"]')).toBeNull();
		expect(disabled.container.querySelector('button[title="View fullscreen"]')).toBeNull();
		expect(disabled.container.querySelector('button[title="Zoom in"]')).toBeNull();

		const enabled = render(Streamdown, {
			content: ['```mermaid', 'graph TD; Start-->Finish', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			},
			controls: {
				mermaid: true
			}
		});

		await vi.waitFor(() => {
			expect(enabled.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
			expect(enabled.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
			expect(enabled.container.querySelector('button[title="Zoom in"]')).toBeTruthy();
			expect(enabled.container.querySelector('button[title="Zoom out"]')).toBeTruthy();
			expect(
				enabled.container.querySelector('button[title="Reset zoom and pan"]')
			).toBeTruthy();
		});
	});

	testInBrowser(
		'applies skipHtml and urlTransform while keeping table export controls on the rendered surface',
		async () => {
			const transform = vi.fn((url: string) =>
				url.replace('https://example.com', 'https://proxy.test')
			);
			const screen = render(Streamdown, {
				content: [
					'Before raw HTML',
					'',
					'<div>remove me</div>',
					'',
					'[docs](https://example.com/docs)',
					'',
					'![Proxy image](https://example.com/image.png)',
					'',
					'| Name | Value |',
					'| ---- | ----- |',
					'| Foo | Bar |'
				].join('\n'),
				linkSafety: {
					enabled: false
				},
				skipHtml: true,
				static: true,
				urlTransform: transform
			});

			expect(screen.container.innerHTML).not.toContain('<div>remove me</div>');
			expect(screen.container.querySelector('a')?.getAttribute('href')).toBe(
				'https://proxy.test/docs'
			);
			expect(screen.container.querySelector('img')?.getAttribute('src')).toBe(
				'https://proxy.test/image.png'
			);

			const downloadButton = screen.container.querySelector(
				'button[title="Download table"]'
			) as HTMLButtonElement | null;
			expect(downloadButton).toBeTruthy();
			downloadButton?.click();

			await vi.waitFor(() => {
				expect(
					screen.container.querySelector('button[title="Download table as Markdown"]')
				).toBeTruthy();
				expect(
					screen.container.querySelector('button[title="Download table as CSV"]')
				).toBeTruthy();
			});

			expect(screen.container.querySelector('button[title="Download table as HTML"]')).toBeNull();
		}
	);
});
