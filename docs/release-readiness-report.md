# Release Readiness Report

This document records the `ASE-33` re-audit of release readiness after the refreshed remaining-gap evidence landed for `svelte-streamdown`.

Audit date: `2026-04-04`

Supersedes:

- the prior `ASE-21` release-readiness audit captured in this file on `2026-04-04`
- the earlier `P5-05` audit captured in this file on `2026-04-03`

Audit target:

- Repository: `BetterAndBetterII/svelte-streamdown`
- Release candidate branch/head reviewed: `master@9b1b513ad0801af5b2c2737048b881a00b9f3818`
- Frozen parity target: `vercel/streamdown@5f6475139a87dee8af08fcf7b01475292bc064d2`
- Tracking issue: `#87`

## Evidence Reviewed

- Roadmap, parity contract, and backlog state:
  - `PLAN.md`
  - `docs/parity-contract.md`
  - `docs/parity-matrix.md`
  - `docs/test-migration-status.md`
- Release policy and workflow definitions:
  - `docs/release-policy.md`
  - `.github/workflows/ci.yml`
  - `.github/workflows/nightly-full-parity.yml`
  - `.github/workflows/release.yml`
- Refreshed artifacts committed in the repository:
  - `artifacts/nightly/summary/summary.md`
  - `artifacts/nightly/summary/status.json`
  - `artifacts/nightly/ported-tests/summary.md`
  - `artifacts/nightly/ported-tests/status.json`
  - `artifacts/nightly/playwright-parity/summary.md`
  - `artifacts/nightly/playwright-parity/status.json`
  - `artifacts/nightly/pack-smoke/summary.md`
  - `artifacts/nightly/pack-smoke/status.json`
  - `artifacts/nightly/pack-smoke/verify-pack.json`
  - `artifacts/nightly/pack-smoke/verify-exports.json`
  - `artifacts/nightly/dependency-audit/summary.md`
  - `artifacts/nightly/dependency-audit/status.json`
  - `artifacts/nightly/dependency-audit/dependency-policy.json`
  - `artifacts/release/build-metadata.json`
  - `artifacts/release/artifact-metadata.json`
  - `artifacts/release/provenance-metadata.json`
- Current GitHub Actions evidence gathered on `2026-04-04`:
  - `gh run list --workflow "CI" --limit 5`
  - `gh run view 23975809813 --json url,jobs,headSha,displayTitle,event,conclusion,createdAt,updatedAt`
  - `gh run list --workflow "Nightly Full Parity" --limit 5`
  - `gh run view 23971837933 --json url,jobs,headSha,displayTitle,event,conclusion,createdAt,updatedAt`
  - `gh run list --workflow "Release" --limit 5`
