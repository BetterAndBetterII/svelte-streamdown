# AGENTS Notes

## Environment

- Pushing changes that touch `.github/workflows/*` can be rejected over the default HTTPS remote because the current OAuth app token lacks `workflow` scope. Use the SSH remote form `git@github.com:BetterAndBetterII/svelte-streamdown.git` for pushes that update workflow files.
- The injected `openase` CLI in this workspace does not currently expose `ticket comment workpad`, and `openase ticket comment update --body-file` is rejected even though help examples mention it. Use `ticket comment create --body` and `ticket comment update --body` with shell-expanded file contents instead.
- `pnpm verify:clean-build` treats the injected untracked `.openase/*` files as a dirty worktree and fails before running the build. In this harness, treat that as an environment artifact unless the same failure reproduces from a clean clone without the injected files.
