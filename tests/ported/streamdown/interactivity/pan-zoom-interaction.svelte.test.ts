import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { renderMock } = vi.hoisted(() => ({
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><rect width="120" height="80"></rect><text>Interactive</text></svg>'
	}))
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: renderMock
	}
}));

describeInBrowser('ported streamdown pan-zoom pointer interactions', () => {
	testInBrowser('zooms on wheel input and pans on mouse drag', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><rect width="120" height="80"></rect><text>Interactive</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
		});

		const target = screen.container.querySelector('[data-mermaid-svg]') as HTMLElement;
		const interactionSurface = screen.container.querySelector(
			'[data-streamdown-mermaid] > div'
		) as HTMLElement;
		const initialTransform = target.style.transform;

		interactionSurface.dispatchEvent(
			new WheelEvent('wheel', {
				deltaY: -100,
				clientX: 120,
				clientY: 90,
				bubbles: true,
				cancelable: true
			})
		);

		await vi.waitFor(() => {
			expect(target.style.transform).not.toBe(initialTransform);
		});

		const zoomedTransform = target.style.transform;
		target.dispatchEvent(
			new MouseEvent('mousedown', {
				button: 0,
				clientX: 100,
				clientY: 100,
				bubbles: true,
				cancelable: true
			})
		);
		window.dispatchEvent(
			new MouseEvent('mousemove', {
				clientX: 150,
				clientY: 130,
				bubbles: true,
				cancelable: true
			})
		);
		window.dispatchEvent(
			new MouseEvent('mouseup', {
				clientX: 150,
				clientY: 130,
				bubbles: true
			})
		);

		await vi.waitFor(() => {
			expect(target.style.transform).not.toBe(zoomedTransform);
			expect(target.style.cursor).toBe('grab');
		});
	});
});