- Local re-audit commands run from this workspace on `2026-04-04`:
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm check`
  - `pnpm test`
  - `pnpm build`
  - `pnpm verify:test-migration-status`
  - `pnpm verify:toolchain`
  - `pnpm verify:dependency-policy`
  - `pnpm verify:release-metadata`
  - `pnpm verify:api-surface`
  - `pnpm verify:pack`
  - `pnpm verify:exports`
  - `pnpm verify:clean-build`

## What Changed Since The Prior Audit

- The reviewed `master` head advanced from `a6b7f897243b3669137324398c9dcb9addd9a66e` to `9b1b513ad0801af5b2c2737048b881a00b9f3818`, and the exact new head has fresh green CI evidence:
  - push run `23975809813` completed successfully on `2026-04-04`
- The migration tracker is materially better than the prior audit:
  - `docs/test-migration-status.md` now reports `45` files passing via ported upstream tests, `15` with documented port gaps, and `16` via local analogue only
  - the remaining unresolved inventory dropped to `8` partial files, `2` missing files, `15` blocked files, and `2` remaining `P0` files not yet passing via a ported upstream file or local analogue
- The committed nightly and release artifacts were refreshed again on `2026-04-04`:
  - `artifacts/nightly/summary/summary.md` reports overall `success` at `2026-04-04T09:01:43.997Z`
  - the committed release metadata bundle is refreshed, but `artifacts/release/build-metadata.json` still records the artifact source commit as merged ancestor `21747b7710869c5ad95bc991a10c5acb8a3c641b`, not the current merge commit `9b1b513ad0801af5b2c2737048b881a00b9f3818`
- GitHub-hosted nightly evidence is still inconsistent:
  - the latest scheduled `Nightly Full Parity` run `23971837933` on ancestor `71b164def5df1af0203a9152c90f04df8c00c7df` failed in `ported-tests`, `playwright-parity`, and `publish-summary`
  - that means the repository contains a refreshed green nightly artifact bundle, but the latest scheduled GitHub workflow run is still red
- The fresh local re-audit now replaces the stale baseline-gate assumptions in the prior report:
  - `pnpm check`, `pnpm build`, `pnpm verify:test-migration-status`, `pnpm verify:toolchain`, `pnpm verify:dependency-policy`, `pnpm verify:release-metadata`, `pnpm verify:api-surface`, `pnpm verify:pack`, and `pnpm verify:exports` all passed
  - `pnpm lint`, `pnpm test`, and `pnpm verify:clean-build` still failed for reasons captured below

## Final Unresolved-Gap Summary

| Gap family                                                                                                                                                                                                                                                                                                                                       | Current status                         | Evidence                                                                                                                                                                                                                                                                                                                                        | Release implication                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact-head release-hardening CI subset (`verify-test-migration-status`, `verify-toolchain`, `verify-clean-build`, `verify-pack`, `verify-exports`, `verify-dependency-policy`, `verify-api-surface`, `verify-release-metadata`, `report-coverage`)                                                                                               | `closed`                               | GitHub Actions run `23975809813` passed on `master@9b1b513ad0801af5b2c2737048b881a00b9f3818`                                                                                                                                                                                                                                                    | The current head has fresh repo-hosted evidence for the implemented `verify-*` gate subset.                                                                                                                                                                      |
| Migration tracker refresh and reference-sync check                                                                                                                                                                                                                                                                                               | `closed`                               | `docs/test-migration-status.md` plus local `pnpm verify:test-migration-status`                                                                                                                                                                                                                                                                  | The written migration-status evidence is current and internally consistent.                                                                                                                                                                                      |
| Package/export-boundary and plugin-boundary differences (`api-01` through `api-08`, `prop-12`, `prop-20`, `plugin-02` through `plugin-05`)                                                                                                                                                                                                       | `accepted drift`                       | `docs/parity-matrix.md`, `docs/parity-contract.md`, `tests/contracts/api-surface.spec.ts`                                                                                                                                                                                                                                                       | These gaps are now explicit Svelte-first contract drift, not hidden blockers by themselves.                                                                                                                                                                      |
| Remaining parser, security, rendering, and interaction backlog (`prop-09`, `parser-01`, `parser-10`, `parser-11`, `parser-04`, `parser-08`, `sec-03`, `sec-05`, `prop-08`, `prop-19`, `prop-21` through `prop-24`, `render-05`, `render-10`, `prop-05`, `prop-06`, `prop-07`, `prop-10`, `prop-18`, `interact-02`, `interact-04`, `interact-08`) | `still blocking parity-backed release` | `docs/parity-matrix.md` categorized unresolved backlog                                                                                                                                                                                                                                                                                          | The compatibility contract still documents material open parity work rather than a fully-closed frozen target.                                                                                                                                                   |
| Remaining test-migration backlog                                                                                                                                                                                                                                                                                                                 | `still blocking parity-backed release` | `docs/test-migration-status.md`                                                                                                                                                                                                                                                                                                                 | The tracker still reports `2` remaining `P0` files, `8` partial files, `2` missing files, and `15` files blocked by missing surface.                                                                                                                             |
| Baseline formatting gate and artifact hygiene                                                                                                                                                                                                                                                                                                    | `still blocking trusted release`       | local `pnpm lint` failed on `2026-04-04`; Prettier cannot parse committed pseudo-JSON artifacts such as `artifacts/nightly/dependency-audit/dependency-policy.json`, `artifacts/nightly/pack-smoke/verify-pack.json`, and `artifacts/nightly/pack-smoke/verify-exports.json`, and the worktree still contains formatting drift in tracked files | The required `lint-and-format` gate is not green, and some committed evidence artifacts are not clean machine-parseable JSON because they include command-banner text before the JSON body.                                                                      |
| Baseline unit-test gate                                                                                                                                                                                                                                                                                                                          | `still blocking trusted release`       | local `pnpm test` failed on `2026-04-04` with `17` failed files and `43` failed tests                                                                                                                                                                                                                                                           | The current candidate still misses required release-policy unit-test coverage, with failures clustered in incomplete-markdown repair, alignment handling, link/image edge cases, and table empty-cell behavior.                                                  |
| Typecheck, build, API-surface, and packed-export verification                                                                                                                                                                                                                                                                                    | `closed`                               | local `pnpm check`, `pnpm build`, `pnpm verify:api-surface`, `pnpm verify:pack`, and `pnpm verify:exports` all passed on `2026-04-04`                                                                                                                                                                                                           | These gates no longer block the release decision.                                                                                                                                                                                                                |
| Clean-build reproducibility inside the OpenASE harness                                                                                                                                                                                                                                                                                           | `accepted environment artifact`        | local `pnpm verify:clean-build` stops immediately on injected untracked `.openase/bin/openase` and `.openase/harnesses/coding-workflow.md`, while GitHub Actions run `23975809813` passed `verify-clean-build` on the exact reviewed commit                                                                                                     | This is still a harness-specific limitation, not direct evidence that the repository's clean-build gate is broken on the reviewed commit.                                                                                                                        |
| Approved dependency and license exceptions                                                                                                                                                                                                                                                                                                       | `still blocking first trusted release` | local `pnpm verify:dependency-policy` passed with `1` approved production `high` advisory, `19` approved development `high` advisories, and `2` approved production license exceptions                                                                                                                                                          | Dependency risk is reviewed and bounded, but the release policy still says the first trusted release is blocked while these exceptions remain temporary.                                                                                                         |
| Trusted release workflow and provenance evidence                                                                                                                                                                                                                                                                                                 | `still blocking trusted release`       | `docs/release-policy.md`, `.github/workflows/release.yml`, `gh run list --workflow "Release" --limit 5`, committed `artifacts/release/*.json`, and local `pnpm verify:release-metadata`                                                                                                                                                         | There is still no completed `Release` workflow run, so there is no repo-hosted `publish-with-provenance` or `post-publish-verify` evidence on the reviewed commit. The local metadata gate is reproducible, but it does not replace a real release workflow run. |
| GitHub-hosted nightly parity automation consistency                                                                                                                                                                                                                                                                                              | `still blocking parity-backed release` | latest scheduled `Nightly Full Parity` run `23971837933` failed on `71b164def5df1af0203a9152c90f04df8c00c7df`, while the committed nightly artifact bundle generated later on merged ancestor `21747b7710869c5ad95bc991a10c5acb8a3c641b` reports success                                                                                        | The repo has refreshed parity artifacts, but it does not yet have a consistent passing scheduled nightly workflow history to back a parity-backed release claim.                                                                                                 |

## Closeout Execution Mapping

The `2026-04-04` re-audit no longer leaves these blockers as implicit follow-up work. They are now mapped to explicit OpenASE execution tickets under `ASE-34`, with dependency ordering set so the next closeout pass can start from the ticket tree instead of re-deriving it from this report.

| Unresolved gap family from this report                        | Execution ticket | Why this ticket exists now                                                                                                                                                                 | Dependency order                                                                |
| ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Remaining parser and security parity backlog                  | `ASE-35`         | Closes `prop-09`, `parser-01`, `parser-10`, `parser-11`, `parser-04`, `parser-08`, `sec-03`, and `sec-05` or reclassifies them explicitly with evidence                                    | Starts immediately; must finish before `ASE-37` and `ASE-39`                    |
| Remaining rendering and interaction parity backlog            | `ASE-36`         | Closes `prop-08`, `prop-19`, `prop-21` through `prop-24`, `render-05`, `render-10`, `prop-05`, `prop-06`, `prop-07`, `prop-10`, `prop-18`, `interact-02`, `interact-04`, and `interact-08` | Starts immediately; must finish before `ASE-37` and `ASE-39`                    |
| Remaining test-migration backlog and unresolved `P0` evidence | `ASE-37`         | Eliminates the remaining unresolved `P0` files and refreshes migration inventory counts after the surface work lands                                                                       | Waits for `ASE-35` and `ASE-36`; then unblocks `ASE-41` and `ASE-43`            |
| Baseline formatting gate and artifact hygiene                 | `ASE-38`         | Makes `pnpm lint` green and removes the pseudo-JSON artifact failure mode                                                                                                                  | Starts immediately; then unblocks `ASE-41`, `ASE-42`, and `ASE-43`              |
| Baseline unit-test gate                                       | `ASE-39`         | Makes `pnpm test` green on the candidate head with root-cause fixes and regression coverage                                                                                                | Waits for `ASE-35` and `ASE-36`; then unblocks `ASE-41`, `ASE-42`, and `ASE-43` |
| Dependency and license exception closeout                     | `ASE-40`         | Re-reviews or removes the temporary exceptions still blocking the first trusted release                                                                                                    | Starts immediately; then unblocks `ASE-42` and `ASE-43`                         |
| GitHub-hosted nightly parity automation consistency           | `ASE-41`         | Produces at least one passing repo-hosted `Nightly Full Parity` run for the reviewed state                                                                                                 | Waits for `ASE-37`, `ASE-38`, and `ASE-39`; then unblocks `ASE-42` and `ASE-43` |
| Trusted release workflow and provenance evidence              | `ASE-42`         | Produces the first completed repo-hosted `Release` workflow evidence set for the reviewed commit                                                                                           | Waits for `ASE-38`, `ASE-39`, `ASE-40`, and `ASE-41`; then unblocks `ASE-43`    |
| Final document and platform status synchronization            | `ASE-43`         | Updates `PLAN.md`, this report, and the platform umbrella statuses only after the blocker tickets are truly closed                                                                         | Waits for `ASE-37`, `ASE-38`, `ASE-39`, `ASE-40`, `ASE-41`, and `ASE-42`        |

Execution sequencing for the next closeout pass is therefore:

1. Run `ASE-35`, `ASE-36`, `ASE-38`, and `ASE-40` in parallel.
2. After the remaining parity surface work lands, run `ASE-37` and `ASE-39`.
3. Re-establish repo-hosted nightly evidence in `ASE-41`.
4. Produce repo-hosted release provenance evidence in `ASE-42`.
5. Perform final document and platform status synchronization in `ASE-43`.

## Current Evidence Snapshot

### Parity And Migration State

`docs/parity-matrix.md` now makes the remaining parity state explicit:

- accepted drift:
  - package/export boundaries
  - plugin-contract and standalone-package boundaries
- release-blocking backlog:
  - parser
  - security
  - rendering
  - interactions

`docs/test-migration-status.md` currently reports:

- `101` executable frozen reference files
- `45` files passing via ported upstream file
- `15` files passing with documented port gap
- `16` files passing via local analogue only
- `8` files with partial local coverage
- `2` files with missing local coverage
- `15` files blocked by missing surface
- `2` remaining `P0` files not yet passing via a ported upstream file or local analogue

### GitHub Actions State

Latest exact-head push run:

- Workflow: `CI`
- Run id: `23975809813`
- Head: `master@9b1b513ad0801af5b2c2737048b881a00b9f3818`
- Created: `2026-04-04T09:07:24Z`
- Updated: `2026-04-04T09:09:27Z`
- Result: `success`

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

Other workflow observations gathered on `2026-04-04`:

- latest scheduled `Nightly Full Parity` run `23971837933` concluded `failure`
- the failing run head was ancestor `71b164def5df1af0203a9152c90f04df8c00c7df`
- the failing jobs were `ported-tests`, `playwright-parity`, and `publish-summary`
- `gh run list --workflow "Release"` returned no runs

### Local Re-Audit Commands

| Command                             | Result                        | Notes                                                                                                                                                                 |
| ----------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | pass                          | Installed the workspace dependencies required for the local re-audit.                                                                                                 |
| `pnpm lint`                         | fail                          | Prettier reports tracked-file formatting drift and cannot parse committed pseudo-JSON artifacts whose first lines are command banners rather than JSON.               |
| `pnpm check`                        | pass                          | `svelte-check` reported `0` errors and `0` warnings.                                                                                                                  |
| `pnpm test`                         | fail                          | `17` files and `43` tests still fail, clustered in incomplete-markdown repair, alignment handling, link/image edge cases, and table empty-cell behavior.              |
| `pnpm build`                        | pass with warnings            | Build and `prepack` completed; Vite warned about `svelte-themes` circular chunking and large chunks, and `publint` suggested a full `git+https://...` repository URL. |
| `pnpm verify:test-migration-status` | pass                          | Confirmed that `docs/test-migration-status.md` matches the generated inventory.                                                                                       |
| `pnpm verify:toolchain`             | pass                          | Confirmed Node `22.22.1` and pnpm `10.32.1`.                                                                                                                          |
| `pnpm verify:dependency-policy`     | pass with approved exceptions | Reported `1` approved production `high` advisory, `19` approved development `high` advisories, and `2` approved production license exceptions.                        |
| `pnpm verify:release-metadata`      | pass                          | Reproduced release metadata locally for exact current head `9b1b513ad0801af5b2c2737048b881a00b9f3818`.                                                                |
| `pnpm verify:api-surface`           | pass                          | Reference snapshot, local snapshot, and contract suite all passed with `references/streamdown` present.                                                               |
| `pnpm verify:pack`                  | pass                          | Verified tarball contents and required root files from `svelte-streamdown-3.0.1.tgz`.                                                                                 |
| `pnpm verify:exports`               | pass                          | Verified `.` plus `./code`, `./mermaid`, and `./math` from the packed tarball.                                                                                        |
| `pnpm verify:clean-build`           | blocked in harness            | The local verifier still fails before starting because the harness injects untracked `.openase/*` files into the worktree.                                            |

## Decision

Decision: `NO-GO` for a trusted release and `NO-GO` for a parity-backed release claim.

Reasoning:

1. The refreshed evidence closed several verification gaps, but it did not close the remaining release blockers.
   `pnpm check`, `pnpm build`, `pnpm verify:test-migration-status`, `pnpm verify:api-surface`, `pnpm verify:pack`, and `pnpm verify:exports` now pass, so those items are no longer the issue.
2. The exact candidate commit still fails required baseline release gates.
   `pnpm lint` is red because tracked files still have formatting drift and some committed nightly artifacts are not valid JSON for formatter purposes, and `pnpm test` is red with `17` failed files and `43` failed tests.
3. The frozen parity closeout is not complete.
   `docs/parity-matrix.md` still carries open parser, security, rendering, and interaction backlog rows, and `docs/test-migration-status.md` still reports `2` unresolved `P0` files plus partial, missing, and blocked inventory.
4. Trusted release automation is still incomplete.
   There is still no completed `Release` workflow run, no repo-hosted `publish-with-provenance` or `post-publish-verify` evidence, and the approved dependency/license exceptions remain explicitly temporary under `docs/release-policy.md`.
5. Repo-hosted parity evidence is not yet consistent enough for a parity-backed release claim.
   The repository contains a refreshed green nightly artifact bundle, but the latest scheduled `Nightly Full Parity` GitHub run is still red.

## Exit Criteria For The Next Re-Audit

Re-run release review only after all of the following are true:

1. The remaining parser, security, rendering, and interaction backlog rows in `docs/parity-matrix.md` are either closed with evidence or formally reclassified in the compatibility contract.
2. `docs/test-migration-status.md` no longer reports unresolved `P0` files and has materially reduced the current `partial` / `missing` / `blocked` inventory.
3. `pnpm lint` and `pnpm test` are green on the exact candidate release commit, and the committed evidence artifacts no longer rely on command-banner-prefixed pseudo-JSON files.
4. A passing repo-hosted `Nightly Full Parity` run exists for the reviewed state, not just a committed artifact bundle.
5. A completed `Release` workflow run exists and provides auditable `publish-with-provenance` and `post-publish-verify` evidence for the reviewed commit.
6. Approved dependency and license exceptions are removed or explicitly re-reviewed with a written decision that they no longer block the first trusted release.
