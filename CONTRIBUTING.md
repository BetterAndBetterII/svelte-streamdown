# Contributing to Svelte Streamdown

This repository is tracking parity against the frozen `vercel/streamdown` reference. New fixes need durable evidence, not only a code change.

## Setup

1. Install the pinned toolchain from `.nvmrc` and `package.json`.
2. Install dependencies:

```bash
pnpm install
```

3. Run the baseline checks before you start changing behavior:

```bash
pnpm check
pnpm test
```

## Regression Intake Workflow

Every bug should leave behind a reproducible asset that can fail again in CI if the bug comes back.

1. Start from a minimal markdown reproduction.
   Use the bug report form and trim the markdown down to the smallest input that still shows the problem.

2. Pick the smallest durable regression asset before changing the implementation.
   Use a shared parity fixture when the bug should match the frozen Streamdown reference in parser, rendering, or browser parity behavior.
   Use a targeted unit, browser, or Playwright test when the behavior is local-only, prop-specific, or too narrow for the shared parity fixture suite.
   Update an existing ported upstream test when the bug already maps cleanly to a reference regression.

3. Keep the fixture or test minimal.
   One bug should usually map to one fixture or one test case.
   Remove unrelated markdown noise instead of freezing a large sample that is hard to understand.

## Parity Fixture Naming Convention

Shared parity fixtures live in `fixtures/parity/markdown/` or `fixtures/parity/interactions/`.

- Name each file `NN-short-description.md`.
- `NN` is the next available two-digit sequence in that directory.
- `short-description` is lowercase, hyphen-separated, and describes the behavior instead of the issue number, user, or temporary workaround.
- Keep the file name stable after review because the file name is also the public fixture ID.
- Register every new shared parity fixture in `fixtures/parity/fixture-registry.ts` with the exact same file name.

Examples:

- `fixtures/parity/markdown/15-nested-details-table.md`
- `fixtures/parity/interactions/16-streaming-link-confirmation.md`

## Pull Request Expectations

Bug-fix PRs must add or update a regression fixture or test. Use the PR template to point reviewers to the exact path that captures the bug.

Reviewers should treat a missing regression asset as a blocker when:

- the PR is marked as a bug fix
- the change alters parser, rendering, security, streaming, or interaction behavior
- the issue description includes a reproducible failure

## Validation

Run the narrowest commands that prove the change, then include them in the PR description. Common checks are:

```bash
pnpm lint
pnpm check
pnpm test
pnpm test:contracts
pnpm test:playwright:parity
```

For parity fixture additions, also make sure the new fixture is wired into the shared registry and the relevant parity suite still passes.
