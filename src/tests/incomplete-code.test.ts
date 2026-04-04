import { describe, expect, test } from 'vitest';
import { hasIncompleteCodeFence, hasTable } from '../lib/index.js';

describe('incomplete code helpers', () => {
	test('detects incomplete backtick and tilde fences through the public helper export', () => {
		expect(hasIncompleteCodeFence('```javascript\nconst x = 1;')).toBe(true);
		expect(hasIncompleteCodeFence('~~~python\ndef hello():')).toBe(true);
		expect(hasIncompleteCodeFence('Some text\n```python\ndef hello():')).toBe(true);
	});

	test('treats matching closing fences as complete', () => {
		expect(hasIncompleteCodeFence('```javascript\nconst x = 1;\n```')).toBe(false);
		expect(hasIncompleteCodeFence('~~~javascript\nconst x = 1;\n~~~')).toBe(false);
		expect(hasIncompleteCodeFence('```js\ncode1\n```\n\n```python\ncode2\n```')).toBe(false);
	});

	test('requires matching fence character and sufficient fence length', () => {
		expect(hasIncompleteCodeFence('````\ncode\n```')).toBe(true);
		expect(hasIncompleteCodeFence('````\ncode\n`````')).toBe(false);
		expect(hasIncompleteCodeFence('```\ncode\n~~~')).toBe(true);
		expect(hasIncompleteCodeFence('~~~\ncode\n```')).toBe(true);
	});

	test('ignores prose inline backticks and four-space indented blocks', () => {
		expect(hasIncompleteCodeFence('Use ``` to start a code fence')).toBe(false);
		expect(hasIncompleteCodeFence('The syntax is ``` for code blocks')).toBe(false);
		expect(hasIncompleteCodeFence('    ```\ncode')).toBe(false);
	});

	test('detects streamed tables through the public helper export', () => {
		expect(hasTable('| Name | Age |\n| --- | --- |\n| Alice | 30 |')).toBe(true);
		expect(hasTable('Name | Age\n--- | ---\nAlice | 30')).toBe(true);
		expect(hasTable('| Header |\n| --- |')).toBe(true);
	});

	test('does not false-positive on non-table content', () => {
		expect(hasTable('Just some regular text')).toBe(false);
		expect(hasTable('Some text\n\n---\n\nMore text')).toBe(false);
		expect(hasTable('')).toBe(false);
	});
});
