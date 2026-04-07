import type { Link, Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified, type Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { expect } from 'vitest';
import { cjk, createCjkPlugin } from '@streamdown-svelte/cjk';
import { describeInNode, testInNode } from '../../../helpers/index.js';

describeInNode('ported standalone @streamdown-svelte/cjk package', () => {
	testInNode('exposes the plugin arrays and splits autolinks at CJK punctuation', async () => {
		expect(cjk.name).toBe('cjk');
		expect(cjk.type).toBe('cjk');
		expect(cjk.remarkPluginsBefore).toHaveLength(1);
		expect(cjk.remarkPluginsAfter).toHaveLength(2);
		expect(cjk.remarkPlugins).toHaveLength(3);

		const plugin = createCjkPlugin();
		expect(plugin).not.toBe(cjk);
		expect(plugin.remarkPluginsBefore).not.toBe(cjk.remarkPluginsBefore);

		const [autolinkBoundaryPlugin] = cjk.remarkPluginsAfter as Plugin<[], Root>[];
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
});
