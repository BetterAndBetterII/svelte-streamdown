import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parityFixtureIds } from '../../../fixtures/parity/fixture-registry.js';

const referenceBaseUrl = process.env.PARITY_REFERENCE_URL ?? 'http://127.0.0.1:4173';
const localBaseUrl = process.env.PARITY_LOCAL_URL ?? 'http://127.0.0.1:4174';

const fixtureDirectory = fileURLToPath(
	new URL('../../../fixtures/parity/markdown/', import.meta.url)
);

const readFixtureMarkdown = (fixtureId: string) =>
	readFileSync(resolve(fixtureDirectory, fixtureId), 'utf8');

for (const fixtureId of parityFixtureIds) {
	test(`loads shared fixture ${fixtureId} in both parity apps`, async ({ browser }) => {
		const expectedMarkdown = readFixtureMarkdown(fixtureId);
		const context = await browser.newContext();
		const referencePage = await context.newPage();
		const localPage = await context.newPage();
		const fixtureRoute = `/?fixture=${encodeURIComponent(fixtureId)}`;

		await Promise.all([
			referencePage.goto(`${referenceBaseUrl}${fixtureRoute}`),
			localPage.goto(`${localBaseUrl}${fixtureRoute}`)
		]);

		for (const [page, appName] of [
			[referencePage, 'reference'],
			[localPage, 'local']
		] as const) {
			await expect(page.locator('[data-parity-app]')).toHaveAttribute('data-parity-app', appName);
			await expect(page.locator('[data-parity-fixture-id]')).toHaveText(fixtureId);
			await expect(page.locator('[data-parity-source]')).toHaveValue(expectedMarkdown);
			await expect(page.locator('[data-parity-rendered]')).toBeVisible();

			const renderedNodeCount = await page.locator('[data-parity-rendered] *').count();
			expect(renderedNodeCount).toBeGreaterThan(0);
		}

		await context.close();
	});
}
