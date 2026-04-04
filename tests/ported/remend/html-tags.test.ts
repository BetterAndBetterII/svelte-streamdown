import { expect } from 'vitest';
import { IncompleteMarkdownParser } from '../../../src/lib/index.js';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend incomplete HTML tag stripping', () => {
	testInNode('strips incomplete opening and closing tags at the stream tail', () => {
		expect(parseIncompleteMarkdownText('Hello <div')).toBe('Hello');
		expect(parseIncompleteMarkdownText('Hello <custom')).toBe('Hello');
		expect(parseIncompleteMarkdownText('Hello <casecard')).toBe('Hello');
		expect(parseIncompleteMarkdownText('Text <MyComponent')).toBe('Text');
		expect(parseIncompleteMarkdownText('Hello </div')).toBe('Hello');
		expect(parseIncompleteMarkdownText('Hello </custom')).toBe('Hello');
		expect(parseIncompleteMarkdownText('<div>content</di')).toBe('<div>content');
		expect(parseIncompleteMarkdownText('Some text here\n\n<casecard')).toBe('Some text here');
		expect(parseIncompleteMarkdownText('# Heading\n\nParagraph <custom')).toBe(
			'# Heading\n\nParagraph'
		);
		expect(parseIncompleteMarkdownText('<div>Hello</div> <span')).toBe('<div>Hello</div>');
	});

	testInNode('keeps complete HTML and non-tag comparisons unchanged', () => {
		expect(parseIncompleteMarkdownText('Hello <div>')).toBe('Hello <div>');
		expect(parseIncompleteMarkdownText('<div>content</div>')).toBe('<div>content</div>');
		expect(parseIncompleteMarkdownText('<br/>')).toBe('<br/>');
		expect(parseIncompleteMarkdownText("<img src='test'>")).toBe("<img src='test'>");
		expect(parseIncompleteMarkdownText('<a target="_blank" href="https://link.com">word</a>')).toBe(
			'<a target="_blank" href="https://link.com">word</a>'
		);
		expect(parseIncompleteMarkdownText('<a target="_blank">link</a>')).toBe(
			'<a target="_blank">link</a>'
		);
		expect(parseIncompleteMarkdownText('<iframe src="x" sandbox="allow_scripts">')).toBe(
			'<iframe src="x" sandbox="allow_scripts">'
		);
		expect(parseIncompleteMarkdownText('3 < 5')).toBe('3 < 5');
		expect(parseIncompleteMarkdownText('x < y')).toBe('x < y');
		expect(parseIncompleteMarkdownText('if a <')).toBe('if a <');
		expect(parseIncompleteMarkdownText('value <1')).toBe('value <1');
	});

	testInNode('strips incomplete tags with partial attributes and tags at the start of text', () => {
		expect(parseIncompleteMarkdownText('Hello <div class="foo')).toBe('Hello');
		expect(parseIncompleteMarkdownText('Hello <div class=')).toBe('Hello');
		expect(parseIncompleteMarkdownText('Hello <a href="https://example.com')).toBe('Hello');
		expect(parseIncompleteMarkdownText('<custom data-id')).toBe('');
		expect(parseIncompleteMarkdownText('<div')).toBe('');
		expect(parseIncompleteMarkdownText('<custom')).toBe('');
		expect(parseIncompleteMarkdownText('</div')).toBe('');
	});

	testInNode('does not strip incomplete tags inside code spans or fenced code blocks', () => {
		expect(parseIncompleteMarkdownText('```\n<div\n```')).toBe('```\n<div\n```');
		expect(parseIncompleteMarkdownText('```html\n<custom')).toBe('```html\n<custom\n```');
		expect(parseIncompleteMarkdownText('`<div`')).toBe('`<div`');
	});

	testInNode('can disable the html tail stripping plugin explicitly', () => {
		const plugins = IncompleteMarkdownParser.createDefaultPlugins().filter(
			(plugin) => plugin.name !== 'htmlTags'
		);

		expect(parseIncompleteMarkdownText('Hello <div', plugins)).toBe('Hello <div');
	});
});
