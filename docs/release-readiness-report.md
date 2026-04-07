# Release Readiness Report

This document records the `ASE-46` strict-closeout synchronization refresh of release readiness for `svelte-streamdown`.

Audit date: `2026-04-06`

Supersedes:

- the `ASE-43` final closeout refresh captured earlier in this file on `2026-04-04`
- the `ASE-33` re-audit captured earlier in this file on `2026-04-04`
- the earlier `ASE-21` and `P5-05` audits captured in this file on `2026-04-04` and `2026-04-03`

Audit target:

- Repository: `PacificStudio/streamdown-svelte`
- Release candidate branch/head reviewed: `master@7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`
- Frozen parity target: `vercel/streamdown@5f6475139a87dee8af08fcf7b01475292bc064d2`
- Tracking issue: `#87`
- Closeout ticket: `ASE-46`

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
- Current strict-closeout evidence:
  - `docs/parity-matrix.md`
  - `docs/reference-tests-inventory.md`
  - `tests/contracts/parity-boundaries.spec.ts`
- Committed evidence bundles still present in the repository:
  - `artifacts/nightly/summary/summary.md`
  - `artifacts/nightly/summary/status.json`
  - `artifacts/nightly/dependency-audit/summary.md`
  - `artifacts/nightly/dependency-audit/status.json`
  - `artifacts/release/build-metadata.json`
  - `artifacts/release/artifact-metadata.json`
  - `artifacts/release/provenance-metadata.json`
- Current GitHub Actions evidence gathered on `2026-04-06`:
  - `gh run list --workflow "CI" --limit 5`
  - `gh run view 24024875608 --json url,jobs,headSha,displayTitle,event,conclusion,status,createdAt,updatedAt`
  - `gh run list --workflow "Nightly Full Parity" --limit 5`
  - `gh run view 24020166592 --json url,jobs,headSha,displayTitle,event,conclusion,status,createdAt,updatedAt`
  - `gh run list --workflow "Release" --limit 5`
  - `gh run view 24024875591 --json url,jobs,headSha,displayTitle,event,conclusion,status,createdAt,updatedAt`
- Current platform status evidence gathered on `2026-04-06`:
  - `./.openase/bin/openase ticket list`
  - `./.openase/bin/openase ticket list | jq '.tickets[] | select(.identifier=="ASE-15" or .identifier=="ASE-34" or .identifier=="ASE-44" or .identifier=="ASE-45" or .identifier=="ASE-46" or .identifier=="ASE-47" or .identifier=="ASE-48")'`
- Local repo-state checks gathered on `2026-04-06`:
  - `git diff --name-only 833200338632d68029b5a25b1898ecd48b173e1d..7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`
  - `git diff --name-only 850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84..7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`

## What Changed Since The Prior Audit

- The reviewed `master` head advanced from `850b5ab5f3f1d7a99aa44fb0ca1d6f168f282d84` to `7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`.
- The strict-closeout tree is now fully landed on `master`:
  - `ASE-47` merged at `origin/master@e96fa39`
  - `ASE-45` merged at `origin/master@d6cbee9`
  - the umbrella cleanup sync merged at `origin/master@0e0aaea`
  - `ASE-48` merged at `origin/master@7ef35ae`
- The exact reviewed head now has fresh green repo-hosted CI evidence:
  - push run `24024875608` completed successfully on `2026-04-06`
- The exact reviewed head now also has fresh green repo-hosted Release workflow evidence:
  - push run `24024875591` completed successfully on `2026-04-06`
  - `prepare-release`, `publish-with-provenance`, and `post-publish-verify` all completed successfully
  - actual npm publish and tag creation were intentionally skipped because this was a push run, not `workflow_dispatch` with `publish=true`
- The latest repo-hosted nightly parity run is green, but it now predates the strict-closeout head:
  - `Nightly Full Parity` run `24020166592` completed successfully on `2026-04-06`
  - that green nightly run reviewed commit `833200338632d68029b5a25b1898ecd48b173e1d`
  - `git diff --name-only 8332003..7ef35ae` now includes parser, rendering, and parity-test changes from the strict-closeout branch, so the nightly evidence is no longer exact-head coverage for the reviewed release candidate
- The migration tracker now fully closes the former partial backlog:
  - `docs/test-migration-status.md` now reports `57` files passing via ported upstream file, `12` with documented port gaps, and `16` via local analogue only
  - the remaining unresolved inventory is down to `0` partial files, `0` missing files, `16` blocked files, and `0` remaining `P0` files not yet passing via a ported upstream file or local analogue
- The parity and platform closeout mappings now align with the landed evidence:
  - `docs/parity-matrix.md` leaves no `tracked_follow_up` or `missing` rows and keeps the canonical unresolved capability backlog empty
  - `ASE-15`, `ASE-34`, `ASE-44`, `ASE-45`, `ASE-47`, and `ASE-48` are all already `Done`

## Current Evidence Snapshot

