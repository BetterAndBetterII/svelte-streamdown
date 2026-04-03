# Release Readiness Report

This document records the `P5-05` final release readiness audit for `svelte-streamdown`.

Audit date: `2026-04-03`

Audit target:

- Repository: `BetterAndBetterII/svelte-streamdown`
- Release candidate branch/head reviewed: `master@368f4c3d7ccbd7223739bfa906b32d679cb2e741`
- Frozen parity target: `vercel/streamdown@5f6475139a87dee8af08fcf7b01475292bc064d2`
- Tracking issue: `#43`

## Evidence Reviewed

- Roadmap and issue mapping: `PLAN.md`
- Frozen reference and compatibility contract:
  - `docs/reference-version.md`
  - `docs/parity-contract.md`
  - `docs/parity-matrix.md`
- Release and hardening policy:
  - `docs/release-policy.md`
  - `docs/local-toolchain.md`
  - `docs/dependency-policy.md`
  - `docs/release-artifact-verification.md`
- Release-hardening implementation:
  - `.github/workflows/ci.yml`
  - `.github/workflows/release.yml`
  - `scripts/verify-toolchain.mjs`
  - `scripts/verify-clean-build.mjs`
  - `scripts/verify-pack.mjs`
  - `scripts/verify-exports.mjs`
  - `scripts/verify-dependency-policy.mjs`
  - `scripts/release-metadata.mjs`
  - `scripts/verify-release-metadata.mjs`
  - `tests/pack-smoke/`
- Migration and parity coverage:
  - `docs/test-migration-status.md`
  - GitHub Actions run `23957471224` (`CI`, push to `master`, completed successfully on `2026-04-03`)
- Workflow execution history gathered during the audit:
  - `gh run list --workflow "CI"`
  - `gh run list --workflow "Nightly Full Parity"`
  - `gh run list --workflow "Release"`

## P0 And P1 Audit

`PLAN.md` still marks `P0-04` and `P1-01` through `P1-06` as `todo`, but repository evidence shows that the corresponding documents, scripts, and workflow jobs now exist. The plan status fields are stale and should not be used as the release decision source by themselves.

| Issue                                            | Audit result                                                                    | Evidence                                                                                                                                        | Notes                                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `P0-01` Freeze reference version                 | complete                                                                        | `docs/reference-version.md`                                                                                                                     | Frozen upstream repo, commit, package versions, and parity scope are documented.                                                                                                                   |
| `P0-02` Parity matrix                            | complete, but still open as a release signal                                    | `docs/parity-matrix.md`                                                                                                                         | The matrix exists and is usable, but it still records `38` `partial` rows and `19` `missing` rows.                                                                                                 |
| `P0-03` Compatibility contract                   | complete                                                                        | `docs/parity-contract.md`                                                                                                                       | Reviewer rules for acceptable differences are documented.                                                                                                                                          |
| `P0-04` Release policy                           | complete                                                                        | `docs/release-policy.md`, PR `#47`                                                                                                              | Policy exists, but the policy's own required-job list is still stricter than the actual `CI` workflow.                                                                                             |
| `P1-01` Toolchain pinning                        | complete                                                                        | `.nvmrc`, `package.json`, `docs/local-toolchain.md`, `scripts/verify-toolchain.mjs`, `ci.yml`                                                   | Local and CI versions are pinned to Node `22.22.1` and pnpm `10.32.1`.                                                                                                                             |
| `P1-02` Clean build verification                 | implemented, not fully reproducible in this harness                             | `scripts/verify-clean-build.mjs`, `ci.yml`, GitHub Actions run `23957471224`                                                                    | CI job `verify-clean-build` passed on `2026-04-03`, but the local verifier fails in this OpenASE harness before running because injected `.openase/*` files make the worktree dirty.               |
| `P1-03` Package contents verification            | complete                                                                        | `scripts/verify-pack.mjs`, `ci.yml`                                                                                                             | Local audit run and CI both passed.                                                                                                                                                                |
| `P1-04` Export surface verification              | complete for the current package, not for full upstream package-boundary parity | `scripts/verify-exports.mjs`, `tests/pack-smoke/`, `ci.yml`, `docs/parity-matrix.md`                                                            | The current `svelte-streamdown` tarball exports are internally consistent, but the parity matrix still marks upstream-style package-boundary items such as `./styles.css` and `remend` as missing. |
| `P1-05` Dependency and license audit gate        | implemented with release-blocking approved exceptions still present             | `scripts/verify-dependency-policy.mjs`, `config/dependency-policy.json`, `docs/dependency-policy.md`, `ci.yml`                                  | The gate passes because all high-severity advisories and license anomalies are explicitly approved, but those approvals are all marked for review before the first trusted release.                |
| `P1-06` Release provenance and artifact metadata | implemented, but not yet proven by an actual release workflow run               | `scripts/release-metadata.mjs`, `scripts/verify-release-metadata.mjs`, `docs/release-artifact-verification.md`, `.github/workflows/release.yml` | Metadata generation works locally and a release workflow exists, but no `Release` workflow run exists yet to verify end-to-end provenance in practice.                                             |

## Unresolved Parity Risk

The package is not yet parity-backed by the current evidence set.

Documented unresolved gaps:

