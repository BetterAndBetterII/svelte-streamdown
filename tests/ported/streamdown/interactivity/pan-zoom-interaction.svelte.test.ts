import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import MermaidPanZoomToggleHarness from './fixtures/MermaidPanZoomToggleHarness.svelte';

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
	testInBrowser('zooms on wheel input and pans on mouse drag by default', async () => {
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

		const target = screen.container.querySelector(
			'[data-streamdown-mermaid] [role="application"]'
		) as HTMLElement;
		const interactionSurface = screen.container.querySelector(
			'[data-streamdown-mermaid] [role="application"]'
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

	testInBrowser('disables wheel zoom independently while keeping drag pan enabled', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><rect width="120" height="80"></rect><text>Interactive</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			},
			controls: {
				mermaid: {
					mouseWheelZoom: false
				}
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Zoom in"]')).toBeTruthy();
		});

		const target = screen.container.querySelector(
			'[data-streamdown-mermaid] [role="application"]'
		) as HTMLElement;
		const interactionSurface = screen.container.querySelector(
			'[data-streamdown-mermaid] [role="application"]'
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
			expect(target.style.transform).toBe(initialTransform);
		});

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
			expect(target.style.transform).not.toBe(initialTransform);
			expect(target.style.cursor).toBe('grab');
		});
	});

	testInBrowser('clears interaction styles when pan-zoom is disabled after mount', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><rect width="120" height="80"></rect><text>Interactive</text></svg>'
		});

		const screen = render(MermaidPanZoomToggleHarness);

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-mermaid-svg]')).toBeTruthy();
		});

		const target = screen.container.querySelector(
			'[data-streamdown-mermaid] [role="application"]'
		) as HTMLElement;
		const interactionSurface = target.parentElement as HTMLElement;

		expect(interactionSurface.style.touchAction).toBe('none');
		expect(interactionSurface.style.cursor).toBe('grab');

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
				clientX: 120,
				clientY: 120,
				bubbles: true,
				cancelable: true
			})
		);
		window.dispatchEvent(
			new MouseEvent('mouseup', {
				clientX: 120,
				clientY: 120,
				bubbles: true
			})
		);

		await vi.waitFor(() => {
			expect(target.style.cursor).toBe('grab');
		});

		(screen.container.querySelector('[data-toggle-panzoom]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(target.style.cursor).toBe('');
			expect(interactionSurface.style.cursor).toBe('');
			expect(interactionSurface.style.touchAction).toBe('');
			expect(
				(interactionSurface.style as CSSStyleDeclaration & { overscrollBehavior?: string })
					.overscrollBehavior
			).toBe('');
		});
	});
});
