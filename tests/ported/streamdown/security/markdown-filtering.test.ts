import { describe, expect, test } from 'vitest';
import type { Tokens } from 'marked';
import { defaultUrlTransform, lex } from '../../../../src/lib/index.js';
import {
	applyMarkdownUrlTransform,
	createMarkdownElement,
	filterMarkdownTokens
} from '../../../../src/lib/markdown.js';
import { renderHtmlToken, renderMarkdownFragment } from '../../../../src/lib/security/html.js';

describe('ported streamdown markdown filtering helpers', () => {
	test('createMarkdownElement normalizes tag names and defaultUrlTransform preserves URLs', () => {
		const element = createMarkdownElement('A', { href: 'https://example.com' });

		expect(element.tagName).toBe('a');
		expect(defaultUrlTransform('https://example.com', 'href', element)).toBe('https://example.com');
	});

	test('applyMarkdownUrlTransform uses the custom callback when provided', () => {
		const transformed = applyMarkdownUrlTransform(
			'https://example.com/file.png',
			'src',
			createMarkdownElement('img', { src: 'https://example.com/file.png' }),
			(url) => url.replace('https://example.com', 'https://proxy.test')
		);

		expect(transformed).toBe('https://proxy.test/file.png');
	});

	test('filterMarkdownTokens removes skipped raw HTML and unwraps disallowed markdown nodes', () => {
		const tokens = lex('**bold** <b>raw</b> and *italic*');
		const filtered = filterMarkdownTokens(tokens, {
			disallowedElements: ['strong'],
			skipHtml: true,
			unwrapDisallowed: true
		});
		const paragraph = filtered[0] as Tokens.Paragraph;
		const childTypes = paragraph.tokens.map((token) => token.type);

		expect(childTypes).not.toContain('strong');
		expect(childTypes).not.toContain('html');
		expect(
			paragraph.tokens.some((token) => token.type === 'text' && token.raw.includes('bold'))
		).toBe(true);
		expect(childTypes).toContain('em');
	});

	test('filterMarkdownTokens combines allowedElements with allowElement', () => {
		const filtered = filterMarkdownTokens(lex('# Keep\n\n## Drop\n\nParagraph'), {
			allowElement: (element) => element.tagName !== 'h2',
			allowedElements: ['h1', 'h2', 'p']
		});

		expect(filtered).toHaveLength(2);
		expect((filtered[0] as Tokens.Heading).depth).toBe(1);
		expect((filtered[1] as Tokens.Paragraph).type).toBe('paragraph');
	});

	test('filterMarkdownTokens exposes sibling children through the allowElement parent context', () => {
		const filtered = filterMarkdownTokens(lex('- first\n- second'), {
			allowElement: (element, index, parent) => {
				if (element.tagName !== 'li') {
					return true;
				}

				expect(parent?.tagName).toBe('ul');
				expect(parent?.children?.map((child) => child.tagName)).toEqual(['li', 'li']);
				return index > 0;
			}
		});
		const list = filtered[0] as Extract<(typeof filtered)[number], { type: 'list' }>;

		expect(list.tokens).toHaveLength(1);
		expect(list.tokens[0]?.text).toContain('second');
	});

	test('renderMarkdownFragment applies urlTransform before serializing safe HTML', () => {
		const html = renderMarkdownFragment('<a href="https://example.com">link</a>', {
			urlTransform: (url) => url.replace('https://example.com', 'https://proxy.test')
		});

		expect(html).toContain('https://proxy.test');
		expect(html).not.toContain('https://example.com');
	});

	test('renderHtmlToken escapes or removes raw HTML based on the filtering options', () => {
		const htmlToken = {
			block: false,
			pre: false,
			raw: '<b>bold</b>',
			text: '<b>bold</b>',
			type: 'html'
		} as Tokens.HTML;

		expect(renderHtmlToken(htmlToken, { renderHtml: false })).toContain('&lt;b&gt;bold&lt;/b&gt;');
		expect(renderHtmlToken(htmlToken, { skipHtml: true })).toBe('');
	});
});
