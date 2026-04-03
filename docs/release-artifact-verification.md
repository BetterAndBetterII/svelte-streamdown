# Release Artifact Verification

This document defines the concrete verification flow for `PLAN.md` issue `P1-06`.

Its purpose is to make each published `svelte-streamdown` artifact traceable to:

- the exact git commit on `master`
- the exact GitHub Actions release run that produced the tarball
- the tarball digest reviewed before publish
- the attestation or provenance evidence emitted during release

## Generated Files

The release workflow writes the following files into `artifacts/release/` before upload:

- `build-metadata.json`
- `artifact-metadata.json`
- `provenance-metadata.json`
- `<package-name>-<package-version>.tgz`
- `<package-name>-<package-version>.tgz.sha256`

These files are emitted by `pnpm release:metadata -- --output-dir artifacts/release`.

## Metadata Contract

### `build-metadata.json`

Must record:

- package name and version
- source repository
- source commit SHA
- source ref or ref name
- GitHub Actions workflow, job, run id, and run URL when available
- Node version
- pnpm version
- platform and architecture

### `artifact-metadata.json`

Must record:

- package name and version
- tarball filename
- tarball byte size
- tarball `sha256`
- tarball `sha512`
- tarball `integrity`

### `provenance-metadata.json`

Must record:

- the tarball subject name and `sha256`
- whether GitHub attestation is supported for the generating environment
- the release workflow path used to sign the attestation
- the attestation URL and bundle path after the workflow emits them
- whether npm publish was requested and whether publish completed

## Verification Flow

### 1. Review the release run

- Open the GitHub Actions run referenced by `build-metadata.json.source.runUrl`.
- Confirm the run executed `.github/workflows/release.yml`.
- Confirm the run built the exact `build-metadata.json.source.commitSha`.

### 2. Verify the tarball hash

- Download `artifacts/release/` from the release run.
- Run `sha256sum -c <package-name>-<package-version>.tgz.sha256`.
- Confirm the digest matches `artifact-metadata.json.tarball.sha256`.

### 3. Verify the GitHub attestation

- Run `gh attestation verify ./artifacts/release/<package-name>-<package-version>.tgz --repo BetterAndBetterII/svelte-streamdown`.
- Confirm the verified subject digest matches `provenance-metadata.json.subject.sha256`.
- Confirm the attestation signer workflow is `.github/workflows/release.yml`.

### 4. Verify publish provenance when the workflow published

When `workflow_dispatch` runs with `publish=true`, the workflow publishes the already-hashed tarball through npm trusted publishing.

Reviewers must confirm:

- `provenance-metadata.json.npmProvenance.published` is `true`
- the published package version matches `artifact-metadata.json.package.version`
- the npm package page shows provenance for the GitHub Actions release run

### 5. Verify commit and tag alignment

If the workflow published:

- confirm the git tag `v<package-version>` points to `build-metadata.json.source.commitSha`
- confirm the tag was created by the same release run that produced the metadata bundle

## Local Gate

Before changing the release workflow, run:

```bash
pnpm verify:release-metadata
```

This gate packs the package in a temporary directory, emits the same metadata file set, and fails if:

- any required metadata file is missing
- the tarball digests drift from the recorded values
- the recorded commit SHA does not match the current checkout
- the provenance subject does not match the generated tarball

## Relationship To Release Policy

This document provides the concrete verification evidence required by:

- [docs/release-policy.md](./release-policy.md)
- `PLAN.md` issue `P1-06`
