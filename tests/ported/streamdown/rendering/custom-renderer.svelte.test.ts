import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import CustomCodeRenderer from '../../../fixtures/plugin-contract/CustomCodeRenderer.svelte';
import D2Renderer from '../../../fixtures/plugin-contract/D2Renderer.svelte';
import MetaPresenceRenderer from '../../../fixtures/plugin-contract/MetaPresenceRenderer.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown custom renderer contract', () => {
	testInBrowser('renders a custom renderer for a matching fenced language', async () => {
		const screen = render(Streamdown, {
			content: '```vega-lite\n{"mark":"bar"}\n```',
			static: true,
			plugins: {
				renderers: [{ language: 'vega-lite', component: CustomCodeRenderer }]
			}
		});

		await vi.waitFor(() => {
			const renderer = screen.container.querySelector('[data-testid="custom-renderer"]');
			expect(renderer).toBeTruthy();
			expect(renderer?.getAttribute('data-code')).toBe('{"mark":"bar"}');
		});
	});

	testInBrowser('forwards language, code, and isIncomplete props to the renderer', async () => {
		const screen = render(Streamdown, {
			content: '```vega-lite\ntest-code\n```',
			static: true,
			plugins: {
				renderers: [{ language: 'vega-lite', component: CustomCodeRenderer }]
			}
		});

		await vi.waitFor(() => {
			const renderer = screen.container.querySelector('[data-testid="custom-renderer"]');
			expect(renderer).toBeTruthy();
			expect(renderer?.getAttribute('data-language')).toBe('vega-lite');
			expect(renderer?.getAttribute('data-code')).toBe('test-code');
			expect(renderer?.getAttribute('data-incomplete')).toBe('false');
		});
	});

	testInBrowser('falls back to the default code block when no renderer matches', async () => {
		const screen = render(Streamdown, {
			content: "```javascript\nconsole.log('hello')\n```",
			static: true,
			plugins: {
				renderers: [{ language: 'vega-lite', component: CustomCodeRenderer }]
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-testid="custom-renderer"]')).toBeNull();
			expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
		});
	});

	testInBrowser('supports multiple renderer entries independently', async () => {
		const screen = render(Streamdown, {
			content: '```vega-lite\nchart-code\n```\n\n```d2\ndiagram-code\n```',
			static: true,
			plugins: {
				renderers: [
					{ language: 'vega-lite', component: CustomCodeRenderer },
					{ language: 'd2', component: D2Renderer }
				]
			}
		});

		await vi.waitFor(() => {
			const vegaRenderer = screen.container.querySelector('[data-testid="custom-renderer"]');
			const d2Renderer = screen.container.querySelector('[data-testid="d2-renderer"]');
			expect(vegaRenderer?.getAttribute('data-language')).toBe('vega-lite');
			expect(d2Renderer?.getAttribute('data-language')).toBe('d2');
			expect(vegaRenderer?.getAttribute('data-code')).toBe('chart-code');
			expect(d2Renderer?.getAttribute('data-code')).toBe('diagram-code');
		});
	});

	testInBrowser('supports array language matches for a single renderer entry', async () => {
		const screen = render(Streamdown, {
			content: '```vega\nchart1\n```\n\n```vega-lite\nchart2\n```',
			static: true,
			plugins: {
				renderers: [{ language: ['vega', 'vega-lite'], component: CustomCodeRenderer }]
			}
		});

		await vi.waitFor(() => {
			const renderers = screen.container.querySelectorAll('[data-testid="custom-renderer"]');
			expect(renderers).toHaveLength(2);
		});
	});

	testInBrowser(
		'preserves the default code block path when no renderers are configured',
		async () => {
			const screen = render(Streamdown, {
				content: '```javascript\nconst x = 1;\n```',
				static: true
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
			});
		}
	);

	testInBrowser('forwards code fence meta to the custom renderer when present', async () => {
		const screen = render(Streamdown, {
			content: '```rust {1} title="foo"\nlet x = 1;\n```',
			static: true,
			plugins: {
				renderers: [{ language: 'rust', component: CustomCodeRenderer }]
			}
		});

		await vi.waitFor(() => {
			const renderer = screen.container.querySelector('[data-testid="custom-renderer"]');
			expect(renderer?.getAttribute('data-meta')).toBe('{1} title="foo"');
		});
	});

	testInBrowser('passes undefined meta when no metastring is present', async () => {
		const screen = render(Streamdown, {
			content: '```rust\nlet x = 1;\n```',
			static: true,
			plugins: {
				renderers: [{ language: 'rust', component: MetaPresenceRenderer }]
			}
		});

		await vi.waitFor(() => {
			const renderer = screen.container.querySelector('[data-testid="meta-renderer"]');
			expect(renderer?.getAttribute('data-has-meta')).toBe('false');
		});
	});
});
