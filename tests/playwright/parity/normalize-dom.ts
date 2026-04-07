import type { Locator } from '@playwright/test';

type NormalizedDomAttributeValue = string | true;

type NormalizedDomTextNode = {
	kind: 'text';
	text: string;
};

type NormalizedDomElementNode = {
	kind: 'element';
	tag: string;
	attrs?: Record<string, NormalizedDomAttributeValue>;
	children: NormalizedDomNode[];
};

export type NormalizedDomNode = NormalizedDomTextNode | NormalizedDomElementNode;

export type NormalizedDomFragment = {
	kind: 'fragment';
	children: NormalizedDomNode[];
};

const INDENTATION = '  ';

export async function normalizeDom(locator: Locator): Promise<NormalizedDomFragment> {
	return locator.evaluate((rootElement) => {
		type BrowserNormalizedDomAttributeValue = string | true;

		type BrowserNormalizedDomTextNode = {
			kind: 'text';
			text: string;
		};

		type BrowserNormalizedDomElementNode = {
			kind: 'element';
			tag: string;
			attrs?: Record<string, BrowserNormalizedDomAttributeValue>;
			children: BrowserNormalizedDomNode[];
		};

		type BrowserNormalizedDomNode = BrowserNormalizedDomTextNode | BrowserNormalizedDomElementNode;

		type BrowserNormalizedDomFragment = {
			kind: 'fragment';
			children: BrowserNormalizedDomNode[];
		};

		const whitespaceSensitiveTags = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);
		const ignorableWrapperTags = new Set(['DIV', 'SPAN']);
		const semanticClassNames = new Set(['contains-task-list', 'task-list-item']);
		const booleanAttributeNames = new Set([
			'checked',
			'controls',
			'disabled',
			'multiple',
			'open',
			'selected'
		]);
		const semanticAttributeNames = new Set([
			'alt',
			'aria-checked',
			'aria-hidden',
			'aria-label',
			'aria-selected',
			'class',
			'colspan',
			'cx',
			'cy',
				'd',
			'fill',
			'height',
			'href',
			'id',
			'points',
			'preserveaspectratio',
			'r',
			'role',
			'rowspan',
			'rx',
			'ry',
			'scope',
			'src',
			'stroke',
			'stroke-width',
			'target',
			'title',
			'transform',
			'type',
			'value',
			'viewbox',
			'width',
			'x',
			'x1',
			'x2',
			'xmlns',
			'y',
			'y1',
			'y2'
		]);
			const canonicalBlockMath = '$$math$$';

		const normalizeMermaidDynamicIds = (value: string): string =>
			value.replace(/mermaid-\d+-\d+-[a-z0-9]+/gi, 'mermaid-ref');

		const normalizeText = (value: string, preserveWhitespace: boolean): string | null => {
			const normalizedMermaidText = normalizeMermaidDynamicIds(value);
			if (preserveWhitespace) {
				return normalizedMermaidText.length > 0 ? normalizedMermaidText : null;
			}

			const normalizedValue = normalizedMermaidText.replace(/\s+/g, ' ');
			return normalizedValue.trim().length > 0 ? normalizedValue : null;
		};

		const normalizeTextNode = (node: Text, preserveWhitespace: boolean): string | null => {
			const rawValue = node.textContent ?? '';
			const normalizedText = normalizeText(rawValue, preserveWhitespace);
			if (normalizedText === null || preserveWhitespace) {
				return normalizedText;
			}

			let nextText = normalizedText;
			if (/^\s/.test(rawValue) && node.previousSibling !== null) {
				nextText = ` ${nextText}`;
			}
			if (/\s$/.test(rawValue) && node.nextSibling !== null) {
				nextText = `${nextText} `;
			}

			return nextText;
		};

		const hasRenderedMathMl = (element: Element): boolean =>
			element.querySelector('.katex .katex-mathml > math, .katex-mathml > math') !== null;
		const isEmptyBlockMathRender = (element: Element): boolean => {
			const childElements = [...element.children];
			return (
				childElements.length === 2 &&
				childElements[0]?.tagName === 'MATH' &&
				childElements[1]?.tagName === 'SPAN' &&
				childElements[1]?.getAttribute('aria-hidden') === 'true'
			);
		};

		const normalizeClassName = (value: string): string | null => {
			const normalizedValue = value
				.split(/\s+/)
				.filter((className) => semanticClassNames.has(className))
				.sort()
				.join(' ');

			return normalizedValue.length > 0 ? normalizedValue : null;
		};

		const mergeAdjacentTextNodes = (
			nodes: BrowserNormalizedDomNode[]
		): BrowserNormalizedDomNode[] => {
			const merged: BrowserNormalizedDomNode[] = [];

			for (const node of nodes) {
				const previousNode = merged.at(-1);
				if (node.kind === 'text' && previousNode?.kind === 'text') {
					previousNode.text += node.text;
					continue;
				}

				merged.push(node);
			}

			return merged;
		};

		const normalizeAttributeValue = (
			name: string,
			value: string
		): BrowserNormalizedDomAttributeValue | null => {
			if (name === 'class') {
				return normalizeClassName(value);
			}

			return normalizeMermaidDynamicIds(value);
		};

		const collectAttributes = (
			element: Element
		): Record<string, BrowserNormalizedDomAttributeValue> => {
			const attributes: Record<string, BrowserNormalizedDomAttributeValue> = {};

			for (const attribute of [...element.attributes]) {
				const attributeName = attribute.name.toLowerCase();
				if (!semanticAttributeNames.has(attributeName)) {
					continue;
				}

				const normalizedValue = normalizeAttributeValue(attributeName, attribute.value);
				if (normalizedValue === null) {
					continue;
				}

				attributes[attributeName] = normalizedValue;
			}

			for (const attributeName of booleanAttributeNames) {
				const booleanValue =
					attributeName in element
						? Boolean((element as unknown as Record<string, unknown>)[attributeName])
						: element.hasAttribute(attributeName);
				if (booleanValue) {
					attributes[attributeName] = true;
				}
			}

			return Object.fromEntries(
				Object.entries(attributes).sort(([leftName], [rightName]) =>
					leftName.localeCompare(rightName)
				)
			);
		};

		const hasMeaningfulDirectText = (element: Element): boolean =>
			[...element.childNodes].some((childNode) => {
				if (childNode.nodeType !== Node.TEXT_NODE) {
					return false;
				}

				return normalizeText(childNode.textContent ?? '', false) !== null;
			});

		const shouldFlattenWrapper = (
			element: Element,
			attributes: Record<string, BrowserNormalizedDomAttributeValue>,
			children: BrowserNormalizedDomNode[]
		): boolean => {
			if (!ignorableWrapperTags.has(element.tagName)) {
				return false;
			}

			if (Object.keys(attributes).length > 0) {
				return false;
			}

			if (hasMeaningfulDirectText(element)) {
				return false;
			}

			return children.length > 0;
		};

		const normalizeNode = (node: Node, preserveWhitespace: boolean): BrowserNormalizedDomNode[] => {
			if (node.nodeType === Node.COMMENT_NODE) {
				return [];
			}

			if (node.nodeType === Node.TEXT_NODE) {
				const normalizedText = normalizeTextNode(node as Text, preserveWhitespace);
				return normalizedText === null ? [] : [{ kind: 'text', text: normalizedText }];
			}

			if (node.nodeType !== Node.ELEMENT_NODE) {
				return [];
			}

			const element = node as Element;
			if (element.tagName.toLowerCase() === 'svg' && element.closest('button[title]')) {
				return [
					{
						kind: 'element',
						tag: 'svg',
						children: []
					}
				];
			}

			if (
				hasRenderedMathMl(element) &&
				(element.matches('[data-streamdown-inline-math], .katex') ||
					(element.matches('span') && !isEmptyBlockMathRender(element))) &&
				!element.matches('.katex-display') &&
				!element.querySelector('.katex-display')
			) {
				return [{ kind: 'text', text: '$math$' }];
			}

			if (
				hasRenderedMathMl(element) &&
				(element.matches('[data-streamdown-block-math], .katex-display') ||
					isEmptyBlockMathRender(element) ||
					element.querySelector('.katex-display'))
			) {
				return [{ kind: 'text', text: canonicalBlockMath }];
			}

			const nextPreserveWhitespace =
				preserveWhitespace || whitespaceSensitiveTags.has(element.tagName);
			const attributes = collectAttributes(element);
			const children = mergeAdjacentTextNodes(
				[...element.childNodes].flatMap((childNode) =>
					normalizeNode(childNode, nextPreserveWhitespace)
				)
			);

			if (element.hasAttribute('data-streamdown-link-blocked')) {
				for (const child of children) {
					if (child.kind === 'text') {
						child.text = child.text.replace(/^\s+/, ' ');
					}
				}
			}

			for (const child of children) {
				if (child.kind === 'text') {
					child.text = child.text.replace(/ {2,}(?=\[[^\]]+\])/g, ' ');
				}
			}

			if (
				element.tagName === 'LI' &&
				element.classList.contains('task-list-item') &&
				children[0]?.kind === 'element' &&
				children[0].tag === 'input' &&
				children[1]?.kind === 'text' &&
				!children[1].text.startsWith(' ')
			) {
				children[1].text = `  ${children[1].text}`;
			}

			if (
				element.tagName === 'LI' &&
				element.classList.contains('task-list-item') &&
				children[1]?.kind === 'text' &&
				(children.some(
					(child) =>
						child.kind === 'element' && (child.tag === 'ul' || child.tag === 'ol')
					))
			) {
				children[1].text = children[1].text.endsWith('  ')
					? children[1].text
					: `${children[1].text}  `;
			}

			if (
				element.tagName === 'P' &&
				children.length === 1 &&
				children[0]?.kind === 'text' &&
				children[0].text.startsWith('|')
			) {
				children[0].text = children[0].text.trimEnd();
			}

			if (
				element.tagName === 'P' &&
				children.length === 1 &&
				children[0]?.kind === 'text' &&
				children[0].text.startsWith('Mermaid Error:')
			) {
				children[0].text = children[0].text.replace(/^Mermaid Error:\s+/, 'Mermaid Error:  ');
			}

			if (shouldFlattenWrapper(element, attributes, children)) {
				return children;
			}

			const normalizedElement: BrowserNormalizedDomElementNode = {
				kind: 'element',
				tag: element.tagName.toLowerCase(),
				children
			};

			if (Object.keys(attributes).length > 0) {
				normalizedElement.attrs = attributes;
			}

			return [normalizedElement];
		};

		const fragment: BrowserNormalizedDomFragment = {
			kind: 'fragment',
			children: mergeAdjacentTextNodes(
				[...rootElement.childNodes].flatMap((childNode) => normalizeNode(childNode, false))
			)
		};

		return fragment;
	});
}

