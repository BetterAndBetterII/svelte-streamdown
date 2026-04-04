# Release Readiness Report

This document records the `ASE-21` final unresolved-gap summary and refreshed release readiness audit for `svelte-streamdown`.

Audit date: `2026-04-04`

Supersedes:

- the prior `P5-05` audit captured in this file on `2026-04-03`

Audit target:

- Repository: `BetterAndBetterII/svelte-streamdown`
- Release candidate branch/head reviewed: `master@a6b7f897243b3669137324398c9dcb9addd9a66e`
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
- Refreshed parity and release artifacts committed in the repository:
  - `artifacts/nightly/summary/summary.md`
  - `artifacts/nightly/ported-tests/summary.md`
  - `artifacts/nightly/playwright-parity/summary.md`
  - `artifacts/nightly/pack-smoke/summary.md`
  - `artifacts/nightly/dependency-audit/summary.md`
  - `artifacts/release/build-metadata.json`
  - `artifacts/release/artifact-metadata.json`
  - `artifacts/release/provenance-metadata.json`
- Current GitHub Actions evidence gathered on `2026-04-04`:
  - `gh run list --workflow "CI" --limit 5`
  - `gh run list --workflow "Nightly Full Parity" --limit 5`
  - `gh run list --workflow "Release" --limit 5`
  - `gh run view 23970111865 --json url,jobs,headSha,displayTitle,event,conclusion,createdAt,updatedAt`
- Local re-audit commands run from this workspace on `2026-04-04`:
  - `pnpm lint`
  - `pnpm check`
  - `pnpm test`
  - `pnpm build`
  - `pnpm verify:toolchain`
  - `pnpm verify:test-migration-status`
  - `pnpm verify:pack`
  - `pnpm verify:exports`
  - `pnpm verify:dependency-policy`
  - `pnpm verify:release-metadata`
  - `pnpm verify:clean-build`
  - `pnpm verify:api-surface`
- Local audit setup note:
  - the OpenASE harness omits `references/streamdown/**` by default, so the frozen upstream reference tree was checked out locally at `5f64751` before rerunning `pnpm verify:api-surface` and the affected contract suite

## Refresh Since The 2026-04-03 Audit

- The exact current `master` head now has fresh green GitHub CI evidence:
  - push run `23970111865` completed successfully on `2026-04-04` for `master@a6b7f897243b3669137324398c9dcb9addd9a66e`
- The repo now contains a refreshed committed nightly artifact bundle:
  - `artifacts/nightly/summary/summary.md` reports overall `success` at `2026-04-04T03:01:09.427Z`
  - the committed suite summaries for `ported-tests`, `playwright-parity`, `pack-smoke`, and `dependency-audit` are all green
- The API-surface and parser contract evidence is materially better than in the prior audit:
  - with the frozen reference tree present, `pnpm verify:api-surface` passed locally
  - `tests/contracts/parser-ir.spec.ts` and `tests/contracts/parser-parity.spec.ts` passed locally once the missing reference tree was restored
- `docs/parity-matrix.md` now treats package/export-boundary and plugin-boundary differences as explicit `different_by_design` drift instead of leaving them as implicit implementation debt

The refreshed evidence narrows the release risk to a smaller and clearer set of remaining blockers, but it does not clear the release.

## Final Unresolved-Gap Summary

