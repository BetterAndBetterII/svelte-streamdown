import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { saveMock, renderMock, svgToPngBlobMock } = vi.hoisted(() => ({
	saveMock: vi.fn(),
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><text>Mermaid graph</text></svg>'
	})),
	svgToPngBlobMock: vi.fn(async () => new Blob(['png'], { type: 'image/png' }))
}));

vi.mock('$lib/utils/save.js', () => ({
	save: saveMock
}));

vi.mock('$lib/utils/mermaid.js', async () => {
	const actual = await vi.importActual<typeof import('../../../../src/lib/utils/mermaid.js')>(
		'../../../../src/lib/utils/mermaid.js'
	);
	return {
		...actual,
		svgToPngBlob: svgToPngBlobMock
	};
});

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: renderMock
	}
}));

describeInBrowser('ported streamdown mermaid download controls', () => {
	testInBrowser('toggles the download menu and exposes PNG, SVG, and MMD actions', async () => {
		renderMock.mockReset();
		saveMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>Download Menu</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
		});

		(
			screen.container.querySelector('button[title="Download diagram"]') as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(
				screen.container.querySelector('button[title="Download diagram as PNG"]')
			).toBeTruthy();
			expect(
				screen.container.querySelector('button[title="Download diagram as SVG"]')
			).toBeTruthy();
			expect(
				screen.container.querySelector('button[title="Download diagram as MMD"]')
			).toBeTruthy();
		});

		(
			screen.container.querySelector('button[title="Download diagram"]') as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download diagram as PNG"]')).toBeNull();
		});
	});

	testInBrowser('downloads Mermaid source, SVG markup, and PNG blobs', async () => {
		renderMock.mockReset();
		saveMock.mockReset();
		svgToPngBlobMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>Exported Diagram</text></svg>'
		});
		svgToPngBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
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
			screen.container.querySelector('button[title="Download diagram as SVG"]') as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(saveMock).toHaveBeenCalledWith(
				'diagram.svg',
				expect.stringContaining('<svg'),
				'image/svg+xml'
			);
		});

		(
			screen.container.querySelector('button[title="Download diagram"]') as HTMLButtonElement
		).click();
		await vi.waitFor(() => {
			expect(
				screen.container.querySelector('button[title="Download diagram as PNG"]')
			).toBeTruthy();
		});
		(
			screen.container.querySelector('button[title="Download diagram as PNG"]') as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(svgToPngBlobMock).toHaveBeenCalledWith(expect.stringContaining('<svg'));
			expect(saveMock).toHaveBeenCalledWith('diagram.png', expect.any(Blob), 'image/png');
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
	});

	testInBrowser('disables mermaid controls while the stream is animating', async () => {
		renderMock.mockReset();
		renderMock.mockResolvedValue({
			svg: '<svg width="120" height="80"><text>Streaming Diagram</text></svg>'
		});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n'),
			isAnimating: true,
			components: {
				mermaid: Mermaid
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Zoom in"]')).toBeTruthy();
		});

		expect(screen.container.querySelector('button[title="Download diagram"]')).toHaveAttribute(
			'disabled'
		);
		expect(screen.container.querySelector('button[title="View fullscreen"]')).toHaveAttribute(
			'disabled'
		);
		expect(screen.container.querySelector('button[title="Zoom in"]')).not.toHaveAttribute(
			'disabled'
		);
	});
});
