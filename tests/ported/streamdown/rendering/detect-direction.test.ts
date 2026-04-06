import { expect } from 'vitest';
import { describeInNode, testInNode } from '../../../helpers/index.js';
import { detectTextDirection } from '../../../../src/lib/detect-direction.js';

describeInNode('ported streamdown detect direction helper', () => {
	testInNode('matches the frozen first-strong-character direction heuristics', () => {
		expect(detectTextDirection('Hello world')).toBe('ltr');
		expect(detectTextDirection('مرحبا بالعالم')).toBe('rtl');
		expect(detectTextDirection('שלום עולם')).toBe('rtl');
		expect(detectTextDirection('## مرحبا')).toBe('rtl');
		expect(detectTextDirection('123. مرحبا')).toBe('rtl');
		expect(detectTextDirection('**שלום**')).toBe('rtl');
		expect(detectTextDirection('')).toBe('ltr');
		expect(detectTextDirection('12345')).toBe('ltr');
		expect(detectTextDirection('Hello مرحبا')).toBe('ltr');
		expect(detectTextDirection('مرحبا Hello')).toBe('rtl');
		expect(detectTextDirection('ދިވެހި')).toBe('rtl');
		expect(detectTextDirection('`code` مرحبا')).toBe('rtl');
		expect(detectTextDirection('# **مرحبا** [link](https://example.com)')).toBe('rtl');
		expect(detectTextDirection('> `const x = 1` English then עברית')).toBe('ltr');
		expect(detectTextDirection('--- ... ###')).toBe('ltr');
	});
});
