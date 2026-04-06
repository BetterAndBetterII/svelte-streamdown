import { expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { initializeMock, renderMock } = vi.hoisted(() => ({
	initializeMock: vi.fn(),
	renderMock: vi.fn(async () => ({
		svg: '<svg width="120" height="80"><text>Coverage Diagram</text></svg>'
	}))
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: initializeMock,
		render: renderMock
	}
}));

describeInBrowser('ported streamdown final-coverage regressions', () => {
	testInBrowser(
		'keeps mermaid controls enabled when the mermaid key is omitted or explicitly undefined',
		async () => {
			renderMock.mockReset();
			initializeMock.mockReset();
			renderMock.mockResolvedValue({
				svg: '<svg width="120" height="80"><text>Coverage Diagram</text></svg>'
			});

			const content = ['```mermaid', 'graph TD; A-->B', '```'].join('\n');
			const omitted = render(Streamdown, {
				content,
				components: {
					mermaid: Mermaid
				},
				controls: {}
			});
			const explicitUndefined = render(Streamdown, {
				content,
				components: {
					mermaid: Mermaid
				},
				controls: {
					mermaid: undefined
				}
			});

			await vi.waitFor(() => {
				expect(omitted.container.querySelector('button[title="Download diagram"]')).toBeTruthy();
				expect(
					explicitUndefined.container.querySelector('button[title="Download diagram"]')
				).toBeTruthy();
			});

			expect(omitted.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
			expect(
				explicitUndefined.container.querySelector('button[title="View fullscreen"]')
			).toBeTruthy();
			expect(omitted.container.querySelector('button[title="Zoom in"]')).toBeTruthy();
			expect(explicitUndefined.container.querySelector('button[title="Zoom in"]')).toBeTruthy();
		}
	);

	testInBrowser(
		'strips skipped HTML while still honoring urlTransform for rendered markdown urls',
		() => {
			const stripped = render(Streamdown, {
				content: 'Before\n\n<b>bold text</b>\n\nAfter',
				skipHtml: true,
				static: true
			});

			expect(stripped.container.innerHTML).not.toContain('<b>');
			expect(stripped.container.textContent).toContain('Before');
			expect(stripped.container.textContent).toContain('After');

			const transformed = render(Streamdown, {
				content: '![alt](https://example.com/image.png)',
				static: true,
				urlTransform: (url: string) => `${url}?proxied=1`
			});

			const image = transformed.container.querySelector('img');
			expect(image).toBeTruthy();
			expect(image?.getAttribute('src')).toContain('?proxied=1');
		}
	);
});
