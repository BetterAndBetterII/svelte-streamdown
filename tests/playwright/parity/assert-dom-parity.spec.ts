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
});
