import { expect } from 'vitest';
import { hasIncompleteCodeFence, hasTable, useIsCodeFenceIncomplete } from '../../../../src/lib/index.js';
import { describeInNode, testInNode } from '../../../helpers/index.js';

describeInNode('ported streamdown hasIncompleteCodeFence utility', () => {
	testInNode('returns true for incomplete backtick code fence', () => {
		expect(hasIncompleteCodeFence('```javascript\nconst x = 1;')).toBe(true);
		expect(hasIncompleteCodeFence('```\ncode here')).toBe(true);
		expect(hasIncompleteCodeFence('Some text\n```python\ndef hello():')).toBe(true);
	});

	testInNode('returns true for incomplete tilde code fence', () => {
		expect(hasIncompleteCodeFence('~~~javascript\nconst x = 1;')).toBe(true);
		expect(hasIncompleteCodeFence('~~~\ncode here')).toBe(true);
		expect(hasIncompleteCodeFence('Some text\n~~~python\ndef hello():')).toBe(true);
	});

	testInNode('returns false for complete backtick code fence', () => {
		expect(hasIncompleteCodeFence('```javascript\nconst x = 1;\n```')).toBe(false);
		expect(hasIncompleteCodeFence('```\ncode\n```')).toBe(false);
		expect(hasIncompleteCodeFence('No code fence here')).toBe(false);
	});

	testInNode('returns false for complete tilde code fence', () => {
		expect(hasIncompleteCodeFence('~~~javascript\nconst x = 1;\n~~~')).toBe(false);
		expect(hasIncompleteCodeFence('~~~\ncode\n~~~')).toBe(false);
	});

	testInNode('returns false for multiple complete code blocks', () => {
		expect(hasIncompleteCodeFence('```js\ncode1\n```\n\n```python\ncode2\n```')).toBe(false);
	});

	testInNode('returns false for multiple complete tilde code blocks', () => {
		expect(hasIncompleteCodeFence('~~~js\ncode1\n~~~\n\n~~~python\ncode2\n~~~')).toBe(false);
	});

	testInNode('returns true for one complete and one incomplete code block', () => {
		expect(hasIncompleteCodeFence('```js\ncode1\n```\n\n```python\ncode2')).toBe(true);
	});

	testInNode('returns true for mixed fences with incomplete tilde', () => {
		expect(hasIncompleteCodeFence('```js\ncode1\n```\n\n~~~python\ncode2')).toBe(true);
	});

	testInNode('handles mixed complete fences', () => {
		expect(hasIncompleteCodeFence('```js\ncode1\n```\n\n~~~python\ncode2\n~~~')).toBe(false);
	});

	testInNode('handles 6+ backtick fences correctly', () => {
		expect(hasIncompleteCodeFence('``````\ncode here')).toBe(true);
		expect(hasIncompleteCodeFence('``````\ncode\n``````')).toBe(false);
		expect(hasIncompleteCodeFence('``````\ncode\n```')).toBe(true);
	});

	testInNode('handles 4+ backtick fences correctly', () => {
		expect(hasIncompleteCodeFence('````\ncode')).toBe(true);
		expect(hasIncompleteCodeFence('````\ncode\n````')).toBe(false);
		expect(hasIncompleteCodeFence('````\ncode\n`````')).toBe(false);
		expect(hasIncompleteCodeFence('````\ncode\n```')).toBe(true);
	});

	testInNode('does not false-positive on inline backticks in prose', () => {
		expect(hasIncompleteCodeFence('Use ``` to start a code fence')).toBe(false);
		expect(hasIncompleteCodeFence('The syntax is ``` for code blocks')).toBe(false);
	});

	testInNode('allows up to 3 spaces of indentation for fences', () => {
		expect(hasIncompleteCodeFence('   ```\ncode')).toBe(true);
		expect(hasIncompleteCodeFence('   ```\ncode\n   ```')).toBe(false);
		expect(hasIncompleteCodeFence('    ```\ncode')).toBe(false);
	});

	testInNode('requires same character for closing fence', () => {
		expect(hasIncompleteCodeFence('```\ncode\n~~~')).toBe(true);
		expect(hasIncompleteCodeFence('~~~\ncode\n```')).toBe(true);
	});
});

describeInNode('ported streamdown hasTable utility', () => {
	testInNode('detects a basic GFM table', () => {
		expect(hasTable('| Name | Age |\n| --- | --- |\n| Alice | 30 |')).toBe(true);
	});

	testInNode('detects a table with alignment markers', () => {
		expect(hasTable('| Left | Center | Right |\n| :--- | :---: | ---: |')).toBe(true);
	});

	testInNode('detects a table with only delimiter row streamed', () => {
		expect(hasTable('| Header |\n| --- |')).toBe(true);
	});

	testInNode('detects a table without leading pipes', () => {
		expect(hasTable('Name | Age\n--- | ---\nAlice | 30')).toBe(true);
	});

	testInNode('returns false for regular text', () => {
		expect(hasTable('Just some regular text')).toBe(false);
	});

	testInNode('returns false for a heading with dashes', () => {
		expect(hasTable('# My Heading\n\nSome text')).toBe(false);
	});

	testInNode('returns false for a horizontal rule', () => {
		expect(hasTable('Some text\n\n---\n\nMore text')).toBe(false);
	});

	testInNode('returns false for empty string', () => {
		expect(hasTable('')).toBe(false);
	});

	testInNode('detects table in mixed content', () => {
		expect(hasTable('Some intro text\n\n| Col |\n| --- |\n| Val |')).toBe(true);
	});
});

describeInNode('ported streamdown incomplete-code-block exports', () => {
	testInNode('exports useIsCodeFenceIncomplete hook', () => {
		expect(useIsCodeFenceIncomplete).toBeDefined();
		expect(typeof useIsCodeFenceIncomplete).toBe('function');
	});

	testInNode('exports hasIncompleteCodeFence utility', () => {
		expect(hasIncompleteCodeFence).toBeDefined();
		expect(typeof hasIncompleteCodeFence).toBe('function');
	});

	testInNode('exports hasTable utility', () => {
		expect(hasTable).toBeDefined();
		expect(typeof hasTable).toBe('function');
	});
});