| Gap family                                                                                                                                                                                                                                                  | Final status             | Evidence                                                                                                                                                                                                     | Release implication                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release-hardening CI on the exact `master` head (`verify-test-migration-status`, `verify-toolchain`, `verify-clean-build`, `verify-pack`, `verify-exports`, `verify-dependency-policy`, `verify-api-surface`, `verify-release-metadata`, `report-coverage`) | `closed`                 | GitHub Actions run `23970111865` on `master@a6b7f89` completed successfully on `2026-04-04`                                                                                                                  | The current head has fresh repo-hosted evidence for the implemented `verify-*` gates.                                                                                                                                                                                                              |
| Refreshed nightly parity artifact bundle (`ported-tests`, `playwright-parity`, `pack-smoke`, `dependency-audit`)                                                                                                                                            | `closed`                 | `artifacts/nightly/summary/summary.md` plus the four suite summaries all report `success` on `2026-04-04`                                                                                                    | Evidence refresh is complete; release review no longer depends on stale or missing local artifact snapshots.                                                                                                                                                                                       |
| Package/export-boundary parity differences (`api-01` through `api-08`, `prop-12`)                                                                                                                                                                           | `accepted drift`         | `docs/parity-matrix.md`, `docs/parity-contract.md`, `tests/contracts/api-surface.spec.ts`, `fixtures/parity/local-api-surface.json`                                                                          | These are now explicit Svelte-first contract differences, not hidden release blockers by themselves.                                                                                                                                                                                               |
| Plugin contract and standalone package differences (`prop-20`, `plugin-02` through `plugin-05`)                                                                                                                                                             | `accepted drift`         | `docs/parity-matrix.md`, `docs/parity-contract.md`, `tests/ported/streamdown/rendering/plugin-contract.svelte.test.ts`                                                                                       | These gaps stay documented as accepted packaging and extensibility drift rather than parity debt for this release.                                                                                                                                                                                 |
| Local clean-build reproducibility inside the OpenASE harness                                                                                                                                                                                                | `accepted drift`         | local `pnpm verify:clean-build` fails on injected untracked `.openase/*`, while GitHub CI run `23970111865` passed `verify-clean-build` on the exact commit                                                  | This is an environment artifact in the harness, not evidence that the repository's clean-build gate is broken on the reviewed commit.                                                                                                                                                              |
| Remaining parser parity backlog (`prop-09`, `parser-01`, `parser-10`, `parser-11`, `parser-04`, `parser-08`)                                                                                                                                                | `still blocking release` | `docs/parity-matrix.md` categorized backlog and local `pnpm test` failures after restoring `references/streamdown`                                                                                           | The parser still diverges on block splitting, footnote IR parity, CJK emphasis semantics, and dedicated inline-code / HTML-tail regression coverage.                                                                                                                                               |
| Remaining security parity backlog (`prop-13`, `interact-06`, `sec-02`, `sec-03`, `sec-05`)                                                                                                                                                                  | `still blocking release` | `docs/parity-matrix.md` high-risk section and categorized backlog                                                                                                                                            | The security hardening baseline exists, but the frozen `linkSafety` modal/interceptor contract and the missing `Markdown` filtering surface are still explicit parity blockers.                                                                                                                    |
| Remaining rendering parity backlog (`prop-08`, `prop-19`, `prop-21` through `prop-24`, `render-05`, `render-10`, plus `prop-01`, `prop-02`, `render-01`, `render-02`, `render-04`, `render-06`, `render-07`, `render-09`)                                   | `still blocking release` | `docs/parity-matrix.md` categorized backlog                                                                                                                                                                  | The local renderer still lacks full override-map parity, broader frozen component-contract behavior, and the direct DOM/browser evidence needed to prove several existing shims.                                                                                                                   |
| Remaining interaction parity backlog (`prop-05`, `prop-06`, `prop-07`, `prop-10`, `prop-18`, `interact-02`, `interact-04`, `interact-08`)                                                                                                                   | `still blocking release` | `docs/parity-matrix.md` categorized backlog                                                                                                                                                                  | Animation compatibility, nested control behavior, caret edge cases, and table/image/mermaid control contracts still diverge from the frozen target.                                                                                                                                                |
| Remaining test-migration backlog                                                                                                                                                                                                                            | `still blocking release` | `docs/test-migration-status.md`                                                                                                                                                                              | The tracker still reports `4` remaining `P0` files not yet passing via a ported upstream file or local analogue, `44` partial files, `5` missing files, and `21` files still blocked by missing surface.                                                                                           |
| Baseline formatting gate                                                                                                                                                                                                                                    | `still blocking release` | local `pnpm lint` failed on `2026-04-04`                                                                                                                                                                     | Trusted release policy requires `lint-and-format`, and the current workspace still shows formatting drift across tracked files plus malformed committed nightly JSON-like outputs that Prettier cannot parse.                                                                                      |
| Baseline unit-test gate                                                                                                                                                                                                                                     | `still blocking release` | local `pnpm test` failed on `2026-04-04` even after restoring `references/streamdown`                                                                                                                        | With the reference tree present, the remaining failures are real: `17` test files and `43` tests still fail, clustered in incomplete-markdown repair, link/image edge cases, alignment handling, and table empty-cell behavior.                                                                    |
| Approved dependency and license exceptions                                                                                                                                                                                                                  | `still blocking release` | local `pnpm verify:dependency-policy` passed only with approved exceptions, and `docs/release-policy.md` still says the repository is not yet authorized for a trusted release while those exceptions remain | Dependency risk is controlled and documented, but not cleared for the first trusted release.                                                                                                                                                                                                       |
| Trusted release workflow evidence and policy-to-workflow alignment                                                                                                                                                                                          | `still blocking release` | `docs/release-policy.md`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and `gh run list --workflow "Release"`                                                                                | There is still no completed `Release` workflow run to inspect, and the policy-required `lint-and-format`, `typecheck`, `unit-tests`, `build-package`, `publish-with-provenance`, and `post-publish-verify` jobs are not yet present as matching required release jobs in GitHub workflow evidence. |

## Current Evidence Snapshot

### Parity And Migration State

`docs/parity-matrix.md` now makes the remaining state explicit instead of mixing accepted drift with implementation debt:

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
- `13` files passing via ported upstream file
- `7` files passing with documented port gap
- `11` files passing via local analogue only
- `44` files with partial local coverage
- `5` files with missing local coverage
- `21` files blocked by missing surface
- `4` remaining `P0` files not yet passing via a ported upstream file or local analogue

