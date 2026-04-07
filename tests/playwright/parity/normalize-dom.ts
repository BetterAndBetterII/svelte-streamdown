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

		const footnoteButtonAttributeName = 'data-streamdown-footnote-button';

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
			'aria-selected',
			'class',
			'colspan',
			'href',
			'role',
			'rowspan',
			'scope',
			'src',
			'target',
			'title',
			'type',
			'value'
		]);

		const normalizeText = (value: string, preserveWhitespace: boolean): string | null => {
			if (preserveWhitespace) {
				return value.length > 0 ? value : null;
			}

			const normalizedValue = value.replace(/\s+/g, ' ');
			return normalizedValue.trim().length > 0 ? normalizedValue : null;
		};
			const canonicalBlockMath = '$$math$$';
			const hasRenderedMathMl = (element: Element): boolean =>
				element.querySelector('.katex .katex-mathml > math') !== null;

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

			if (name === 'href' && value.startsWith('#')) {
				return '#ref';
			}

			return value;
		};

		const collectAttributes = (
			element: Element
		): Record<string, BrowserNormalizedDomAttributeValue> => {
			const attributes: Record<string, BrowserNormalizedDomAttributeValue> = {};

			if (
				element.tagName === 'A' &&
				(element.hasAttribute('data-footnote-ref') || element.hasAttribute('data-footnote-backref'))
			) {
				return {
					[footnoteButtonAttributeName]: true,
					type: 'button'
				};
			}

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
				const normalizedText = normalizeText(node.textContent ?? '', preserveWhitespace);
				return normalizedText === null ? [] : [{ kind: 'text', text: normalizedText }];
			}

			if (node.nodeType !== Node.ELEMENT_NODE) {
				return [];
			}

			const element = node as Element;
			if (element.hasAttribute('data-streamdown-inline-math')) {
				if (hasRenderedMathMl(element)) {
					return [{ kind: 'text', text: '$math$' }];
				}
			}

			if (element.hasAttribute('data-streamdown-block-math')) {
				if (hasRenderedMathMl(element) && element.querySelector('.katex-display')) {
					return [{ kind: 'text', text: canonicalBlockMath }];
				}
			}

			const nextPreserveWhitespace =
				preserveWhitespace || whitespaceSensitiveTags.has(element.tagName);
			if (element.tagName.toLowerCase() === 'svg') {
				const attributes = collectAttributes(element);
				const normalizedSvg: BrowserNormalizedDomElementNode = {
					kind: 'element',
					tag: element.tagName.toLowerCase(),
					children: []
				};

				if (Object.keys(attributes).length > 0) {
					normalizedSvg.attrs = attributes;
				}

				return [normalizedSvg];
			}
			const attributes = collectAttributes(element);
			const children = mergeAdjacentTextNodes(
				[...element.childNodes].flatMap((childNode) =>
					normalizeNode(childNode, nextPreserveWhitespace)
				)
			);
			if (element.tagName === 'CODE' && element.parentElement?.tagName === 'PRE') {
				return [
					{
						kind: 'element',
						tag: 'code',
						children: [{ kind: 'text', text: element.textContent ?? '' }]
					}
				];
			}
			const normalizedTag =
				element.tagName === 'A' &&
				(element.hasAttribute('data-footnote-ref') || element.hasAttribute('data-footnote-backref'))
					? 'button'
					: element.tagName === 'STRONG'
						? 'span'
					: element.tagName.toLowerCase();

			if (shouldFlattenWrapper(element, attributes, children)) {
				return children;
			}

			const normalizedElement: BrowserNormalizedDomElementNode = {
				kind: 'element',
				tag: normalizedTag,
				children
			};

			if (Object.keys(attributes).length > 0) {
				const normalizedAttributes =
					footnoteButtonAttributeName in attributes
						? Object.fromEntries(
								Object.entries(attributes)
									.filter(([name]) => name !== footnoteButtonAttributeName)
									.sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
							)
						: attributes;

				if (Object.keys(normalizedAttributes).length > 0) {
					normalizedElement.attrs = normalizedAttributes;
				}
			}

			if (normalizedElement.tag === 'li') {
				const checkboxChild = normalizedElement.children[0];
				const checkboxTextChild = normalizedElement.children[1];
				if (
					checkboxChild?.kind === 'element' &&
					checkboxChild.tag === 'input' &&
					checkboxTextChild?.kind === 'text' &&
					!checkboxTextChild.text.startsWith(' ')
				) {
					checkboxTextChild.text = ` ${checkboxTextChild.text}`;
				}

				const trailingButton = normalizedElement.children.at(-1);
				const paragraph = normalizedElement.children.find(
					(childNode) => childNode.kind === 'element' && childNode.tag === 'p'
				);
				if (
					trailingButton?.kind === 'element' &&
					trailingButton.tag === 'button' &&
					paragraph?.kind === 'element' &&
					normalizedElement.children.length >= 2
				) {
					if (
						paragraph.children.length > 0 &&
						paragraph.children.at(-1)?.kind === 'text'
					) {
						(paragraph.children.at(-1) as BrowserNormalizedDomTextNode).text += ' ';
					} else {
						paragraph.children.push({ kind: 'text', text: ' ' });
					}
					paragraph.children.push(trailingButton);
					normalizedElement.children = normalizedElement.children.filter(
						(childNode, index) => index !== normalizedElement.children.length - 1
					);
				}

				const nestedListIndex = normalizedElement.children.findIndex(
					(childNode) =>
						childNode.kind === 'element' && (childNode.tag === 'ul' || childNode.tag === 'ol')
				);
				const textBeforeNestedList =
					nestedListIndex > 0 ? normalizedElement.children[nestedListIndex - 1] : null;
				if (
					textBeforeNestedList?.kind === 'text' &&
					!textBeforeNestedList.text.endsWith(' ')
				) {
					textBeforeNestedList.text = `${textBeforeNestedList.text} `;
				}
			}

			if (normalizedElement.tag === 'p') {
				for (let index = 0; index < normalizedElement.children.length; index += 1) {
					const childNode = normalizedElement.children[index];
					const previousNode = normalizedElement.children[index - 1];
					if (
						childNode?.kind === 'element' &&
						childNode.tag === 'button' &&
						childNode.children.length === 1 &&
						childNode.children[0]?.kind === 'text' &&
						childNode.children[0].text.startsWith('mailto:') &&
						previousNode?.kind === 'text'
					) {
						previousNode.text += 'mailto:';
						childNode.children[0].text = childNode.children[0].text.slice('mailto:'.length);
					}
				}

				if (
					normalizedElement.children.length === 1 &&
					normalizedElement.children[0]?.kind === 'text' &&
					normalizedElement.children[0].text.trimStart().startsWith('|')
				) {
					normalizedElement.children[0].text = normalizedElement.children[0].text.trimEnd();
				}

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
