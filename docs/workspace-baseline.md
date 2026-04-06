# Workspace Baseline

## Repo Layout

- repo root: publishable `svelte-streamdown` package, verification scripts, docs, and parity/test harnesses
- `packages/*`: publishable workspace packages that can be packed and smoke-tested independently
- `packages/remend`: first standalone workspace package, built from the shared incomplete-markdown repair source

## Shared Conventions

- workspace membership is declared in `pnpm-workspace.yaml`
- TypeScript-only packages extend `config/tsconfig.package.json`
- tsup-based packages reuse `config/tsup-package.mjs`
- publishable package metadata for verification lives in `scripts/lib/publishable-packages.mjs`
- packed artifacts must stay under `dist/` plus explicit root metadata files such as `README.md`, `LICENSE`, and `package.json`

## Local Linking Workflow

- run `pnpm install` once at repo root so workspace packages are linked together
- build standalone packages with `pnpm build:packages`
- build the root package plus workspace packages with `pnpm build`
- pack and smoke-test publishable packages with `pnpm verify:pack`, `pnpm verify:exports`, and `pnpm verify:workspace-smoke`

## Current Boundary Strategy

- the root `svelte-streamdown` package keeps the canonical runtime source for now so existing exports and consumer entrypoints stay stable
- focused workspace packages can wrap that canonical source and ship their own dist output, avoiding duplicated pack/link/verify wiring while later extraction tickets move source ownership package by package
- `packages/remend` is the first example of this pattern and establishes the baseline for future standalone plugin or parser packages
