import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import { expect } from 'vitest';

describeInBrowser('ported streamdown security HTML handling', () => {
	testInBrowser('reference default renders multiline content inside details blocks', () => {
		const screen = render(Streamdown, {
			content: `<details>
<summary>Summary</summary>

Paragraph inside details.
</details>`,
			static: true
		});

		const details = screen.container.querySelector('details');
		const paragraph = [...screen.container.querySelectorAll('p')].find((element) =>
			element.textContent?.includes('Paragraph inside details.')
		);

		expect(details).toBeTruthy();
		expect(paragraph).toBeTruthy();
		expect(details?.contains(paragraph as Node)).toBe(true);
	});

	testInBrowser('reference default renders safe self-closing img HTML blocks', () => {
		const screen = render(Streamdown, {
			content: `<p>Before image</p>
<img src="https://example.com/image.jpg" alt="Test Image" width="100" height="100">
<p>After image</p>`,
			static: true
		});

		const image = screen.container.querySelector('img');
		const paragraphs = screen.container.querySelectorAll('p');

		expect(image).toBeTruthy();
		expect(image?.getAttribute('src')).toBe('https://example.com/image.jpg');
		expect(image?.getAttribute('alt')).toBe('Test Image');
		expect(image?.getAttribute('width')).toBe('100');
		expect(image?.getAttribute('height')).toBe('100');
		expect(paragraphs).toHaveLength(2);
	});

	testInBrowser('reference normalizeHtmlIndentation renders indented HTML blocks as HTML', () => {
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

		const headings = [...screen.container.querySelectorAll('h4')].map(
			(element) => element.textContent
		);

		expect(headings).toContain('Title One');
		expect(headings).toContain('Title Two');
		expect(screen.container.querySelectorAll('code')).toHaveLength(0);
	});
});
