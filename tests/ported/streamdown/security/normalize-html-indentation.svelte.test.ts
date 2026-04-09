import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { normalizeHtmlIndentation } from '../../../../src/lib/security/html.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown security normalize HTML indentation', () => {
	testInBrowser('normalizes indented HTML tags inside HTML blocks', () => {
		expect(normalizeHtmlIndentation('<div>\n    <span>Hello</span>\n</div>')).toBe(
			'<div>\n<span>Hello</span>\n</div>'
		);
	});

	testInBrowser('leaves non-HTML markdown unchanged', () => {
		const markdown = '# Hello World\n\nThis is a paragraph.';
		expect(normalizeHtmlIndentation(markdown)).toBe(markdown);
	});

	testInBrowser(
		'normalizes balanced HTML blocks without rewriting unrelated indented lines',
		() => {
			expect(
				normalizeHtmlIndentation(
					['<div>', '    <span>Hello</span>', '</div>', '', '    <span>Literal code</span>'].join(
						'\n'
					)
				)
			).toBe(
				['<div>', '<span>Hello</span>', '</div>', '', '    <span>Literal code</span>'].join('\n')
			);
		}
	);

	testInBrowser(
		'normalizes later HTML blocks in mixed Markdown without touching indented HTML-like text',
		() => {
			expect(
				normalizeHtmlIndentation(
					[
						'Intro paragraph.',
						'',
						'    <span>Literal before block</span>',
						'',
						'<section>',
						'    <div>Nested HTML</div>',
						'</section>'
					].join('\n')
				)
			).toBe(
				[
					'Intro paragraph.',
					'',
					'    <span>Literal before block</span>',
					'',
					'<section>',
					'<div>Nested HTML</div>',
					'</section>'
				].join('\n')
			);
		}
	);

	testInBrowser(
		'does not normalize indented HTML-like literal content inside mixed details blocks',
		() => {
			expect(
				normalizeHtmlIndentation(
					[
						'<details>',
						'<summary>Summary</summary>',
						'',
						'    <span>Literal code</span>',
						'</details>'
					].join('\n')
				)
			).toBe(
				[
					'<details>',
					'<summary>Summary</summary>',
					'',
					'    <span>Literal code</span>',
					'</details>'
				].join('\n')
			);
		}
	);

	testInBrowser(
		'renders indented HTML blocks as HTML when the compatibility prop is enabled',
		() => {
			const screen = render(Streamdown, {
				content: `<div class="wrapper">
    <div class="inner">
      <h4>Title One</h4>
    </div>

    <div class="another">
      <h4>Title Two</h4>
    </div>
</div>`,
				static: true,
				normalizeHtmlIndentation: true
			});

			const headings = [...screen.container.querySelectorAll('h4')].map((element) =>
				element.textContent?.trim()
			);

			expect(headings).toContain('Title One');
			expect(headings).toContain('Title Two');
			expect(screen.container.querySelectorAll('code')).toHaveLength(0);
		}
	);

	testInBrowser(
		'renders mixed Markdown and HTML without promoting later indented literals into HTML',
		() => {
			const screen = render(Streamdown, {
				content: [
					'Before paragraph.',
					'',
					'<div class="wrapper">',
					'    <span class="inner">HTML content</span>',
					'</div>',
					'',
					'    <span class="literal">Literal code</span>',
					'',
					'After paragraph.'
				].join('\n'),
				static: true,
				normalizeHtmlIndentation: true
			});

			const literalCode = screen.container.querySelector('pre code')?.textContent ?? '';

			expect(screen.container.textContent).toContain('HTML content');
			expect(literalCode).toContain('<span class="literal">Literal code</span>');
			expect(literalCode).not.toContain('HTML content');
			expect(screen.container.textContent).toContain('Before paragraph.');
			expect(screen.container.textContent).toContain('After paragraph.');
		}
	);

	testInBrowser('keeps indented HTML-like literals as code inside details blocks', () => {
		const screen = render(Streamdown, {
			content: [
				'<details>',
				'<summary>Summary</summary>',
				'',
				'    <span>Literal code</span>',
				'</details>'
			].join('\n'),
			static: true,
			normalizeHtmlIndentation: true
		});

		const literalCode = screen.container.querySelector('pre code')?.textContent ?? '';
		const details = screen.container.querySelector('details');

		expect(details).toBeTruthy();
		expect(details?.querySelector('span')).toBeNull();
		expect(literalCode).toContain('<span>Literal code</span>');
	});

	testInBrowser('preserves complex nested HTML after normalization', () => {
		const screen = render(Streamdown, {
			content: `<article>
    <header>
        <h1>Article Title</h1>
    </header>
    <section>
        <h2>Section 1</h2>
        <p>Content here</p>
    </section>
    <footer>
        <p>Footer text</p>
    </footer>
</article>`,
			static: true,
			normalizeHtmlIndentation: true,
			allowedTags: {
				article: [],
				header: [],
				footer: []
			}
		});

		expect(screen.container.querySelector('h1')?.textContent).toBe('Article Title');
		expect(screen.container.querySelector('h2')?.textContent).toBe('Section 1');
		expect(screen.container.querySelector('footer')).toBeTruthy();
	});
});