| Area                                        | Current state                           | Evidence                                                                                                                                                  | Audit implication                                                                                                                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact-head release-hardening CI subset      | `closed`                                | GitHub Actions run `24024875608` passed on `master@7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`                                                              | The reviewed head has fresh repo-hosted evidence for `verify-test-migration-status`, `verify-toolchain`, `verify-clean-build`, `verify-pack`, `verify-exports`, `verify-dependency-policy`, `verify-api-surface`, `verify-release-metadata`, and `report-coverage`. |
| Exact-head release workflow provenance path | `closed`                                | GitHub Actions run `24024875591` passed on `master@7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`                                                              | The repository now has repo-hosted `prepare-release`, `publish-with-provenance`, and `post-publish-verify` evidence for the reviewed head.                                                                                                                          |
| Repo-hosted nightly full-parity evidence    | `stale for exact-head audit`            | GitHub Actions run `24020166592` passed on `833200338632d68029b5a25b1898ecd48b173e1d`; later diff to `7ef35ae` includes parser/rendering closeout changes | The nightly lane is green again, but this audit cannot treat it as exact-head parity proof for the post-closeout release candidate without a fresh run on the reviewed head or a later equivalent reviewed head.                                                    |
| Migration tracker and reference inventory   | `closed`                                | `docs/test-migration-status.md`; `docs/reference-tests-inventory.md`                                                                                      | There are no remaining unresolved `P0`, `partial`, or missing files in the tracked frozen-reference inventory, and the remaining backlog is fully catalogued as reviewed accepted drift.                                                                            |
| Strict-closeout parity accounting           | `closed`                                | `docs/parity-matrix.md`; `tests/contracts/parity-boundaries.spec.ts`                                                                                      | The canonical unresolved capability backlog is empty, no stale partial row remains implicit, and the matrix now records only `done` or approved `different_by_design` rows.                                                                                         |
| Platform closeout mapping                   | `only follow-on sync ticket still open` | OpenASE ticket list for `ASE-15`, `ASE-34`, `ASE-44`, `ASE-45`, `ASE-46`, `ASE-47`, and `ASE-48`                                                          | All upstream strict-closeout tickets are already complete; `ASE-46` is the only non-`Done` follow-on ticket because the final documentation/platform synchronization is still being worked through review.                                                          |

## Remaining Blocking Gaps

| Gap family                                                                   | Current status                                 | Evidence                                                                                                                                                                         | Release implication                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production dependency advisory `1115805` (`lodash-es` via `mermaid@11.11.0`) | `still blocking trusted release`               | `config/dependency-policy.json`, `docs/dependency-policy.md`, `docs/release-policy.md`, and `pnpm verify:dependency-policy` output                                               | The repository's own reviewed policy still says not to cut the first trusted release until the shipped graph no longer resolves `lodash-es < 4.18.0`, even though the gate records the advisory as an approved exception.                            |
| Release checklist input mismatch for `svelte-streamdown@3.0.1`               | `still blocking trusted release`               | `package.json` is `3.0.1`, but `CHANGELOG.md` has no `3.0.1` section and there is no matching tag in the repository                                                              | The current candidate still fails the documented release-input checklist before a trusted publish can start.                                                                                                                                         |
| Exact-head repo-hosted nightly parity evidence after strict closeout         | `needs refresh before a parity-backed GO call` | GitHub Actions run `24020166592` passed on `833200338632d68029b5a25b1898ecd48b173e1d`, but `git diff --name-only 8332003..7ef35ae` includes parser/rendering/test evidence files | A future parity-backed `GO` decision should rerun the nightly parity workflow on the exact post-closeout head, because the latest green nightly run predates shipped parser/rendering changes that landed after the strict-closeout branches merged. |

The committed `artifacts/release/*.json` bundle should not be treated as the exact-head source of truth for this audit:

- those committed files still reflect the earlier local metadata flow around `f252ece41036e61f47f6b7882684c3acba59861b`
- the exact-head source of truth is the repo-hosted Release workflow run `24024875591`

## Decision

Decision: `NO-GO` for the first trusted release of `svelte-streamdown@3.0.1`.

Reasoning:

1. The strict-closeout backlog itself is now actually closed.
   The reviewed docs show `Partial local coverage = 0`, the canonical unresolved capability backlog is empty, and all upstream strict-closeout tickets required by `ASE-46` are already complete.
2. The exact reviewed head has fresh repo-hosted CI and Release workflow evidence.
   GitHub Actions runs `24024875608` and `24024875591` both passed on `master@7ef35ae4a6f992ccd454b2233ae7ca70fb64dedf`, so the repo-hosted release-hardening and provenance paths are current for the reviewed head.
3. The trusted-release blockers recorded in repository policy still stand.
   `pnpm verify:dependency-policy` passes because advisory `1115805` is reviewed, but both `config/dependency-policy.json` and `docs/release-policy.md` still classify that advisory as blocking the first trusted release; `CHANGELOG.md` also still lacks the required `3.0.1` entry.
4. A future parity-backed `GO` call still needs a fresh exact-head nightly run.
   The latest green nightly run is on `833200338632d68029b5a25b1898ecd48b173e1d`, and the later diff to `7ef35ae` includes parser/rendering closeout changes, so the nightly evidence is no longer exact-head parity proof for this post-closeout candidate.

## Platform Status Alignment

- `ASE-15`, `ASE-34`, `ASE-44`, `ASE-45`, `ASE-47`, and `ASE-48` are already `Done`, and that now matches the landed strict-closeout evidence tree.
- `ASE-46` is the only remaining non-`Done` ticket in this chain, and it exists solely to land this final documentation/platform synchronization before the workflow can close the tree cleanly.

## Re-Audit Trigger

Run the next release review only after all of the following are true:

1. The reviewed `lodash-es` production advisory is removed from the shipped graph, or a later reviewed policy decision explicitly reclassifies it as non-blocking for the first trusted release.
2. The release candidate version in `package.json` has a matching changelog entry before the publish workflow is used for a trusted release.
3. The repo-hosted nightly parity workflow is rerun successfully on the exact post-closeout head, or on a later reviewed candidate head whose parity-sensitive diff is explicitly re-audited.
