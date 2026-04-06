import type { Link, Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified, type Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, test, vi } from 'vitest';
import {
	cjk,
	code,
	createCjkPlugin,
	createCodePlugin,
	createMathPlugin,
	createMermaidPlugin,
	math,
	mermaid
} from '../lib/index.js';

describe('plugin factories', () => {
	test('exports default plugin instances with reference-compatible discriminators', () => {
		expect(code.name).toBe('shiki');
		expect(code.type).toBe('code-highlighter');
		expect(math.name).toBe('katex');
		expect(math.type).toBe('math');
		expect(mermaid.name).toBe('mermaid');
		expect(mermaid.type).toBe('diagram');
		expect(cjk.name).toBe('cjk');
		expect(cjk.type).toBe('cjk');
	});

	test('createCodePlugin exposes themes and supported language checks', () => {
		const plugin = createCodePlugin({
			themes: ['github-light', 'github-dark']
		});

		expect(plugin.getThemes()).toStrictEqual(['github-light', 'github-dark']);
		expect(plugin.supportsLanguage('javascript')).toBe(true);
		expect(plugin.supportsLanguage('definitely-not-a-language')).toBe(false);
	});

	test('createMathPlugin carries local math options through the plugin contract', () => {
		const plugin = createMathPlugin({
			singleDollarTextMath: true,
			errorColor: '#ff0000'
		});

		expect(plugin.remarkPlugin).toBeInstanceOf(Array);
		expect(plugin.rehypePlugin).toBeInstanceOf(Array);
		expect((plugin.remarkPlugin as [unknown, { singleDollarTextMath: boolean }])[1]).toStrictEqual({
			singleDollarTextMath: true
		});
		expect((plugin.rehypePlugin as [unknown, { errorColor: string }])[1]).toStrictEqual({
			errorColor: '#ff0000'
		});
		expect(plugin.getStyles?.()).toBe('katex/dist/katex.min.css');
	});

	test('createMermaidPlugin returns an isolated plugin instance per call', () => {
		const plugin1 = createMermaidPlugin({
			config: {
				theme: 'neutral'
			}
		});
		const plugin2 = createMermaidPlugin();

		expect(plugin1).not.toBe(plugin2);
		expect(plugin1.language).toBe('mermaid');
		expect(plugin2.language).toBe('mermaid');
	});

	test('createCjkPlugin returns independent before/after arrays', () => {
		const plugin1 = createCjkPlugin();
		const plugin2 = createCjkPlugin();

		expect(plugin1.remarkPluginsBefore).toHaveLength(1);
		expect(plugin1.remarkPluginsAfter).toHaveLength(2);
		expect(plugin1.remarkPlugins).toHaveLength(3);
		expect(plugin1.remarkPluginsBefore).not.toBe(plugin2.remarkPluginsBefore);
		expect(plugin1.remarkPluginsAfter).not.toBe(plugin2.remarkPluginsAfter);
	});

	test('createCjkPlugin exposes standalone-compatible autolink remark hooks', async () => {
		const [autolinkBoundaryPlugin] = createCjkPlugin().remarkPluginsAfter as Plugin<[], Root>[];
		const processor = unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(autolinkBoundaryPlugin)
			.use(remarkStringify);
		const tree = (await processor.run(processor.parse('请访问 https://example.com。谢谢'))) as Root;
		const links: Link[] = [];

		visit(tree, 'link', (node: Link) => {
			links.push(node);
		});

		expect(links).toHaveLength(1);
		expect(links[0].url).toBe('https://example.com');
	});

	test('createCodePlugin highlights through the async callback when tokens are not ready yet', async () => {
		const plugin = createCodePlugin();
		const callback = vi.fn();

		const initial = plugin.highlight(
			{
				code: 'const answer = 42;',
				language: 'javascript',
				themes: plugin.getThemes()
			},
			callback
		);

		expect(initial).toBeNull();

		await vi.waitFor(() => {
			expect(callback).toHaveBeenCalled();
			const line = callback.mock.calls[0]?.[0]?.tokens[0]
				?.map((token: { content: string }) => token.content)
				.join('');
			expect(line).toContain('const answer = 42;');
		});
	});
});