- `docs/parity-matrix.md` still records `38` `partial` rows and `19` `missing` rows across the frozen public API, rendering, security, and plugin/package-boundary surface.
- The matrix's `High-Risk Gaps` section still calls out missing or incomplete alignment for the reference security model, standalone package boundaries, parser surface coverage, and HTML/footnote/component behavior.
- `docs/test-migration-status.md` still reports:
  - `13` remaining `P0` files not yet passing via a ported upstream file or local analogue
  - `37` files still blocked by missing surface
  - `6` files with missing local coverage

This means the repo still lacks enough passing parity evidence to justify a parity-backed release claim even though several hardening gates now exist.

## Release Pipeline And Test Evidence

### GitHub workflow evidence

Latest observed `CI` push run:

- Run id: `23957471224`
- Head: `368f4c3d7ccbd7223739bfa906b32d679cb2e741`
- Date: `2026-04-03`
- Result: success

Jobs confirmed green in that run:

- `verify-test-migration-status`
- `verify-toolchain`
- `verify-clean-build`
- `verify-pack`
- `verify-exports`
- `verify-dependency-policy`
- `verify-api-surface`
- `verify-release-metadata`
- `report-coverage`

Missing workflow-run evidence:

- No `Nightly Full Parity` runs were returned by `gh run list --workflow "Nightly Full Parity"` during this audit.
- No `Release` runs were returned by `gh run list --workflow "Release"` during this audit.

### Gap between policy and enforced CI

`docs/release-policy.md` says every trusted release must be blocked on:

- `lint-and-format`
- `typecheck`
- `unit-tests`
- `build-package`
- the `verify-*` release-hardening jobs
- `publish-with-provenance`
- `post-publish-verify`

Current `CI` covers the `verify-*` jobs, but it does not run dedicated `lint-and-format`, `typecheck`, `unit-tests`, or `build-package` jobs on push/PR, and there is no completed `Release` workflow run proving `publish-with-provenance` or `post-publish-verify`.

That is a direct mismatch between the documented trusted-release policy and the workflow evidence available today.

### Local audit commands

Commands run during this audit from the ticket branch based on `master@368f4c3`:

| Command                             | Result                        | Notes                                                                                                                                                          |
| ----------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | pass                          | Installed the pinned dependency graph.                                                                                                                         |
| `pnpm lint`                         | fail                          | Prettier reported formatting drift in `33` tracked files.                                                                                                      |
| `pnpm check`                        | pass                          | `svelte-check` reported `0` errors and `0` warnings.                                                                                                           |
| `pnpm test`                         | fail                          | `22` test files failed and `70` tests failed. Failures include parser regressions plus contract suites that expect a checked-out `references/streamdown` tree. |
| `pnpm build`                        | pass with warnings            | Build completed; Vite reported chunking/circular-chunk warnings and `publint` emitted a repository URL suggestion.                                             |
| `pnpm verify:toolchain`             | pass                          | Confirmed Node `22.22.1` and pnpm `10.32.1`.                                                                                                                   |
| `pnpm verify:test-migration-status` | pass                          | Tracker regenerated without drift.                                                                                                                             |
| `pnpm verify:clean-build`           | blocked in harness            | Failed before running because injected untracked `.openase/*` files make the worktree appear dirty.                                                            |
| `pnpm verify:pack`                  | pass                          | Verified packed tarball contents and required root files.                                                                                                      |
| `pnpm verify:exports`               | pass                          | Verified runtime imports from the packed tarball via `tests/pack-smoke/`.                                                                                      |
| `pnpm verify:dependency-policy`     | pass with approved exceptions | Reported `1` approved production `high` advisory, `18` approved development `high` advisories, and `2` approved production license exceptions.                 |
| `pnpm verify:release-metadata`      | pass                          | Generated tarball metadata, digest files, and provenance metadata locally.                                                                                     |

## Decision

Decision: `NO-GO` for a parity-backed release.

Reasoning:

1. Parity evidence is still materially incomplete.
   `docs/parity-matrix.md` and `docs/test-migration-status.md` both show unresolved high-risk and `P0` work.
2. The trusted-release policy is not yet fully enforced by current CI.
   Required jobs listed in `docs/release-policy.md` do not all exist or all run on `CI`, and there is no completed `Release` workflow run to inspect.
3. Baseline validation is not green.
   `pnpm lint` and `pnpm test` both fail in the audited workspace state, and the unit test failures include genuine behavior regressions.
4. Dependency and license risk is controlled, not eliminated.
   The gate passes only because high-severity advisories and license anomalies are explicitly approved for later removal before the first trusted release.

## Exit Criteria For Re-Audit

Re-run this audit only after all of the following are true:

1. Remaining `P0` parity items are reduced to green, or explicitly downgraded with reviewed rationale backed by updated matrix and migration evidence.
2. `pnpm lint`, `pnpm check`, `pnpm test`, and `pnpm build` are all green on the candidate release commit.
3. `CI` enforces every required trusted-release job named in `docs/release-policy.md`, not just the `verify-*` subset.
4. At least one non-publishing `Release` workflow dry run is completed successfully and reviewed for artifact/provenance evidence.
5. Approved dependency and license exceptions are either removed or re-reviewed with an explicit decision that they do not block the first trusted release.
