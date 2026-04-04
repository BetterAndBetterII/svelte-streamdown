# Release Readiness Report

This document records the `ASE-43` final closeout refresh of release readiness for `svelte-streamdown`.

Audit date: `2026-04-04`

Supersedes:

- the `ASE-33` re-audit captured earlier in this file on `2026-04-04`
- the earlier `ASE-21` and `P5-05` audits captured in this file on `2026-04-04` and `2026-04-03`

Audit target:

- Repository: `BetterAndBetterII/svelte-streamdown`
- Release candidate branch/head reviewed: `master@850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84`
- Frozen parity target: `vercel/streamdown@5f6475139a87dee8af08fcf7b01475292bc064d2`
- Tracking issue: `#87`
- Closeout ticket: `ASE-43`

## Evidence Reviewed

- Current roadmap, parity, and release-policy state:
  - `PLAN.md`
  - `docs/parity-contract.md`
  - `docs/parity-matrix.md`
  - `docs/test-migration-status.md`
  - `docs/dependency-policy.md`
  - `docs/release-policy.md`
- Release inputs and versioned package metadata:
  - `package.json`
  - `CHANGELOG.md`
- Workflow definitions:
  - `.github/workflows/ci.yml`
  - `.github/workflows/nightly-full-parity.yml`
  - `.github/workflows/release.yml`
- Committed evidence bundles still present in the repository:
  - `artifacts/nightly/summary/summary.md`
  - `artifacts/nightly/summary/status.json`
  - `artifacts/nightly/dependency-audit/summary.md`
  - `artifacts/nightly/dependency-audit/status.json`
  - `artifacts/release/build-metadata.json`
  - `artifacts/release/artifact-metadata.json`
  - `artifacts/release/provenance-metadata.json`
- Current GitHub Actions evidence gathered on `2026-04-04`:
  - `gh run list --workflow "CI" --limit 5`
  - `gh run view 23982213956 --json url,jobs,headSha,displayTitle,event,conclusion,createdAt,updatedAt`
  - `gh run list --workflow "Nightly Full Parity" --limit 5`
  - `gh run view 23981223900 --json url,jobs,headSha,displayTitle,event,conclusion,createdAt,updatedAt`
  - `gh run list --workflow "Release" --limit 5`
  - `gh run view 23982213953 --json url,jobs,headSha,displayTitle,event,conclusion,createdAt,updatedAt`
- Current platform status evidence gathered on `2026-04-04`:
  - `./.openase/bin/openase ticket list`
  - `./.openase/bin/openase ticket list | jq '.tickets[] | select(.identifier=="ASE-15" or .identifier=="ASE-34" or .identifier=="ASE-35" or .identifier=="ASE-36" or .identifier=="ASE-37" or .identifier=="ASE-38" or .identifier=="ASE-39" or .identifier=="ASE-40" or .identifier=="ASE-41" or .identifier=="ASE-42" or .identifier=="ASE-43")'`
- Local repo-state checks gathered on `2026-04-04`:
  - `git diff --name-only 4dbd7b339a58f0ca349ba18d2330a5da50edbe33..850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84`
  - `git diff --name-only 753cf91573dcfc2a5187238e8067cf5c7f6f0f83..850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84`

## What Changed Since The Prior Audit

- The reviewed `master` head advanced from `9b1b513ad0801af5b2c2737048b881a00b9f3818` to `850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84`.
- The exact reviewed head now has fresh green repo-hosted CI evidence:
  - push run `23982213956` completed successfully on `2026-04-04`
- The exact reviewed head now also has fresh green repo-hosted Release workflow evidence:
  - push run `23982213953` completed successfully on `2026-04-04`
  - `prepare-release`, `publish-with-provenance`, and `post-publish-verify` all completed successfully
  - actual npm publish and tag creation were intentionally skipped because this was a push run, not `workflow_dispatch` with `publish=true`
- The previous repo-hosted nightly blocker is closed:
  - `Nightly Full Parity` run `23981223900` completed successfully on `2026-04-04`
  - that green nightly run reviewed commit `4dbd7b339a58f0ca349ba18d2330a5da50edbe33`
- The current nightly evidence is still materially representative of the reviewed head.
  - Inference: `git diff --name-only 4dbd7b3..850b5ab` shows only release-workflow, release-artifact, release-doc, and release-script changes after the green nightly run; no shipped runtime, parser, or parity-test files changed in that range.
- The migration tracker no longer reports unresolved `P0` or missing reference files:
  - `docs/test-migration-status.md` now reports `51` files passing via ported upstream file, `15` with documented port gaps, and `16` via local analogue only
  - the remaining unresolved inventory is down to `3` partial files, `0` missing files, `16` blocked files, and `0` remaining `P0` files not yet passing via a ported upstream file or local analogue
