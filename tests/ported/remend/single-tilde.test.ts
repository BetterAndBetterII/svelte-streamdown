import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend single tilde escaping', () => {
	testInNode('escapes single tildes between word characters', () => {
		expect(parseIncompleteMarkdownText('20~25°C')).toBe('20\\~25°C');
		expect(parseIncompleteMarkdownText('20~25°C。20~25°C')).toBe('20\\~25°C。20\\~25°C');
		expect(parseIncompleteMarkdownText('foo~bar')).toBe('foo\\~bar');
		expect(parseIncompleteMarkdownText('20~25 and ~~strike')).toBe('20\\~25 and ~~strike~~');
	});

	testInNode('preserves complete strikethrough and non-word single tildes', () => {
		expect(parseIncompleteMarkdownText('~~strikethrough~~')).toBe('~~strikethrough~~');
		expect(parseIncompleteMarkdownText('~hello')).toBe('~hello');
		expect(parseIncompleteMarkdownText('hello~')).toBe('hello~');
		expect(parseIncompleteMarkdownText('hello ~ world')).toBe('hello ~ world');
	});

	testInNode('does not escape tildes inside code spans or code fences', () => {
		expect(parseIncompleteMarkdownText('```\n20~25\n```')).toBe('```\n20~25\n```');
		expect(parseIncompleteMarkdownText('`20~25`')).toBe('`20~25`');
	});
});
