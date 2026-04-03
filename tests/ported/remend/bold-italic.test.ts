import { expect } from 'vitest';
import { describeInNode, parseIncompleteMarkdownText, testInNode } from '../../helpers/index.js';

describeInNode('ported remend bold-italic behavior', () => {
	testInNode('completes incomplete triple-asterisk spans', () => {
		expect(parseIncompleteMarkdownText('Text with ***bold-italic')).toBe(
			'Text with ***bold-italic***'
		);
		expect(parseIncompleteMarkdownText('***incomplete')).toBe('***incomplete***');
		expect(parseIncompleteMarkdownText('***first*** and ***second')).toBe(
			'***first*** and ***second***'
		);
		expect(parseIncompleteMarkdownText('*italic* **bold** ***both')).toBe(
			'*italic* **bold** ***both***'
		);
		expect(parseIncompleteMarkdownText('***Starting bold-italic')).toBe(
			'***Starting bold-italic***'
		);
	});

	testInNode('handles nested code and chunk-by-chunk bold-italic recovery', () => {
		expect(parseIncompleteMarkdownText('***bold-italic with `code')).toBe(
			'***bold-italic with `code***`'
		);

		const chunks = [
			'This is',
			'This is ***very',
			'This is ***very important',
			'This is ***very important***',
			'This is ***very important*** to know'
		];

		expect(parseIncompleteMarkdownText(chunks[0])).toBe('This is');
		expect(parseIncompleteMarkdownText(chunks[1])).toBe('This is ***very***');
		expect(parseIncompleteMarkdownText(chunks[2])).toBe('This is ***very important***');
		expect(parseIncompleteMarkdownText(chunks[3])).toBe(chunks[3]);
		expect(parseIncompleteMarkdownText(chunks[4])).toBe(chunks[4]);
	});

	testInNode(
		'preserves overlapping bold and italic closers instead of inventing extra triple markers',
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
});
