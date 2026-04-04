# Nightly Full Parity Summary

- Overall status: success
- Generated at: 2026-04-04T09:01:43.997Z

| Suite             | Status  | Duration | Failure stage |
| ----------------- | ------- | -------- | ------------- |
| ported-tests      | success | 17.0s    | n/a           |
| playwright-parity | success | 9.0s     | n/a           |
| pack-smoke        | success | 16.0s    | n/a           |
| dependency-audit  | success | 1.0s     | n/a           |

## Suite Artifacts

### ported-tests

- Status: success
- Command: `pnpm exec vitest run tests/ported --reporter=default --reporter=junit --outputFile=artifacts/nightly/ported-tests/junit.xml`
- summary: `artifacts/nightly/ported-tests/summary.md`
- status: `artifacts/nightly/ported-tests/status.json`
- log: `artifacts/nightly/ported-tests/output.log`
- junit: `artifacts/nightly/ported-tests/junit.xml`

### playwright-parity

- Status: success
- Command: `pnpm exec playwright test tests/playwright/parity --reporter=line,html --output=artifacts/nightly/playwright-parity/test-results`
- summary: `artifacts/nightly/playwright-parity/summary.md`
- status: `artifacts/nightly/playwright-parity/status.json`
- log: `artifacts/nightly/playwright-parity/output.log`
- html-report: `artifacts/nightly/playwright-parity/html-report`
- test-results: `artifacts/nightly/playwright-parity/test-results`

### pack-smoke

- Status: success
- Command: `pnpm verify:pack && pnpm verify:exports`
- summary: `artifacts/nightly/pack-smoke/summary.md`
- status: `artifacts/nightly/pack-smoke/status.json`
- verify-pack-json: `artifacts/nightly/pack-smoke/verify-pack.json`
- verify-pack-stderr: `artifacts/nightly/pack-smoke/verify-pack.stderr.log`
- verify-exports-json: `artifacts/nightly/pack-smoke/verify-exports.json`
- verify-exports-stderr: `artifacts/nightly/pack-smoke/verify-exports.stderr.log`

### dependency-audit

- Status: success
- Command: `pnpm verify:dependency-policy`
- summary: `artifacts/nightly/dependency-audit/summary.md`
- status: `artifacts/nightly/dependency-audit/status.json`
- report: `artifacts/nightly/dependency-audit/dependency-policy.json`
- stderr: `artifacts/nightly/dependency-audit/dependency-policy.stderr.log`
