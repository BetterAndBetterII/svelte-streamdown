import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import MermaidErrorProbe from '../../../fixtures/MermaidErrorProbe.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { saveMock, initializeMock, renderMock } = vi.hoisted(() => ({
	saveMock: vi.fn(),
	initializeMock: vi.fn(),
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><text>Mermaid graph</text></svg>'
	}))
}));

vi.mock('$lib/utils/save.js', () => ({
	save: saveMock
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: initializeMock,
		render: renderMock
	}
}));

describeInBrowser('ported streamdown mermaid controls', () => {
	testInBrowser(
		'downloads mermaid source and rendered svg, then toggles fullscreen state',
		async () => {
			saveMock.mockReset();
			renderMock.mockReset();
			renderMock.mockResolvedValue({
				svg: '<svg width="120" height="80"><text>Mermaid graph</text></svg>'
			});

			const screen = render(Streamdown, {
				content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
				components: {
					mermaid: Mermaid
				}
			});

			expect(screen.container.querySelector('button[title="Download diagram"]')).toBeNull();
			expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeNull();

			await vi.waitFor(() => {
				expect(screen.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
				expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
				expect(renderMock).toHaveBeenCalledTimes(1);
			});

			(
				screen.container.querySelector('button[title="Download diagram"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(
					screen.container.querySelector('button[title="Download diagram as SVG"]')
				).toBeTruthy();
			});

			(
				screen.container.querySelector(
					'button[title="Download diagram as SVG"]'
				) as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(saveMock).toHaveBeenCalledWith(
					'diagram.svg',
					expect.stringContaining('<svg'),
					'image/svg+xml'
				);
				expect(renderMock).toHaveBeenCalledTimes(2);
			});

			(
				screen.container.querySelector('button[title="Download diagram"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(
					screen.container.querySelector('button[title="Download diagram as MMD"]')
				).toBeTruthy();
			});

			(
				screen.container.querySelector(
					'button[title="Download diagram as MMD"]'
				) as HTMLButtonElement
			).click();

			expect(saveMock).toHaveBeenCalledWith('diagram.mmd', 'graph TD; A-->B', 'text/plain');

			const fullscreenButton = screen.container.querySelector(
				'button[title="View fullscreen"]'
			) as HTMLButtonElement;
			fullscreenButton.click();

			await vi.waitFor(() => {
				const container = screen.container.querySelector(
					'[data-streamdown-mermaid] > div[data-expanded="true"]'
				);
				expect(container).toBeTruthy();
				expect(screen.container.querySelector('button[title="Exit fullscreen"]')).toBeTruthy();
			});

			(
				screen.container.querySelector('button[title="Exit fullscreen"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				const container = screen.container.querySelector(
					'[data-streamdown-mermaid] > div[data-expanded="false"]'
				);
				expect(container).toBeTruthy();
			});
		}
	);

	testInBrowser('supports granular controls and a custom mermaid error component', async () => {
		renderMock.mockReset();
		renderMock.mockRejectedValueOnce(new Error('Broken diagram'));
		renderMock.mockResolvedValueOnce({
			svg: '<svg width="120" height="80"><text>Recovered</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid,
				mermaidError: MermaidErrorProbe
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
			const probe = screen.container.querySelector('[data-mermaid-error-probe]');
			expect(probe).toBeTruthy();
			expect(probe?.textContent).toContain('Broken diagram');
		});

		expect(screen.container.querySelector('button[title="Download diagram"]')).toBeNull();
		expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeNull();
		expect(screen.container.querySelector('button[title="Zoom in"]')).toBeNull();
		expect(screen.container.querySelector('button[title="Zoom out"]')).toBeNull();
		expect(screen.container.querySelector('button[title="Reset zoom and pan"]')).toBeNull();

		(screen.container.querySelector('[data-mermaid-error-retry]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(renderMock).toHaveBeenCalledTimes(2);
			expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
			expect(screen.container.textContent).toContain('Recovered');
		});
	});
});
