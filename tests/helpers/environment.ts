import { describe, it } from 'vitest';

export type TestEnvironment = 'browser' | 'node';

export const TEST_ENVIRONMENT: TestEnvironment = typeof window === 'undefined' ? 'node' : 'browser';

export const isBrowserTest = TEST_ENVIRONMENT === 'browser';
export const isNodeTest = TEST_ENVIRONMENT === 'node';

export const describeInBrowser = isBrowserTest ? describe : describe.skip;
export const describeInNode = isNodeTest ? describe : describe.skip;
export const testInBrowser = isBrowserTest ? it : it.skip;
export const testInNode = isNodeTest ? it : it.skip;

export function assertTestEnvironment(expected: TestEnvironment): void {
	if (TEST_ENVIRONMENT !== expected) {
		throw new Error(`Expected ${expected} test environment, received ${TEST_ENVIRONMENT}.`);
	}
}
