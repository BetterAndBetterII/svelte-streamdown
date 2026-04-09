import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Code from '../../../../src/lib/Elements/Code.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import BlockComponentProbe from './fixtures/BlockComponentProbe.svelte';
import ComponentOverrideProbe from './fixtures/ComponentOverrideProbe.svelte';
import SnippetPriorityHarness from './fixtures/SnippetPriorityHarness.svelte';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown component overrides', () => {
	testInBrowser(
		'renders the default component map for headings, lists, links, blockquotes, and code',
		() => {
			const screen = render(Streamdown, {
				content: [
					'# Heading 1',
					'## Heading 2',
					'### Heading 3',
					'',
					'- Bullet item',
					'1. Ordered item',
					'',
					'Paragraph with [Link](https://example.com) and `inline`.',
					'',
					'> Quoted text',
					'',
					'```js',
					'console.log("hello");',
					'```'
				].join('\n'),
				mode: 'static',
				linkSafety: {
					enabled: false
				}
			});

			expect(screen.container.querySelector('h1')?.className).toContain('text-3xl');
			expect(screen.container.querySelector('h2')?.className).toContain('text-2xl');
			expect(screen.container.querySelector('h3')?.className).toContain('text-xl');
			expect(screen.container.querySelector('ul')?.className).toContain('list-disc');
			expect(screen.container.querySelector('ol')?.className).toContain('list-outside');
			expect(screen.container.querySelector('li')?.className).toContain('py-1');
			expect(screen.container.querySelector('a')?.className).toContain('wrap-anywhere');
			expect(screen.container.querySelector('a')?.getAttribute('target')).toBe('_blank');
			expect(screen.container.querySelector('blockquote')?.className).toContain('border-l-4');
			expect(screen.container.querySelector('[data-streamdown-codespan]')?.className).toContain(
				'font-mono'
			);
			expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
		}
	);

	testInBrowser('matches reference ordered-list attributes and blocked incomplete-link rendering', () => {
		const screen = render(Streamdown, {
			content: ['3. Third', '4. Fourth', '', 'Paragraph with [dangling link'].join('\n'),
			mode: 'streaming',
			isAnimating: true,
			caret: 'block'
		});

		const orderedList = screen.container.querySelector('ol');
		const listItems = [...screen.container.querySelectorAll('li')];
		const blockedLink = screen.container.querySelector('[data-streamdown-link-blocked]');

		expect(orderedList?.getAttribute('start')).toBe('3');
		expect(listItems[0]?.getAttribute('value')).toBeNull();
		expect(listItems[1]?.getAttribute('value')).toBeNull();
		expect(blockedLink?.textContent).toContain('[blocked]');
		expect(blockedLink?.getAttribute('title')).toBe('Blocked URL: undefined');
		expect(screen.container.querySelector('a[data-incomplete="true"]')).toBeNull();
	});

	testInBrowser(
		'supports reference-style components overrides for headings, paragraphs, links, images, tables, and inline code',
		() => {
			const screen = render(StreamdownWithFutureProps, {
				content: [
					'# Heading 1',
					'',
					'## Heading 2',
					'',
					'Paragraph with [Link](https://example.com) and `inline`.',
					'',
					'![Alt text](https://example.com/cat.png)',
					'',
					'| Name | Value |',
					'| ---- | ----- |',
					'| Foo | Bar |'
				].join('\n'),
				components: {
					h1: ComponentOverrideProbe,
					h2: ComponentOverrideProbe,
					p: ComponentOverrideProbe,
					a: ComponentOverrideProbe,
					img: ComponentOverrideProbe,
					table: ComponentOverrideProbe,
					inlineCode: ComponentOverrideProbe
				},
				linkSafety: {
					enabled: false
				}
			});

			expect(screen.container.querySelector('h1[data-override="h1"]')?.textContent).toContain(
				'Heading 1'
			);
			expect(screen.container.querySelector('h2[data-override="h2"]')?.textContent).toContain(
				'Heading 2'
			);
			expect(screen.container.querySelector('p[data-override="p"]')?.textContent).toContain(
				'Paragraph with'
			);

			const link = screen.container.querySelector('a[data-override="a"]');
			expect(link?.getAttribute('href')).toBe('https://example.com/');
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
			expect(link?.textContent).toBe('Link');

			const inlineCode = screen.container.querySelector('code[data-override="inlineCode"]');
			expect(inlineCode?.textContent).toBe('inline');

			const image = screen.container.querySelector('img[data-override="img"]');
			expect(image?.getAttribute('src')).toBe('https://example.com/cat.png');
			expect(image?.getAttribute('alt')).toBe('Alt text');

			const table = screen.container.querySelector('table[data-override="table"]');
			expect(table).toBeTruthy();
			expect(table?.textContent).toContain('Name');
			expect(table?.textContent).toContain('Foo');
		}
	);

	testInBrowser('keeps snippet overrides ahead of components for the same token', () => {
		const screen = render(SnippetPriorityHarness, {
			content: 'Paragraph text'
		});

		expect(screen.container.querySelector('p[data-snippet="paragraph"]')?.textContent).toContain(
			'Paragraph text'
		);
		expect(screen.container.querySelector('p[data-override="p"]')).toBeNull();
	});

	testInBrowser(
		'keeps block code overrides working while inlineCode only affects codespans',
		() => {
			const screen = render(StreamdownWithFutureProps, {
				content: ['Inline `value`', '', '```javascript', 'console.log("hello");', '```'].join('\n'),
				components: {
					code: Code,
					inlineCode: ComponentOverrideProbe
				}
			});

			expect(screen.container.querySelector('code[data-override="inlineCode"]')?.textContent).toBe(
				'value'
			);
			expect(screen.container.querySelector('[data-streamdown-code]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Copy Code"]')).toBeTruthy();
		}
	);

	testInBrowser(
		'supports broader reference-style components overrides for blockquotes, lists, tables, and text formatting',
		() => {
			const screen = render(StreamdownWithFutureProps, {
				content: [
					'> Quote',
					'',
					'- Bullet',
					'',
					'1. Ordered',
					'',
					'| Name | Value |',
					'| ---- | ----- |',
					'| Foo | Bar |',
					'',
					'**bold** _italic_ ~~gone~~ H~2~O x^2^'
				].join('\n'),
				mode: 'static',
				components: {
					blockquote: ComponentOverrideProbe,
					ul: ComponentOverrideProbe,
					ol: ComponentOverrideProbe,
					li: ComponentOverrideProbe,
					thead: ComponentOverrideProbe,
					tbody: ComponentOverrideProbe,
					tr: ComponentOverrideProbe,
					th: ComponentOverrideProbe,
					td: ComponentOverrideProbe,
					strong: ComponentOverrideProbe,
					em: ComponentOverrideProbe,
					del: ComponentOverrideProbe,
					sub: ComponentOverrideProbe,
					sup: ComponentOverrideProbe
				}
			});

			expect(screen.container.querySelector('blockquote[data-override="blockquote"]')).toBeTruthy();
			expect(screen.container.querySelector('ul[data-override="ul"]')).toBeTruthy();
			expect(screen.container.querySelector('ol[data-override="ol"]')).toBeTruthy();
			expect(screen.container.querySelectorAll('li[data-override="li"]')).toHaveLength(2);
			expect(screen.container.querySelector('thead[data-override="thead"]')).toBeTruthy();
			expect(screen.container.querySelector('tbody[data-override="tbody"]')).toBeTruthy();
			expect(screen.container.querySelectorAll('tr[data-override="tr"]').length).toBeGreaterThan(0);
			expect(screen.container.querySelector('th[data-override="th"]')?.textContent).toContain(
				'Name'
			);
			expect(screen.container.querySelector('td[data-override="td"]')?.textContent).toContain(
				'Foo'
			);
			expect(screen.container.querySelector('strong[data-override="strong"]')?.textContent).toBe(
				'bold'
			);
			expect(screen.container.querySelector('em[data-override="em"]')?.textContent).toBe('italic');
			expect(screen.container.querySelector('del[data-override="del"]')?.textContent).toBe('gone');
			expect(screen.container.querySelector('sub[data-override="sub"]')?.textContent).toBe('2');
			expect(screen.container.querySelector('sup[data-override="sup"]')?.textContent).toBe('2');
		}
	);

	testInBrowser(
		'wraps each parsed block with BlockComponent while preserving the default block content',
		() => {
			const screen = render(StreamdownWithFutureProps, {
				content: ['مرحبا بالعالم', '', 'Paragraph text'].join('\n'),
				dir: 'auto',
				BlockComponent: BlockComponentProbe
			});

			const blocks = [...screen.container.querySelectorAll('[data-block-probe]')];
			expect(blocks).toHaveLength(2);
			expect(blocks[0]?.getAttribute('data-dir')).toBe('rtl');
			expect(blocks[1]?.getAttribute('data-dir')).toBe('ltr');
			expect(blocks[0]?.textContent).toContain('مرحبا بالعالم');
			expect(blocks[1]?.textContent).toContain('Paragraph text');
		}
	);
});
