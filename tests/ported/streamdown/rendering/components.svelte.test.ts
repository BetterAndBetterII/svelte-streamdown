import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Code from '../../../../src/lib/Elements/Code.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import ComponentOverrideProbe from './fixtures/ComponentOverrideProbe.svelte';
import SnippetPriorityHarness from './fixtures/SnippetPriorityHarness.svelte';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown component overrides', () => {
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
});
