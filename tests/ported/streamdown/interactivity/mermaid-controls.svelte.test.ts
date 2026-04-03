import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
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
	testInBrowser('downloads mermaid source and toggles fullscreen state', async () => {
		saveMock.mockReset();

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
			expect(renderMock).toHaveBeenCalled();
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
			screen.container.querySelector('button[title="Download diagram as MMD"]') as HTMLButtonElement
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
	});
});
