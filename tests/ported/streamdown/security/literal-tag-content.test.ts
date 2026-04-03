import { expect } from 'vitest';
import { describeInNode, testInNode } from '../../../helpers/index.js';
import { preprocessLiteralTagContent } from '../../../../src/lib/security/preprocess-literal-tag-content.js';

describeInNode('ported streamdown security literal tag preprocessing', () => {
	testInNode('escapes markdown metacharacters inside configured tags', () => {
		expect(
			preprocessLiteralTagContent('<mention user_id=\"123\">_some_username_</mention>', [
				'mention'
			])
		).toBe('<mention user_id=\"123\">\\_some\\_username\\_</mention>');
	});

	testInNode('preserves blank lines inside configured tags without splitting the tag block', () => {
		expect(preprocessLiteralTagContent('<tag>first\n\nsecond</tag>', ['tag'])).toBe(
			'<tag>first&#10;&#10;second</tag>'
		);
	});
});
