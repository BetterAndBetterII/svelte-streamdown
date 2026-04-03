# Release Policy

This document defines the release policy for `svelte-streamdown` under `PLAN.md` issue `P0-04`.

Its purpose is to make releases trusted, reproducible, and reviewable instead of relying on maintainer judgment at publish time.

## Scope

- Package in scope: `svelte-streamdown`
- Default release branch: `master`
- Reference baseline for parity work: [docs/reference-version.md](./reference-version.md)
- Related plan items:
  - `P0-04`: define the policy in this document
  - `P1-01`: pin toolchain versions
  - `P1-02`: add clean build verification
  - `P1-03`: verify package contents
  - `P1-04`: add export surface verification
  - `P1-05`: add dependency and license audit gate
  - `P1-06`: add release provenance and artifact metadata

## Trusted Release Definition

A release counts as trusted only when all of the following are true:

1. The published package is built from a reviewed commit on `master`.
2. The exact release commit passed every required CI job listed in this document.
3. The tarball contents and export surface were verified from the built package, not assumed from source files.
4. The package was published from repository-controlled automation with registry provenance enabled.
5. The published version can be rolled back operationally through deprecation, dist-tag changes, or a hotfix release without rewriting history.

If any item above is false, the release is not trusted and must not be presented as release-ready.

## Current Readiness Gate

As of the commit that introduced this policy, this repository is not yet authorized for a trusted release.

The blocker is explicit: the repository still has approved dependency-policy exceptions, and the npm package must be configured for trusted publishing before the first trusted release.

Until those gates exist and are passing in CI:

- no maintainer may cut a release from a local workstation
- no maintainer may treat `npm publish` as an acceptable substitute for CI publishing
- any release attempt is classified as an untrusted/manual release

## Release Authority

Trusted releases may be cut only by:

- the repository owner `BetterAndBetterII`; or
- a future maintainer explicitly added to this document in a reviewed PR, provided that maintainer has both:
  - GitHub permission to run the release workflow on `BetterAndBetterII/svelte-streamdown`
  - npm permission to publish `svelte-streamdown`

Authority to merge code is not, by itself, authority to publish a release.

## Required Release Inputs

Before a release starts, the release commit must include:

- a merged PR or equivalent reviewed change set on `master`
- an updated `package.json` version for the intended release
- an updated `CHANGELOG.md` entry for that version
- any required parity evidence for the shipped behavior change
- no uncommitted workspace changes on the release runner

The release commit must be tagged as `v<package-version>` after publish verification succeeds.

## Required CI Jobs

Every trusted release must be blocked on the exact jobs below.

| Required job               | Purpose                                                                                        | Minimum command or evidence                                                     | Plan mapping  |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| `lint-and-format`          | Reject formatting drift before packaging                                                       | `npm run lint`                                                                  | baseline gate |
| `typecheck`                | Reject Svelte/TypeScript contract regressions                                                  | `npm run check`                                                                 | baseline gate |
| `unit-tests`               | Reject behavioral regressions covered by the current test suite                                | `npm test`                                                                      | baseline gate |
| `build-package`            | Ensure the package builds from source on the release runner                                    | `npm run build`                                                                 | baseline gate |
| `verify-toolchain`         | Ensure CI and local release docs use the same pinned Node and package-manager versions         | `pnpm verify:toolchain` plus `.nvmrc`, `packageManager`, `volta`, and CI config | `P1-01`       |
| `verify-clean-build`       | Prove a clean checkout builds deterministically and does not depend on unstaged files          | clean install, build, and generated-file diff check                             | `P1-02`       |
| `verify-pack`              | Prove the tarball contains only policy-approved files                                          | `scripts/verify-pack.mjs` plus `npm pack` inspection                            | `P1-03`       |
| `verify-exports`           | Prove every declared export resolves from the packed tarball                                   | `scripts/verify-exports.mjs` plus temp-project smoke import                     | `P1-04`       |
| `verify-dependency-policy` | Prove high-severity dependency advisories and production-license drift are explicitly reviewed | `scripts/verify-dependency-policy.mjs` plus `pnpm audit` / `pnpm licenses list` | `P1-05`       |
| `verify-release-metadata`  | Prove the release workflow emits traceable tarball metadata before publish                     | `scripts/verify-release-metadata.mjs` plus `artifacts/release/` contract        | `P1-06`       |
| `publish-with-provenance`  | Publish from CI with npm provenance enabled and preserve the release commit SHA                | release workflow logs plus npm provenance record                                | release gate  |
| `post-publish-verify`      | Verify the registry artifact matches the reviewed commit and intended version                  | install published package, inspect metadata, verify provenance, confirm tag     | release gate  |

