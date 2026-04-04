import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import MermaidErrorProbe from '../../../fixtures/MermaidErrorProbe.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

const { initializeMock, renderMock } = vi.hoisted(() => ({
	initializeMock: vi.fn(),
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><text>Mocked Diagram</text></svg>'
	}))
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: initializeMock,
		render: renderMock
	}
}));

describeInBrowser('ported streamdown mermaid component', () => {
	testInBrowser('renders accessible SVG output and forwards custom mermaid config', async () => {
		initializeMock.mockReset();
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>Accessible Diagram</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			},
			mermaidConfig: {
				theme: 'dark',
				fontFamily: 'Arial'
			}
		});

		await vi.waitFor(() => {
			const chartContainer = screen.container.querySelector(
				'[data-mermaid-svg][aria-label="Mermaid chart"][role="img"]'
			) as HTMLElement | null;
			expect(chartContainer).toBeTruthy();
			expect(chartContainer?.textContent).toContain('Accessible Diagram');
			expect(renderMock).toHaveBeenCalledTimes(1);
		});

		expect(initializeMock).toHaveBeenCalledWith(
			expect.objectContaining({
				theme: 'dark',
				fontFamily: 'Arial',
				securityLevel: 'strict'
			})
		);
	});

	testInBrowser('renders fallback and custom mermaid error content', async () => {
		renderMock.mockReset();
		renderMock.mockRejectedValue(new Error('Invalid syntax'));

		const fallbackScreen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			const error = fallbackScreen.container.querySelector('[data-streamdown-mermaid-error]');
			expect(error).toBeTruthy();
			expect(error?.textContent).toContain('Mermaid Error: Invalid syntax');
			expect(error?.querySelector('details')).toBeTruthy();
		});

		renderMock.mockReset();
		renderMock.mockRejectedValue(new Error('Broken diagram'));

		const customScreen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid,
				mermaidError: MermaidErrorProbe
			}
		});

		await vi.waitFor(() => {
			const probe = customScreen.container.querySelector('[data-mermaid-error-probe]');
			expect(probe).toBeTruthy();
			expect(probe?.textContent).toContain('Broken diagram');
		});
	});

	testInBrowser('keeps the last valid SVG when a rerender fails', async () => {
		renderMock.mockReset();
		renderMock
			.mockResolvedValueOnce({
				svg: '<svg width="120" height="80"><text>Valid Diagram</text></svg>'
			})
			.mockRejectedValueOnce(new Error('Subsequent render failed'));

		const screen = render(StreamdownWithFutureProps, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-mermaid-svg]')?.textContent).toContain(
				'Valid Diagram'
			);
		});

		await screen.rerender({
			content: ['```mermaid', 'graph TD; A-->C', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			const svg = screen.container.querySelector('[data-mermaid-svg]');
			expect(svg).toBeTruthy();
			expect(svg?.textContent).toContain('Valid Diagram');
			expect(screen.container.querySelector('[data-streamdown-mermaid-error]')).toBeNull();
		});
	});
});
