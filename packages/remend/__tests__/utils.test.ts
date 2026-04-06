import { expect } from 'vitest';
import {
	findMatchingClosingBracket,
	findMatchingOpeningBracket,
	isWordChar
} from 'remend/utils';
import { describeInNode, testInNode } from '../../../tests/helpers/index.js';

describeInNode('remend package utils surface', () => {
	testInNode('keeps word-character checks and bracket helpers available from the standalone package', () => {
		expect(isWordChar('')).toBe(false);
		expect(isWordChar('a')).toBe(true);
		expect(isWordChar('é')).toBe(true);
		expect(isWordChar('-')).toBe(false);

		expect(findMatchingOpeningBracket('[outer [inner] text]', 19)).toBe(0);
		expect(findMatchingOpeningBracket('[outer [inner] text]', 13)).toBe(7);
		expect(findMatchingClosingBracket('[outer [inner] text]', 0)).toBe(19);
		expect(findMatchingClosingBracket('[outer [inner] text]', 7)).toBe(13);
	});
});