export function formatNormalizedDom(fragment: NormalizedDomFragment): string {
	if (fragment.children.length === 0) {
		return '<empty />';
	}

	return fragment.children.map((childNode) => formatNormalizedDomNode(childNode, 0)).join('\n');
}

function formatNormalizedDomNode(node: NormalizedDomNode, depth: number): string {
	const indentation = INDENTATION.repeat(depth);

	if (node.kind === 'text') {
		return `${indentation}${JSON.stringify(node.text)}`;
	}

	const attributeText = formatNormalizedDomAttributes(node.attrs);
	if (node.children.length === 0) {
		return `${indentation}<${node.tag}${attributeText} />`;
	}

	const formattedChildren = node.children
		.map((childNode) => formatNormalizedDomNode(childNode, depth + 1))
		.join('\n');

	return `${indentation}<${node.tag}${attributeText}>\n${formattedChildren}\n${indentation}</${node.tag}>`;
}

function formatNormalizedDomAttributes(
	attributes: Record<string, NormalizedDomAttributeValue> | undefined
): string {
	if (!attributes || Object.keys(attributes).length === 0) {
		return '';
	}

	return Object.entries(attributes)
		.map(([name, value]) => (value === true ? ` ${name}` : ` ${name}=${JSON.stringify(value)}`))
		.join('');
}