### GitHub Actions State

Latest current-head push run:

- Workflow: `CI`
- Run id: `23970111865`
- Head: `master@a6b7f897243b3669137324398c9dcb9addd9a66e`
- Created: `2026-04-04T03:11:32Z`
- Updated: `2026-04-04T03:13:19Z`
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

- `gh run list --workflow "Nightly Full Parity"` returned no GitHub-hosted runs
- `gh run list --workflow "Release"` returned no runs
- the workflow files do exist in the repository, so this is an execution-history gap, not a missing-file gap

### Local Re-Audit Commands

| Command                             | Result                                       | Notes                                                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                         | fail                                         | Prettier still reports formatting drift in tracked files and cannot parse several committed `artifacts/nightly/*.json` outputs because they contain command-banner text before the JSON body.                                |
| `pnpm check`                        | pass                                         | `svelte-check` reported `0` errors and `0` warnings.                                                                                                                                                                         |
| `pnpm test`                         | fail                                         | With `references/streamdown` restored locally, the suite still fails in `17` files and `43` tests; the remaining failures are genuine parser and incomplete-markdown behavior regressions, not just missing-reference noise. |
| `pnpm build`                        | pass with warnings                           | Build and `prepack` completed; Vite warned about circular `svelte-themes` chunking and large chunks, and `publint` suggested a full `git+https://...` repository URL.                                                        |
| `pnpm verify:toolchain`             | pass                                         | Confirmed Node `22.22.1` and pnpm `10.32.1`.                                                                                                                                                                                 |
| `pnpm verify:test-migration-status` | pass                                         | Migration tracker is in sync with its source inventory.                                                                                                                                                                      |
| `pnpm verify:pack`                  | pass                                         | Verified tarball contents and required root files from `svelte-streamdown-3.0.1.tgz`.                                                                                                                                        |
| `pnpm verify:exports`               | pass                                         | Verified `.` plus `./code`, `./mermaid`, and `./math` from the packed tarball.                                                                                                                                               |
| `pnpm verify:dependency-policy`     | pass with approved exceptions                | Reported `1` approved production `high` advisory, `18` approved development `high` advisories, and `2` approved production license exceptions.                                                                               |
| `pnpm verify:release-metadata`      | pass                                         | Generated and verified release metadata for `a6b7f897243b3669137324398c9dcb9addd9a66e`.                                                                                                                                      |
| `pnpm verify:clean-build`           | blocked in harness                           | The local verifier still fails before running because the harness injects untracked `.openase/*` files; GitHub CI passed the same gate on the exact reviewed commit.                                                         |
| `pnpm verify:api-surface`           | pass after restoring `references/streamdown` | Once the frozen reference repo was checked out locally at `5f64751`, the reference snapshot, local snapshot, and contract tests all passed.                                                                                  |

## Decision

Decision: `NO-GO` for a trusted release and `NO-GO` for a parity-backed release claim.

Reasoning:

1. Parity evidence is refreshed, but the remaining backlog is still explicitly release-blocking.
   `docs/parity-matrix.md` still carries open parser, security, rendering, and interaction backlog rows, and `docs/test-migration-status.md` still shows unresolved `P0`, partial, missing, and blocked files.
2. Baseline quality gates are still not green on the reviewed commit.
   `pnpm lint` and `pnpm test` both fail during this audit, even after the missing-reference harness issue was removed from the test path.
3. Trusted release policy still lacks end-to-end workflow evidence.
   No `Release` workflow run exists to inspect, and the policy-required `lint-and-format`, `typecheck`, `unit-tests`, `build-package`, `publish-with-provenance`, and `post-publish-verify` jobs are not yet evidenced as matching required release jobs.
4. Dependency and license exceptions remain explicitly temporary.
   The dependency-policy gate is green only because the current exceptions are approved for later removal or re-review before the first trusted release.

## Exit Criteria For The Next Re-Audit

Re-run release review only after all of the following are true:

1. The remaining parser, security, rendering, and interaction backlog rows in `docs/parity-matrix.md` are either closed with evidence or formally reclassified in the compatibility contract.
2. `docs/test-migration-status.md` no longer reports unresolved `P0` files and has materially reduced the current `partial` / `missing` / `blocked` inventory.
3. `pnpm lint`, `pnpm check`, `pnpm test`, and `pnpm build` are all green on the exact candidate release commit.
4. GitHub workflow evidence exists for the release policy itself, not just the `verify-*` subset:
   - a completed `Release` workflow run is available for audit
   - the required release jobs in `docs/release-policy.md` are implemented and reviewable as actual enforced workflow gates
5. Approved dependency and license exceptions are removed or explicitly re-reviewed with a written decision that they no longer block the first trusted release.