Rules:

- All required jobs must pass on the exact commit being published.
- Re-running only a subset of jobs is not sufficient.
- A later green run on a different commit does not satisfy this requirement.
- Required jobs may be split across workflows, but branch protection must require all of them.

## Release Checklist

The release checklist is mandatory and must be satisfied in order.

### 1. Preflight

- Confirm the release source is the current `master` head.
- Confirm the working tree is clean on the release runner.
- Confirm `package.json` version and `CHANGELOG.md` agree.
- Confirm the release PR or merge commit references the relevant issue and plan item.
- Confirm no blocking security or release incidents are open against the target version.

### 2. Gate Validation

- Wait for every required CI job in this policy to pass.
- Review the `npm pack` output or the future `verify-pack` job output.
- Review export verification evidence from the future `verify-exports` job.
- Review dependency audit and license inventory evidence from `verify-dependency-policy`.
- Review `artifacts/release/` metadata and attestation evidence from `verify-release-metadata`.
- Confirm the release runner uses the pinned toolchain required by `P1-01`.

### 3. Publish

- Publish only from repository-controlled CI.
- Enable npm provenance for the publish step.
- Publish exactly one version for the release commit.
- Create the git tag `v<package-version>` only after publish succeeds.

### 4. Post-Publish Verification

- Install the published version from the registry in a clean temp environment.
- Verify the package name and version match the release commit.
- Verify the published tarball contents match the reviewed pack evidence.
- Verify the published tarball hash matches `artifact-metadata.json`.
- Verify npm provenance links the published artifact back to the release workflow and commit SHA.
- Verify the GitHub tag points to the same commit that produced the published package.

### 5. Recordkeeping

- Update the issue or PR work record with the release version, commit SHA, and verification summary.
- If a GitHub Release is used, link it to the same version tag and changelog entry.

## Provenance And Package Verification Policy

Package verification is release-blocking.

Minimum expectations:

1. The release must be published from CI, not from a developer shell.
2. The publish job must use npm provenance so the registry artifact is traceable to the workflow run and commit SHA.
3. The package tarball must be inspected from `npm pack` output before publish.
4. The tarball must contain only intended release files.
5. The release workflow must emit `build-metadata.json`, `artifact-metadata.json`, and `provenance-metadata.json` for the tarball being reviewed.
6. Every declared export in `package.json` must exist in the built tarball and be importable from a clean temp project.
7. High-severity dependency advisories and production-license exceptions must be explicitly reviewed through the dependency policy gate.

A release fails policy if any of the following is observed:

- test files, fixtures, scripts, or app-only files leak into the published tarball
- a declared export points to a missing or unbuilt file
- the published package cannot be traced back to the reviewed commit
- a maintainer publishes manually with a long-lived npm token instead of trusted CI publishing
- an unapproved dependency advisory or production-license issue is present in the release gate output

## Rollback Policy

Rollback does not mean rewriting git history or republishing the same npm version.

If a bad release is detected:

1. Freeze further releases until the incident is understood.
2. Open or update the tracking issue with the bad version, commit SHA, detection signal, and impact.
3. If npm policy still allows it and unpublish is appropriate, unpublish within the allowed window; otherwise do not force history.
4. Remove the bad version from the `latest` path by changing dist-tags or by publishing a superseding hotfix release.
5. Deprecate the bad version on npm with a message that points users to the safe replacement.
6. Tag the incident outcome in the changelog or release notes so downstream consumers can audit it later.
7. Add or update a regression test or release gate before the replacement release is cut.

The rollback is complete only when:

- users can no longer install the bad version through the default tag path; and
- the replacement release or deprecation notice is visible in npm metadata.

## Evidence Sources

This policy is grounded in the current repository and the frozen reference implementation:

- local package metadata and release-facing scripts: `package.json`
- current roadmap and future release-hardening tasks: `PLAN.md`
- release artifact verification contract: `docs/release-artifact-verification.md`
- frozen upstream release workflow example: `references/streamdown/.github/workflows/release.yml`
- frozen upstream CI gate examples: `references/streamdown/.github/workflows/test.yml`
- frozen upstream version-governance example: `references/streamdown/.github/workflows/verify-changesets.yml`

## Decision Rule

Reviewers should reject a release as non-compliant if they cannot point to concrete evidence for each required checklist item and CI gate in this document.

This document is intentionally stricter than the repository's current automation. The gap is expected. Closing that gap is the purpose of `P1-01` through `P1-04`.
