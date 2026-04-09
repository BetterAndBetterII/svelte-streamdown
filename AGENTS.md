# AGENTS Notes

## Environment

- Pushing changes that touch `.github/workflows/*` can be rejected over the default HTTPS remote because the current OAuth app token lacks `workflow` scope. Use the SSH remote form `git@github.com:PacificStudio/streamdown-svelte.git` for pushes that update workflow files.
- The injected `openase` CLI in this workspace does not currently expose `ticket comment workpad`, and `openase ticket comment update --body-file` is rejected even though help examples mention it. Use `ticket comment create --body` and `ticket comment update --body` with shell-expanded file contents instead.
- `pnpm verify:clean-build` treats the injected untracked `.openase/*` files as a dirty worktree and fails before running the build. In this harness, treat that as an environment artifact unless the same failure reproduces from a clean clone without the injected files.
- The automation workspace can omit `references/streamdown/**`. When that snapshot is missing, `tests/contracts/parser-ir.spec.ts` and `tests/contracts/parser-parity.spec.ts` fail before exercising local code because they import `references/streamdown/packages/remend/src/index.ts`.
- In the injected `zsh` shell, `status` is a readonly special variable. When translating CI shell snippets locally, avoid assigning to `status`; use a different name such as `suite_status` or run the snippet under `bash`.
- Browser-mode `vitest` runs can fail in this workspace with `EMFILE ... watch 'config/coverage-suites.mjs'` even under `--run`; setting `CHOKIDAR_USEPOLLING=1` around the affected `pnpm exec vitest --run ...svelte.test.ts` invocation avoids the watcher exhaustion and lets the suite complete.
- Running a single `pnpm exec vitest run ...` command that mixes server tests with browser `.svelte.test.ts` files can hit `EMFILE` watcher limits in this harness. Run the server and client Vitest projects in separate commands instead.
- Browser-mode `pnpm vitest` can hit `EMFILE` from Vite file watchers in this harness even when `ulimit -n` is high. Set `CHOKIDAR_USEPOLLING=1` for browser-targeted Vitest runs to avoid the watcher exhaustion.
- Running server and browser Vitest commands in parallel can race on `.svelte-kit/tsconfig.json` and produce `Unexpected end of file in JSON`. In this harness, run the server and client validations sequentially instead of concurrently.
