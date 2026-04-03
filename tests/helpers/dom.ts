import { expect } from 'vitest';
import { assertTestEnvironment } from './environment.js';

type HtmlLike = string | { innerHTML: string };
const WHITESPACE_SENSITIVE_TAGS = new Set(['PRE', 'CODE', 'TEXTAREA', 'SCRIPT', 'STYLE']);

function readHtml(value: HtmlLike): string {
	if (typeof value === 'string') {
		return value;
	}

	return value.innerHTML;
}

function stripIgnoredAttributes(element: Element): void {
	for (const attribute of [...element.attributes]) {
		if (
			attribute.name === 'class' ||
			attribute.name === 'style' ||
			attribute.name.startsWith('data-streamdown-')
		) {
			element.removeAttribute(attribute.name);
		}
	}
}

function normalizeNode(node: Node, preserveWhitespace: boolean): void {
	if (node.nodeType === Node.COMMENT_NODE) {
		node.parentNode?.removeChild(node);
		return;
	}

	if (node.nodeType === Node.TEXT_NODE && !preserveWhitespace) {
		node.textContent = node.textContent?.replace(/\s+/g, ' ') ?? '';
		return;
	}

	if (node.nodeType !== Node.ELEMENT_NODE) {
		return;
	}

	const element = node as Element;
	stripIgnoredAttributes(element);

	const nextPreserveWhitespace =
		preserveWhitespace || WHITESPACE_SENSITIVE_TAGS.has(element.tagName.toUpperCase());

	for (const child of [...element.childNodes]) {
		normalizeNode(child, nextPreserveWhitespace);
	}
}

export function normalizeDomHtml(value: HtmlLike): string {
	assertTestEnvironment('browser');

	const template = document.createElement('template');
	template.innerHTML = readHtml(value);

	for (const child of [...template.content.childNodes]) {
		normalizeNode(child, false);
	}

	return template.innerHTML.replace(/>\s+</g, '><').trim();
}

export function expectNormalizedHtml(actual: HtmlLike, expected: HtmlLike): void {
	expect(normalizeDomHtml(actual)).toBe(normalizeDomHtml(expected));
}

export function getNormalizedInnerHtml(element: { innerHTML: string }): string {
	assertTestEnvironment('browser');
	return normalizeDomHtml(element);
}
