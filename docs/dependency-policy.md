# Dependency Policy

This document defines the dependency and license gate for `svelte-streamdown` under `PLAN.md` issue `P1-05`.

Its purpose is to make dependency risk and license drift reviewable before release, instead of discovering them ad hoc during publish.

## Scope

- Enforcement script: `scripts/verify-dependency-policy.mjs`
- Machine-readable policy: `config/dependency-policy.json`
- CI entrypoint: `pnpm verify:dependency-policy`
- Current license inventory scope: production dependency graph (`pnpm licenses list --json --prod`)
- Current security audit scopes:
  - production dependency graph (`pnpm audit --json --prod`)
  - development dependency graph (`pnpm audit --json --dev`)

## Gate Rules

The dependency gate is release-blocking.

The gate fails when any of the following is true:

- a production advisory at or above the configured threshold is not explicitly approved in `config/dependency-policy.json`
- a development advisory at or above the configured threshold is not explicitly approved in `config/dependency-policy.json`
- a production package reports a license that is neither allowlisted nor explicitly approved in `config/dependency-policy.json`
- the policy file itself is malformed or incomplete

The gate does not silently ignore baseline risk. Existing exceptions remain visible in the JSON report and must be reviewed deliberately.

## Severity Threshold Policy

Current thresholds:

- `prod` audit threshold: `high`
- `dev` audit threshold: `high`

Rationale:

- `high` and `critical` advisories are severe enough to block trusted release readiness by default.
- `moderate`, `low`, and `info` advisories are still inventoried by `pnpm audit`, but they do not fail the current gate unless the threshold is tightened in a reviewed PR.
- production and development graphs are evaluated separately so the repository can distinguish shipped-package risk from tooling-chain risk without flattening them into one opaque report.

## License Policy

Current production allowlist:

- `MIT`
- `ISC`
- `Apache-2.0`
- `BSD-3-Clause`
- `(MPL-2.0 OR Apache-2.0)`
- `Unlicense`

Any other production license string is treated as release-blocking unless there is a reviewed package exception in `config/dependency-policy.json`.

`Unknown` is not implicitly acceptable. It must either be resolved upstream or documented with concrete evidence in the exception list.

## Exception Handling

Exceptions are stored only in `config/dependency-policy.json`.

Every exception must include:

- the exact advisory ID or package name plus license string
- a concrete reason for acceptance
- a review deadline or removal trigger
- for license exceptions, an evidence path showing why the missing SPDX metadata is acceptable

Rules for adding an exception:

1. Prefer upgrading or removing the dependency first.
2. If that is out of scope, add the narrowest possible exception in `config/dependency-policy.json`.
3. Record the reason and removal trigger in the same PR as the exception.
4. Do not approve wildcard exceptions or severity-wide suppressions.

Rules for removing an exception:

1. Upgrade the dependency or correct the metadata.
2. Re-run `pnpm verify:dependency-policy`.
3. Delete the obsolete exception entry in the same change.

## Current Approved Exceptions

Current baseline approvals are intentionally explicit:

- one production `high` advisory on `lodash-es`, inherited transitively through `mermaid`
- repository-baseline development `high` advisories in the current SvelteKit, Vite, Playwright, Wrangler, and Vitest tooling graph
- one production license metadata exception for `khroma`, whose installed package ships an MIT license file but omits SPDX metadata in `package.json`

The presence of an approval does not mean the issue is harmless. It means the issue is known, reviewable, and prevented from disappearing into CI noise until the dependency graph is upgraded.

## Validation Commands

- `pnpm verify:dependency-policy`
- `pnpm audit --json --prod`
- `pnpm audit --json --dev`
- `pnpm licenses list --json --prod`

Reviewers should reject the release gate if they cannot trace any reported exception back to a concrete entry in `config/dependency-policy.json`.
