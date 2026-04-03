import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

const HELLO_WORLD_UNDERSCORE_REGEX = /hello_world_/;
const TRAILING_UNDERSCORE_REGEX = /_$/;

describeInNode('ported remend underscore bug behavior', () => {
	testInNode('keeps word-internal underscores untouched', () => {
		expect(parseIncompleteMarkdownText('hello_world')).toBe('hello_world');
		expect(parseIncompleteMarkdownText('hello_world_test')).toBe('hello_world_test');
		expect(parseIncompleteMarkdownText('MAX_VALUE')).toBe('MAX_VALUE');
		expect(parseIncompleteMarkdownText('The user_name and user_email are required')).toBe(
			'The user_name and user_email are required'
		);
		expect(parseIncompleteMarkdownText('Visit https://example.com/path_with_underscore')).toBe(
			'Visit https://example.com/path_with_underscore'
		);
		expect(parseIncompleteMarkdownText('The value is 1_000_000')).toBe('The value is 1_000_000');
	});

	testInNode('still completes underscore italics at real boundaries', () => {
		expect(parseIncompleteMarkdownText('_italic text')).toBe('_italic text_');
		expect(parseIncompleteMarkdownText('This is _italic')).toBe('This is _italic_');
		expect(parseIncompleteMarkdownText('_italic\n')).toBe('_italic_\n');
		expect(parseIncompleteMarkdownText('_privateVariable')).toBe('_privateVariable_');
		expect(parseIncompleteMarkdownText('The variable_name is _important')).toBe(
			'The variable_name is _important_'
		);
		expect(parseIncompleteMarkdownText('The user_id field stores the _unique identifier')).toBe(
			'The user_id field stores the _unique identifier_'
		);
	});

	testInNode('avoids false underscore closure in code, html, and the original bug case', () => {
		expect(parseIncompleteMarkdownText('word_')).toBe('word_');
		expect(parseIncompleteMarkdownText('Use `variable_name` in your code')).toBe(
			'Use `variable_name` in your code'
		);
		expect(parseIncompleteMarkdownText('_complete italic_ and some_other_text')).toBe(
			'_complete italic_ and some_other_text'
		);
		expect(parseIncompleteMarkdownText('```\nfunction_name()\n```')).toBe(
			'```\nfunction_name()\n```'
		);
		expect(parseIncompleteMarkdownText('<div data_attribute="value">')).toBe(
			'<div data_attribute="value">'
		);

		const input = `hello_world

<a href="example_link"/>`;
		const result = parseIncompleteMarkdownText(input);
		expect(result).toBe(input);
		expect(result).not.toMatch(HELLO_WORLD_UNDERSCORE_REGEX);
		expect(result).not.toMatch(TRAILING_UNDERSCORE_REGEX);
	});
});