- The platform closeout tree is now closed through `ASE-42`:
  - `ASE-15`, `ASE-34`, and `ASE-35` through `ASE-42` are all already `Done`

## Current Evidence Snapshot

| Area                                        | Current state | Evidence                                                                                                                       | Audit implication                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact-head release-hardening CI subset      | `closed`      | GitHub Actions run `23982213956` passed on `master@850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84`                                   | The current head has fresh repo-hosted evidence for `verify-test-migration-status`, `verify-toolchain`, `verify-clean-build`, `verify-pack`, `verify-exports`, `verify-dependency-policy`, `verify-api-surface`, `verify-release-metadata`, and `report-coverage`. |
| Exact-head release workflow provenance path | `closed`      | GitHub Actions run `23982213953` passed on `master@850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84`                                   | The repository now has repo-hosted `prepare-release`, `publish-with-provenance`, and `post-publish-verify` evidence for the reviewed head.                                                                                                                         |
| Repo-hosted nightly full-parity evidence    | `closed`      | GitHub Actions run `23981223900` passed on `4dbd7b339a58f0ca349ba18d2330a5da50edbe33`; later diff to `850b5ab` is release-only | The prior stale nightly blocker is gone, and the post-nightly changes do not alter shipped runtime or parity surfaces.                                                                                                                                             |
| Migration tracker and reference inventory   | `closed`      | `docs/test-migration-status.md`                                                                                                | There are no remaining unresolved `P0` files and no missing files in the tracked frozen-reference inventory.                                                                                                                                                       |
| Platform closeout mapping                   | `closed`      | OpenASE ticket list for `ASE-15`, `ASE-34`, and `ASE-35` through `ASE-42`                                                      | The execution tree this report depends on is complete and no longer waiting on upstream child work.                                                                                                                                                                |

## Remaining Blocking Gaps

| Gap family                                                                   | Current status                   | Evidence                                                                                                                           | Release implication                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production dependency advisory `1115805` (`lodash-es` via `mermaid@11.11.0`) | `still blocking trusted release` | `config/dependency-policy.json`, `docs/dependency-policy.md`, `docs/release-policy.md`, and `pnpm verify:dependency-policy` output | The repository's own reviewed policy still says not to cut the first trusted release until the shipped graph no longer resolves `lodash-es < 4.18.0`, even though the gate records the advisory as an approved exception. |
| Release checklist input mismatch for `svelte-streamdown@3.0.1`               | `still blocking trusted release` | `package.json` is `3.0.1`, but `CHANGELOG.md` has no `3.0.1` section and there is no matching tag in the repository                | The current candidate still fails the documented release-input checklist before a trusted publish can start.                                                                                                              |

No separate repo-hosted nightly, migration, or release-workflow evidence blocker remains in the current evidence set.

The committed `artifacts/release/*.json` bundle should not be treated as the exact-head source of truth for this audit:

- those committed files still reflect the earlier local metadata flow around `f252ece41036e61f47f6b7882684c3acba59861b`
- the exact-head source of truth is the repo-hosted Release workflow run `23982213953`

## Decision

Decision: `NO-GO` for the first trusted release of `svelte-streamdown@3.0.1`.

Reasoning:

1. The stale blockers from the previous audit are now closed.
   The reviewed head has fresh green repo-hosted CI and Release workflow runs, the latest repo-hosted nightly parity run is green, and the migration tracker no longer reports unresolved `P0` or missing files.
2. The remaining dependency-policy blocker is still explicit in the repository's own reviewed policy.
   `pnpm verify:dependency-policy` passes because the production advisory is formally recorded, but both `config/dependency-policy.json` and `docs/release-policy.md` still classify that same advisory as blocking the first trusted release.
3. The current versioned release inputs are not complete.
   `package.json` is already at `3.0.1`, but the required matching changelog entry is missing from `CHANGELOG.md`, so the release checklist is not yet satisfied for the candidate version.
4. The current `NO-GO` is not a parity-evidence failure.
   The latest green nightly parity run plus the zero-`P0` / zero-missing migration tracker mean the parity side of the prior release audit is no longer the reason this closeout stays red.

## Platform Status Alignment

- `ASE-15` and `ASE-34` are already `Done`, and that is now consistent with the completed child tree beneath them.
- `ASE-43` is the only remaining open closeout ticket in this chain; after this document synchronization lands, no further umbrella-status correction is needed.

## Re-Audit Trigger

Run the next release review only after both of the following are true:

1. The reviewed `lodash-es` production advisory is removed from the shipped graph, or a later reviewed policy decision explicitly reclassifies it as non-blocking for the first trusted release.
2. The release candidate version in `package.json` has a matching changelog entry before the publish workflow is used for a trusted release.
