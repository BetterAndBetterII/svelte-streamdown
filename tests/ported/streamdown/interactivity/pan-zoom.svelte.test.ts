import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { renderMock } = vi.hoisted(() => ({
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><rect width="120" height="80"></rect><text>Zoomable</text></svg>'
	}))
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: renderMock
	}
}));

describeInBrowser('ported streamdown pan-zoom controls', () => {
	testInBrowser('renders zoom controls and updates the transform on button clicks', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><rect width="120" height="80"></rect><text>Zoomable</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Zoom in"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Zoom out"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Reset zoom and pan"]')).toBeTruthy();
			expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
		});

		const target = screen.container.querySelector(
			'[data-streamdown-mermaid] [role="application"]'
		) as HTMLElement;
		const initialTransform = target.style.transform;

		(screen.container.querySelector('button[title="Zoom in"]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(target.style.transform).not.toBe(initialTransform);
		});

		const zoomedTransform = target.style.transform;
		(screen.container.querySelector('button[title="Zoom out"]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(target.style.transform).not.toBe(zoomedTransform);
		});

		(
			screen.container.querySelector(
				'button[title="Reset zoom and pan"]'
			) as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(target.style.transform).toContain('scale(');
		});
	});

	testInBrowser('hides pan-zoom controls when disabled', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>No Controls</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			},
			controls: {
				mermaid: {
					panZoom: false
				}
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
		});

		expect(screen.container.querySelector('button[title="Zoom in"]')).toBeNull();
		expect(screen.container.querySelector('button[title="Zoom out"]')).toBeNull();
		expect(screen.container.querySelector('button[title="Reset zoom and pan"]')).toBeNull();
	});
});
