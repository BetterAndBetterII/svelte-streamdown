import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown mermaid rendering', () => {
	testInBrowser('renders mermaid blocks through plugins.mermaid with local controls', async () => {
		const initialize = vi.fn();
		const renderDiagram = vi
			.fn()
			.mockResolvedValueOnce({
				svg: '<svg width="120" height="80"><text>First Graph</text></svg>'
			})
			.mockResolvedValueOnce({
				svg: '<svg width="160" height="90"><text>Second Graph</text></svg>'
			});

		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```', '', '```mermaid', 'graph TD; X-->Y', '```'].join(
				'\n'
			),
			plugins: {
				mermaid: {
					name: 'mermaid',
					type: 'diagram',
					language: 'mermaid',
					getMermaid: (config) => {
						initialize(config);
						return {
							initialize,
							render: renderDiagram
						};
					}
				}
			},
			mermaidConfig: {
				theme: 'forest'
			}
		});

		await vi.waitFor(() => {
			const diagrams = screen.container.querySelectorAll('[data-mermaid-svg]');
			expect(diagrams).toHaveLength(2);
			expect(screen.container.textContent).toContain('First Graph');
			expect(screen.container.textContent).toContain('Second Graph');
		});

		expect(renderDiagram).toHaveBeenCalledTimes(2);
		expect(initialize).toHaveBeenCalledWith(
			expect.objectContaining({
				theme: 'forest',
				securityLevel: 'strict'
			})
		);
	});

	testInBrowser('renders the static Mermaid fallback when no renderer is configured', async () => {
		const screen = render(Streamdown, {
			content: ['```mermaid', 'graph TD; A-->B', '```'].join('\n')
		});

		await vi.waitFor(() => {
			const wrapper = screen.container.querySelector('[data-streamdown-mermaid]');
			expect(wrapper).toBeTruthy();
			expect(wrapper?.textContent).toContain('mermaid');
			expect(wrapper?.textContent).toContain('graph TD; A-->B');
		});

		expect(screen.container.querySelector('button[title="Download diagram"]')).toBeNull();
	});
});
