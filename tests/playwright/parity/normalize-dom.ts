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

		const normalizeClassName = (value: string): string | null => {
			const normalizedValue = value
				.split(/\s+/)
				.filter((className) => semanticClassNames.has(className))
				.sort()
				.join(' ');

			return normalizedValue.length > 0 ? normalizedValue : null;
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
				if (element.hasAttribute(attributeName)) {
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
			const nextPreserveWhitespace =
				preserveWhitespace || whitespaceSensitiveTags.has(element.tagName);
			const attributes = collectAttributes(element);
			const children = [...element.childNodes].flatMap((childNode) =>
				normalizeNode(childNode, nextPreserveWhitespace)
			);

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
			children: [...rootElement.childNodes].flatMap((childNode) => normalizeNode(childNode, false))
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
