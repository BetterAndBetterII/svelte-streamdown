import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { renderMock } = vi.hoisted(() => ({
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><text>Fullscreen Diagram</text></svg>'
	}))
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: renderMock
	}
}));

describeInBrowser('ported streamdown mermaid fullscreen control', () => {
	testInBrowser('toggles fullscreen state and exits on Escape', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>Fullscreen Diagram</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
		});

		(screen.container.querySelector('button[title="View fullscreen"]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			const expanded = screen.container.querySelector(
				'[data-streamdown-mermaid] > div[data-expanded="true"]'
			);
			expect(expanded).toBeTruthy();
			expect(screen.container.querySelector('button[title="Exit fullscreen"]')).toBeTruthy();
		});

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

		await vi.waitFor(() => {
			const collapsed = screen.container.querySelector(
				'[data-streamdown-mermaid] > div[data-expanded="false"]'
			);
			expect(collapsed).toBeTruthy();
			expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
		});
	});
});
