import type { Link, Root, Text } from 'mdast';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough';
import type { Pluggable, Plugin } from 'unified';
import type { Parent } from 'unist';
import { visit } from 'unist-util-visit';

export interface CjkPlugin {
	name: 'cjk';
	/**
	 * @deprecated Use remarkPluginsBefore and remarkPluginsAfter instead.
	 */
	remarkPlugins: Pluggable[];
	remarkPluginsAfter: Pluggable[];
	remarkPluginsBefore: Pluggable[];
	type: 'cjk';
}

const CJK_AUTOLINK_BOUNDARY_CHARS = new Set<string>([
	'。',
	'．',
	'，',
	'、',
	'？',
	'！',
	'：',
	'；',
	'（',
	'）',
	'【',
	'】',
	'「',
	'」',
	'『',
	'』',
	'〈',
	'〉',
	'《',
	'》'
]);

const AUTOLINK_PREFIX_PATTERN = /^(https?:\/\/|mailto:|www\.)/i;

const isAutolinkLiteral = (node: Link): node is Link & { children: [Text] } => {
	if (node.children.length !== 1) {
		return false;
	}

	const child = node.children[0];
	return child.type === 'text' && child.value === node.url;
};

const findCjkBoundaryIndex = (url: string): number | null => {
	let index = 0;
	for (const char of url) {
		if (CJK_AUTOLINK_BOUNDARY_CHARS.has(char)) {
			return index;
		}
		index += char.length;
	}
	return null;
};

const buildAutolink = (url: string, source: Link): Link => ({
	...source,
	url,
	children: [
		{
			type: 'text',
			value: url
		}
	]
});

const buildTrailingText = (value: string): Text => ({
	type: 'text',
	value
});

const remarkCjkAutolinkBoundary: Plugin<[], Root> = () => (tree) => {
	visit(tree, 'link', (node: Link, index: number | null | undefined, parent?: Parent) => {
		if (!parent || typeof index !== 'number') {
			return;
		}

		if (!isAutolinkLiteral(node) || !AUTOLINK_PREFIX_PATTERN.test(node.url)) {
			return;
		}

		const boundaryIndex = findCjkBoundaryIndex(node.url);
		if (boundaryIndex === null || boundaryIndex === 0) {
			return;
		}

		const trimmedUrl = node.url.slice(0, boundaryIndex);
		const trailing = node.url.slice(boundaryIndex);

		parent.children.splice(index, 1, buildAutolink(trimmedUrl, node), buildTrailingText(trailing));
		return index + 1;
	});
};

export function createCjkPlugin(): CjkPlugin {
	const remarkPluginsBefore: Pluggable[] = [remarkCjkFriendly];
	const remarkPluginsAfter: Pluggable[] = [
		remarkCjkAutolinkBoundary,
		remarkCjkFriendlyGfmStrikethrough
	];

	return {
		name: 'cjk',
		type: 'cjk',
		remarkPluginsBefore,
		remarkPluginsAfter,
		remarkPlugins: [...remarkPluginsBefore, ...remarkPluginsAfter]
	};
}

export const cjk = createCjkPlugin();
