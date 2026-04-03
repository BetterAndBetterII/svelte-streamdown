import { describe, expect, test } from 'vitest';

import { validateRegressionCoverage } from '../../scripts/validate-pr-metadata.mjs';

describe('validateRegressionCoverage', () => {
	test('skips non-bug-fix pull requests', () => {
		const result = validateRegressionCoverage({
			body: `## Type of Change

- [ ] Bug fix
- [x] Documentation update

## Regression Coverage

- Coverage path:
- Coverage type:
`,
			changedFiles: []
		});

		expect(result.shouldValidate).toBe(false);
		expect(result.problems).toEqual([]);
	});

	test('accepts a bug-fix PR when the referenced regression test is in the diff', () => {
		const result = validateRegressionCoverage({
			body: `## Type of Change

- [x] Bug fix

## Regression Coverage

- Coverage path: tests/contracts/validate-pr-metadata.spec.ts
- Coverage type: contract test
`,
			changedFiles: [
				{ filename: 'tests/contracts/validate-pr-metadata.spec.ts', status: 'modified' }
			]
		});

		expect(result.shouldValidate).toBe(true);
		expect(result.problems).toEqual([]);
	});

	test('rejects bug-fix PRs that point to a regression asset outside the diff', () => {
		const result = validateRegressionCoverage({
			body: `## Type of Change

- [x] Bug fix

## Regression Coverage

- Coverage path: tests/contracts/parser-parity.spec.ts
- Coverage type: contract test
`,
			changedFiles: [{ filename: 'CONTRIBUTING.md', status: 'modified' }]
		});

		expect(result.problems).toContain(
			'`Coverage path` must match a regression fixture or test file that is added or updated in this PR.'
		);
	});

	test('rejects bug-fix PRs that point to a removed regression asset', () => {
		const result = validateRegressionCoverage({
			body: `## Type of Change

- [x] Bug fix

## Regression Coverage

- Coverage path: tests/contracts/parser-parity.spec.ts
- Coverage type: contract test
`,
			changedFiles: [{ filename: 'tests/contracts/parser-parity.spec.ts', status: 'removed' }]
		});

		expect(result.problems).toContain(
			'`Coverage path` must match a regression fixture or test file that is added or updated in this PR.'
		);
	});

	test('rejects new parity fixtures that are not registered', () => {
		const result = validateRegressionCoverage({
			body: `## Type of Change

- [x] Bug fix

## Regression Coverage

- Coverage path: fixtures/parity/markdown/15-new-regression.md
- Coverage type: shared parity fixture
`,
			changedFiles: [
				{ filename: 'fixtures/parity/markdown/15-new-regression.md', status: 'added' },
				{ filename: 'tests/contracts/parser-parity.spec.ts', status: 'modified' }
			]
		});

		expect(result.problems).toContain(
			'New shared parity fixtures must also update `fixtures/parity/fixture-registry.ts` so the fixture becomes a durable shared asset.'
		);
	});
});
