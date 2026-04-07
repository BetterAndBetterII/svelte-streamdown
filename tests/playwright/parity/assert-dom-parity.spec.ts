import { expect, test, type Page } from '@playwright/test';
import { assertDomParity } from './assert-dom-parity.js';
import { formatNormalizedDom, normalizeDom } from './normalize-dom.js';

test.describe('DOM parity helpers', () => {
	test('normalizes wrapper noise and class ordering without hiding semantic attrs', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<div>
					<ol class="contains-task-list task-list-item">
						<li><input checked disabled type="checkbox"> done</li>
					</ol>
					<a href="#note-1">note</a>
					<div>
						<table>
							<tbody>
								<tr><td>Cell</td></tr>
							</tbody>
						</table>
					</div>
					<img alt="cat" id="image-1" src="/cat.png">
				</div>
			</section>
			<section id="local">
				<span>
					<!-- framework wrapper -->
					<div>
						<ol class="task-list-item contains-task-list">
							<li><input disabled checked type="checkbox"> done</li>
						</ol>
					</div>
					<a href="#note-1">note</a>
					<span>
						<table>
							<tbody>
								<tr><td>Cell</td></tr>
							</tbody>
						</table>
					</span>
					<img alt="cat" id="image-1" src="/cat.png">
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
				<div>
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
				'<a href="#citation-42">',
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

	test('surfaces hash-target drift instead of normalizing fragment links to a placeholder', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<a href="#fnref-1">note</a>
				<p id="fnref-1">target</p>
			</section>
			<section id="local">
				<a href="#fnref-2">note</a>
				<p id="fnref-2">target</p>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'fragment-id-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture fragment-id-diff');
		expect(mismatch).toContain('href="#fnref-1"');
		expect(mismatch).toContain('href="#fnref-2"');
		expect(mismatch).toContain('id="fnref-1"');
		expect(mismatch).toContain('id="fnref-2"');
	});

	test('preserves footnote anchors instead of collapsing them into buttons', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<sup><a data-footnote-ref href="#fn-1">1</a></sup>
				<ol><li id="fn-1">Footnote</li></ol>
			</section>
			<section id="local">
				<sup><button type="button">1</button></sup>
				<ol><li id="fn-1">Footnote</li></ol>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'footnote-anchor-semantics');
		expect(mismatch).toContain('DOM parity mismatch for fixture footnote-anchor-semantics');
		expect(mismatch).toContain('<a href="#fn-1">');
		expect(mismatch).toContain('<button type="button">');
	});

	test('preserves strong semantics instead of flattening them into spans', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<p><strong>bold</strong></p>
			</section>
			<section id="local">
				<p><span>bold</span></p>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'strong-semantics-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture strong-semantics-diff');
		expect(mismatch).toContain('<strong>');
		expect(mismatch).toContain('<span>');
	});

	test('preserves svg child structure so diagram drift stays visible', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<svg aria-label="Mermaid chart"><g><text>Start</text></g></svg>
			</section>
			<section id="local">
				<svg aria-label="Mermaid chart"></svg>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'svg-structure-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture svg-structure-diff');
		expect(mismatch).toContain('<svg aria-label="Mermaid chart">');
		expect(mismatch).toContain('<text>');
	});

	test('does not rewrite list structure by moving trailing controls into paragraphs', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<ul><li><p>Item</p><a href="#fnref-1">back</a></li></ul>
			</section>
			<section id="local">
				<ul><li><p>Item<a href="#fnref-1">back</a></p></li></ul>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'list-structure-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture list-structure-diff');
		expect(mismatch).toContain('</p>');
		expect(mismatch).toContain('<a href="#fnref-1">');
	});

	test('does not flatten code blocks to plain text when token structure differs', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<pre><code><span class="token keyword">const</span><span> answer = 42;</span></code></pre>
			</section>
			<section id="local">
				<pre><code>const answer = 42;</code></pre>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'code-structure-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture code-structure-diff');
		expect(mismatch).toContain('<span>');
		expect(mismatch).toContain('"const answer = 42;"');
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

		const mismatch = await captureParityMismatch(page, 'semantic-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture semantic-diff');
		expect(mismatch).toContain('button type=');
		expect(mismatch).toContain('a href=');
	});

	test('preserves mailto segmentation differences instead of rewriting prefixes between nodes', async ({
		page
	}) => {
		await page.setContent(`
			<section id="reference">
				<p>Contact <a href="mailto:test@example.com">mailto:test@example.com</a></p>
			</section>
			<section id="local">
				<p>Contact mailto:<a href="mailto:test@example.com">test@example.com</a></p>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'mailto-prefix-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture mailto-prefix-diff');
		expect(mismatch).toContain('mailto:test@example.com');
		expect(mismatch).toContain('"Contact mailto:"');
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

		const mismatch = await captureParityMismatch(page, 'math-fallback-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture math-fallback-diff');
		expect(mismatch).toContain('"$math$"');
		expect(mismatch).toContain('<code>');
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

		const mismatch = await captureParityMismatch(page, 'math-parse-error-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture math-parse-error-diff');
		expect(mismatch).toContain('ParseError: KaTeX parse error');
		expect(mismatch).toContain('"$$math$$"');
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

		const mismatch = await captureParityMismatch(page, 'bare-mathml-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture bare-mathml-diff');
		expect(mismatch).toContain('"$$math$$"');
		expect(mismatch).toContain('<math>');
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

		const mismatch = await captureParityMismatch(page, 'aria-hidden-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture aria-hidden-diff');
		expect(mismatch).toContain('aria-hidden');
		expect(mismatch).toContain('hidden bug');
	});

	test('preserves footnote list content so ordering and text drift stay visible', async ({
		page
	}) => {
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

		const mismatch = await captureParityMismatch(page, 'footnote-content-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture footnote-content-diff');
		expect(mismatch).toContain('First footnote');
		expect(mismatch).toContain('Second footnote');
	});

	test('does not collapse parsed footnote references into raw markdown text', async ({ page }) => {
		await page.setContent(`
			<section id="reference">
				<p>Before<sup><a data-footnote-ref href="#fn-1">1</a></sup>after</p>
				<ol><li id="fn-1">Footnote</li></ol>
			</section>
			<section id="local">
				<p>Before[^1]after</p>
				<ol><li id="fn-1">Footnote</li></ol>
			</section>
		`);

		const mismatch = await captureParityMismatch(page, 'footnote-reference-raw-text-diff');
		expect(mismatch).toContain('DOM parity mismatch for fixture footnote-reference-raw-text-diff');
		expect(mismatch).toContain('<sup>');
		expect(mismatch).toContain('href="#fn-1"');
		expect(mismatch).toContain('"Before[^1]after"');
	});
});

async function captureParityMismatch(page: Page, fixtureId: string) {
	let errorMessage = '';

	try {
		await assertDomParity(page.locator('#reference'), page.locator('#local'), {
			fixtureId
		});
	} catch (error) {
		errorMessage = error instanceof Error ? error.message : String(error);
	}

	return errorMessage.replace(/\x1B\[[0-9;]*m/g, '');
}
