import { expect } from 'vitest';
import remend, {
	isWithinCodeBlock,
	isWithinLinkOrImageUrl,
	isWithinMathBlock,
	isWordChar,
	type RemendHandler
} from 'remend';
import { describeInNode, testInNode } from '../../helpers/index.js';

const JOKE_MARKER_PATTERN = /<<<JOKE>>>([^<]*)$/;

describeInNode('ported remend custom handlers', () => {
	testInNode('executes custom handlers and preserves priority ordering', () => {
		const calls: string[] = [];
		const highPriority: RemendHandler = {
			name: 'high',
			priority: 5,
			handle: (text) => {
				calls.push('high');
				return text;
			}
		};
		const lowPriority: RemendHandler = {
			name: 'low',
			priority: 200,
			handle: (text) => {
				calls.push('low');
				return `${text}?`;
			}
		};

		expect(remend('**bold', { handlers: [lowPriority, highPriority] })).toBe('**bold**?');
		expect(calls).toStrictEqual(['high', 'low']);
	});

	testInNode('supports fully custom-only parsing when built-ins are disabled', () => {
		const handler: RemendHandler = {
			name: 'uppercase',
			handle: (text) => text.toUpperCase()
		};

		expect(
			remend('hello', {
				bold: false,
				italic: false,
				boldItalic: false,
				inlineCode: false,
				strikethrough: false,
				katex: false,
				links: false,
				images: false,
				setextHeadings: false,
				handlers: [handler]
			})
		).toBe('HELLO');
	});

	testInNode('exports the standalone helper utilities needed by custom handlers', () => {
		expect(isWithinCodeBlock('```\ncode\n```', 5)).toBe(true);
		expect(isWithinCodeBlock('before ```code``` after', 2)).toBe(false);
		expect(isWithinMathBlock('$$x^2$$', 3)).toBe(true);
		expect(isWithinMathBlock('before $x$ after', 14)).toBe(false);
		expect(isWithinLinkOrImageUrl('[text](http://example.com)', 10)).toBe(true);
		expect(isWithinLinkOrImageUrl('before [text](url) after', 2)).toBe(false);
		expect(isWordChar('a')).toBe(true);
		expect(isWordChar('_')).toBe(true);
		expect(isWordChar('*')).toBe(false);
	});

	testInNode('keeps standalone remend extensibility examples executable', () => {
		const jokeHandler: RemendHandler = {
			name: 'joke',
			priority: 80,
			handle: (text) => {
				const match = text.match(JOKE_MARKER_PATTERN);
				if (match && !text.endsWith('<<</JOKE>>>')) {
					return `${text}<<</JOKE>>>`;
				}
				return text;
			}
		};

		expect(remend('<<<JOKE>>>Why did the chicken', { handlers: [jokeHandler] })).toBe(
			'<<<JOKE>>>Why did the chicken<<</JOKE>>>'
		);
	});
});
