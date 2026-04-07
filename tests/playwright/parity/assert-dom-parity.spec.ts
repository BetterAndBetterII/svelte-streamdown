import { expect, test } from '@playwright/test';
import { assertDomParity } from './assert-dom-parity.js';
import { formatNormalizedDom, normalizeDom } from './normalize-dom.js';

test.describe('DOM parity helpers', () => {
	test('normalizes wrapper noise, class ordering, random ids, and hash links', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<div id="generated-ref">
					<ol class="contains-task-list task-list-item">
						<li><input checked disabled type="checkbox"> done</li>
					</ol>
					<a href="#footnote-1">note</a>
					<div>
						<table>
							<tbody>
								<tr><td>Cell</td></tr>
							</tbody>
						</table>
					</div>
					<img alt="cat" id="image-ref" src="/cat.png">
				</div>
			</section>
			<section id="local">
				<span>
					<!-- framework wrapper -->
					<div id="generated-local">
						<ol class="task-list-item contains-task-list">
							<li><input disabled checked type="checkbox"> done</li>
						</ol>
					</div>
					<a href="#fn-9">note</a>
					<span>
						<table>
							<tbody>
								<tr><td>Cell</td></tr>
							</tbody>
						</table>
					</span>
					<img alt="cat" id="image-local" src="/cat.png">
				</span>
			</section>
		`);

		await assertDomParity(page.locator('#reference'), page.locator('#local'), {
			fixtureId: 'synthetic-noise'
		});
	});

	test('formats normalized trees for readable diffs', async ({ page }) => {
		await page.setContent(`
			<section id="target">
				<div id="generated-wrapper">
					<a href="#citation-42">citation</a>
					<table>
						<tbody>
							<tr><td><button type="button">copy</button></td></tr>
						</tbody>
					</table>
				</div>
			</section>
		`);

		const formattedDom = formatNormalizedDom(await normalizeDom(page.locator('#target')));

		expect(formattedDom).toBe(
			[
				'<a href="#ref">',
				'  "citation"',
				'</a>',
				'<table>',
				'  <tbody>',
				'    <tr>',
				'      <td>',
				'        <button type="button">',
				'          "copy"',
				'        </button>',
				'      </td>',
				'    </tr>',
				'  </tbody>',
				'</table>'
			].join('\n')
		);
	});

	test('surfaces semantic differences instead of wrapper noise', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<p><a href="https://example.com/" target="_blank">link</a></p>
			</section>
			<section id="local">
				<div><p><button type="button">link</button></p></div>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'semantic-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');

		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture semantic-diff');
		expect(normalizedErrorMessage).toContain('button type=');
		expect(normalizedErrorMessage).toContain('a href=');
	});

	test('does not treat math fallback markup as equivalent to rendered KaTeX output', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<span data-streamdown-inline-math="ref"><span class="katex"><span class="katex-mathml"><math><mi>x</mi></math></span><span class="katex-html" aria-hidden="true">x</span></span></span>
			</section>
			<section id="local">
				<span data-streamdown-inline-math="local"><code>x^2</code></span>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'math-fallback-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture math-fallback-diff');
		expect(normalizedErrorMessage).toContain('"$math$"');
		expect(normalizedErrorMessage).toContain('<code>');
	});

	test('preserves raw paragraph-wrapped math-like text instead of flattening it into canonical math', async ({
		page
	}) => {
		await page.setContent(`
			<section id="target">
				<p>$$not actually rendered math$$</p>
			</section>
		`);

		const formattedDom = formatNormalizedDom(await normalizeDom(page.locator('#target')));

		expect(formattedDom).toBe(['<p>', '  "$$not actually rendered math$$"', '</p>'].join('\n'));
	});

	test('surfaces KaTeX parse errors instead of canonicalizing them into successful math', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<div data-streamdown-block-math="ref"><span class="katex-display"><span class="katex"><span class="katex-mathml"><math><mi>x</mi></math></span><span class="katex-html" aria-hidden="true">x</span></span></span></div>
			</section>
			<section id="local">
				<span title="ParseError: KaTeX parse error: Expected 'EOF'">broken math</span>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'math-parse-error-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture math-parse-error-diff');
		expect(normalizedErrorMessage).toContain('ParseError: KaTeX parse error');
		expect(normalizedErrorMessage).toContain('"$$math$$"');
	});

	test('does not treat bare MathML as equivalent to rendered block KaTeX output', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<div data-streamdown-block-math="ref"><span class="katex-display"><span class="katex"><span class="katex-mathml"><math><mi>x</mi></math></span><span class="katex-html" aria-hidden="true">x</span></span></span></div>
			</section>
			<section id="local">
				<math><mi>x</mi></math>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'bare-mathml-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture bare-mathml-diff');
		expect(normalizedErrorMessage).toContain('"$$math$$"');
		expect(normalizedErrorMessage).toContain('<math>');
	});

	test('preserves non-KaTeX aria-hidden content so hidden wrapper drift stays visible', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<p><span>visible</span></p>
			</section>
			<section id="local">
				<p><span aria-hidden="true">hidden bug</span><span>visible</span></p>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'aria-hidden-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture aria-hidden-diff');
		expect(normalizedErrorMessage).toContain('aria-hidden');
		expect(normalizedErrorMessage).toContain('hidden bug');
	});

	test('preserves footnote list content so ordering and text drift stay visible', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<section data-footnotes>
					<h2>Footnotes</h2>
					<ol><li id="fn-1">First footnote</li><li id="fn-2">Second footnote</li></ol>
				</section>
			</section>
			<section id="local">
				<section data-footnotes>
					<h2>Footnotes</h2>
					<ol><li id="fn-1">Second footnote</li><li id="fn-2">First footnote</li></ol>
				</section>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'footnote-content-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture footnote-content-diff');
		expect(normalizedErrorMessage).toContain('First footnote');
		expect(normalizedErrorMessage).toContain('Second footnote');
	});

	test('does not collapse parsed footnote references into raw markdown text', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<p>Before<sup><button type="button">1</button></sup>after</p>
			</section>
			<section id="local">
				<p>Before[^1]after</p>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'footnote-reference-raw-text-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain(
			'DOM parity mismatch for fixture footnote-reference-raw-text-diff'
		);
		expect(normalizedErrorMessage).toContain('<sup>');
		expect(normalizedErrorMessage).toContain('"Before[^1]after"');
	});

	test('does not treat standalone MathML as equivalent to rendered block math', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<div data-streamdown-block-math="ref"><span class="katex-display"><span class="katex"><span class="katex-mathml"><math><mi>x</mi></math></span></span></span></div>
			</section>
			<section id="local">
				<p><math><mi>x</mi></math></p>
			</section>
		`);

		let errorMessage = '';

		try {
			await assertDomParity(page.locator('#reference'), page.locator('#local'), {
				fixtureId: 'standalone-mathml-diff'
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		const normalizedErrorMessage = errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
		expect(normalizedErrorMessage).toContain('DOM parity mismatch for fixture standalone-mathml-diff');
		expect(normalizedErrorMessage).toContain('"$$math$$"');
		expect(normalizedErrorMessage).toContain('<math>');
	});
});
