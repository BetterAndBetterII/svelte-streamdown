import { expect, vi } from 'vitest';
import { createMermaidPlugin, mermaid } from '@streamdown/mermaid';
import { describeInNode, testInNode } from '../../../helpers/index.js';

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(async () => ({
			svg: '<svg width="120" height="80"><text>Graph</text></svg>'
		}))
	}
}));

describeInNode('ported standalone @streamdown/mermaid package', () => {
	testInNode('exposes the mermaid plugin contract and renders diagrams', async () => {
		expect(mermaid.name).toBe('mermaid');
		expect(mermaid.type).toBe('diagram');
		expect(mermaid.language).toBe('mermaid');
		expect(typeof mermaid.getMermaid).toBe('function');

		const plugin = createMermaidPlugin({ config: { theme: 'forest' } });
		expect(plugin).not.toBe(mermaid);
		const instance = plugin.getMermaid();
		instance.initialize({ theme: 'default' });
		const result = await instance.render('test-diagram', 'graph TD; A[Start] --> B[End]');
		expect(result.svg).toContain('svg');
	});
});
