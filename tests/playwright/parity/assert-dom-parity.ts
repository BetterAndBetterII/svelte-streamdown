import { expect, type Locator } from '@playwright/test';
import { formatNormalizedDom, normalizeDom } from './normalize-dom.js';

type DomParityOptions = {
	fixtureId: string;
};

export async function assertDomParity(
	referenceLocator: Locator,
	localLocator: Locator,
	options: DomParityOptions
): Promise<void> {
	const [referenceDom, localDom] = await Promise.all([
		normalizeDom(referenceLocator),
		normalizeDom(localLocator)
	]);

	const expectedDom = formatNormalizedDom(referenceDom);
	const actualDom = formatNormalizedDom(localDom);

	expect(
		actualDom,
		`DOM parity mismatch for fixture ${options.fixtureId}. Expected normalized local DOM to match the reference snapshot.`
	).toBe(expectedDom);
}
