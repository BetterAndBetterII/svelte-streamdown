import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend mixed formatting behavior', () => {
	testInNode('completes incomplete bold-italic formatting and chunk boundaries', () => {
		expect(parseIncompleteMarkdownText('Text with ***bold-italic')).toBe(
			'Text with ***bold-italic***'
		);
		expect(parseIncompleteMarkdownText('***incomplete')).toBe('***incomplete***');
		expect(parseIncompleteMarkdownText('***bold-italic with `code')).toBe(
			'***bold-italic with `code***`'
		);
		expect(parseIncompleteMarkdownText('This is ***very')).toBe('This is ***very***');
		expect(parseIncompleteMarkdownText('This is ***very important')).toBe(
			'This is ***very important***'
		);
	});

	testInNode(
		'preserves overlapping closing markers instead of inventing new triple-asterisk spans',
		() => {
			expect(parseIncompleteMarkdownText('Combined **bold and *italic*** text')).toBe(
				'Combined **bold and *italic*** text'
			);
			expect(parseIncompleteMarkdownText('**bold and *italic*** more text')).toBe(
				'**bold and *italic*** more text'
			);
			expect(parseIncompleteMarkdownText('test **bold and *italic*** end')).toBe(
				'test **bold and *italic*** end'
			);
			expect(parseIncompleteMarkdownText('- Combined **bold and *italic*** text')).toBe(
				'- Combined **bold and *italic*** text'
			);
		}
	);

	testInNode('matches remend closure ordering across mixed incomplete formats', () => {
		expect(parseIncompleteMarkdownText('**bold and *italic')).toBe('**bold and *italic*');
		expect(parseIncompleteMarkdownText('*italic with **bold')).toBe('*italic with **bold***');
		expect(parseIncompleteMarkdownText('**bold with `code')).toBe('**bold with `code**`');
		expect(parseIncompleteMarkdownText('~~strike with **bold')).toBe('~~strike with **bold**~~');
		expect(parseIncompleteMarkdownText('**bold with $x^2')).toBe('**bold with $x^2**');
		expect(parseIncompleteMarkdownText('**bold *italic `code ~~strike')).toBe(
			'**bold *italic `code ~~strike*`'
		);
		expect(parseIncompleteMarkdownText('combined **_bold and italic')).toBe(
			'combined **_bold and italic_**'
		);
		expect(parseIncompleteMarkdownText('**_text')).toBe('**_text_**');
		expect(parseIncompleteMarkdownText('_italic and **bold')).toBe('_italic and **bold**_');
	});

	testInNode('keeps links as the higher-priority recovery path over formatting completion', () => {
		expect(parseIncompleteMarkdownText('Text with [link and **bold')).toBe(
			'Text with [link and **bold](streamdown:incomplete-link)'
		);
		expect(parseIncompleteMarkdownText('[**bold link')).toBe(
			'[**bold link](streamdown:incomplete-link)'
		);
		expect(parseIncompleteMarkdownText('[outer [inner]')).toBe(
			'[outer [inner]](streamdown:incomplete-link)'
		);
	});

	testInNode('matches rapid successive formatting switches from remend regression cases', () => {
		expect(parseIncompleteMarkdownText('**bold then *italic then ~~strike')).toBe(
			'**bold then *italic then ~~strike*~~'
		);
		expect(parseIncompleteMarkdownText('~~strike **bold *italic')).toBe(
			'~~strike **bold *italic*~~'
		);
		expect(parseIncompleteMarkdownText('*italic **bold ~~strike `code')).toBe(
			'*italic **bold ~~strike `code***`~~'
		);
		expect(parseIncompleteMarkdownText('**bold ~~strike')).toBe('**bold ~~strike**~~');
		expect(parseIncompleteMarkdownText('*italic **bold')).toBe('*italic **bold***');
	});
});
