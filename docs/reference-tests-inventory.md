# Reference Tests Inventory

This document inventories the frozen upstream reference tests required by `PLAN.md` issue `P2-01`.

Reference inputs:

- Upstream repository: `https://github.com/vercel/streamdown.git`
- Frozen commit: `5f6475139a87dee8af08fcf7b01475292bc064d2` (`5f64751`)
- Local mirror: `references/streamdown`
- Scope anchor: [docs/reference-version.md](./reference-version.md)
- Gap evidence: [docs/parity-matrix.md](./parity-matrix.md)
- Workflow-aligned ported-test evidence: `artifacts/nightly/ported-tests/summary.md`, `artifacts/nightly/ported-tests/junit.xml`, and `artifacts/nightly/summary/summary.md`

Scope rules used for this inventory:

- Included: executable files under `references/streamdown/packages/remend/__tests__/*`, `references/streamdown/packages/streamdown/__tests__/*`, and `references/streamdown/packages/streamdown-*/__tests__/*`
- Included separately as harness support: `setup.ts` files under those `__tests__` directories
- Excluded: fixture payload files such as `packages/streamdown/__tests__/__fixtures__/code-block-big-html.html`
- Excluded: `apps/test/*`, `apps/website/*`, and `__benchmarks__/*` because [docs/reference-version.md](./reference-version.md) marks them out of parity scope

## Status Semantics

| Status                       | Meaning                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `mapped_to_local_tests`      | The current repo already has a close local analogue, so the upstream file is ready for direct harness porting.                                  |
| `partial_local_coverage`     | Local tests or implementation cover part of the behavior, but the upstream file still contains parity assertions that are not encoded here yet. |
| `not_started`                | No meaningful local equivalent was found.                                                                                                       |
| `blocked_by_missing_surface` | A faithful port depends on public API, prop, plugin, or UI surface that does not exist yet in this repo.                                        |
| `support_file`               | Helper/setup file for a future ported suite, not a standalone parity test target.                                                               |

## Priority Semantics

| Priority | Meaning                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------- |
| `P0`     | Needed before claiming parser or security parity, or required for explicit P0 feature gaps.               |
| `P1`     | Important rendering, interaction, or plugin parity coverage after the P0 parser/security set.             |
| `P2`     | Coverage expansion, memo/perf, or framework-specific regression follow-up after the main surface matches. |

## Inventory Summary

| Source                            | Executable test files | Harness support files | Main follow-up bucket                                    |
| --------------------------------- | --------------------: | --------------------: | -------------------------------------------------------- |
| `packages/remend/__tests__`       |                    24 |                     0 | `P2-03`                                                  |
| `packages/streamdown/__tests__`   |                    73 |                     1 | `P2-04`, `P2-05`, later API parity issues                |
| `packages/streamdown-*/__tests__` |                     4 |                     1 | Plugin/API parity follow-up after package surface exists |
| Total                             |                   101 |                     2 | Phase 2 migration backlog                                |

## Remend Reference Tests

All `remend` files are parser-facing and feed `P2-03: Port remend Behavior Tests`.

| Reference file                                               | Area          | Priority | Migration status             | Current local evidence or blocker                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/remend/__tests__/basic-input.test.ts`              | `parser`      | `P0`     | `mapped_to_local_tests`      | Core block and inline parsing already exists in `src/tests/paragraph.test.ts` and `src/tests/heading.test.ts`.                                                                                                                                                                     |
| `packages/remend/__tests__/bold-italic.test.ts`              | `parser`      | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/bold-italic.test.ts`; triple-asterisk recovery and overlapping closer cases now run directly against local `parseIncompleteMarkdown`.                                                                                                               |
| `packages/remend/__tests__/bold.test.ts`                     | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/strong.test.ts`.                                                                                                                                                                                                                               |
| `packages/remend/__tests__/broken-markdown-variants.test.ts` | `regressions` | `P0`     | `ported_with_documented_gap` | Ported to `tests/ported/remend/broken-markdown-variants.test.ts`; current evidence now documents two remaining parser drifts in the local harness: strikethrough/italic closure ordering and inline-citation recovery interfering with nested incomplete-link fallback.            |
| `packages/remend/__tests__/code-blocks.test.ts`              | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/code.test.ts`.                                                                                                                                                                                                                                 |
| `packages/remend/__tests__/comparison-operators.test.ts`     | `regressions` | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/comparison-operators.test.ts`; local parser now matches the upstream `\\>` list-item escape contract.                                                                                                                                               |
| `packages/remend/__tests__/coverage-gaps.test.ts`            | `regressions` | `P1`     | `ported_with_documented_gap` | Ported to `tests/ported/remend/coverage-gaps.test.ts`; whitespace, emphasis, and HTML/link boundary coverage now run directly, while helper-only assertions and the upstream `linkMode` option surface still require a standalone `remend` parity story.                           |
| `packages/remend/__tests__/custom-handlers.test.ts`          | `parser`      | `P1`     | `blocked_by_missing_surface` | This repo has no standalone `remend` package or custom-handler API to port against yet.                                                                                                                                                                                            |
| `packages/remend/__tests__/edge-cases.test.ts`               | `regressions` | `P1`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/edge-cases.test.ts`; the frozen edge-case parser bundle now runs directly against local `parseIncompleteMarkdown`.                                                                                                                                  |
| `packages/remend/__tests__/horizontal-rules.test.ts`         | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/hr.test.ts`.                                                                                                                                                                                                                                   |
| `packages/remend/__tests__/html-tags.test.ts`                | `security`    | `P0`     | `ported_with_documented_gap` | Ported to `tests/ported/remend/html-tags.test.ts`; plain trailing-tag stripping matches upstream, while unclosed fenced-code tails still follow the local auto-close contract.                                                                                                     |
| `packages/remend/__tests__/images.test.ts`                   | `parser`      | `P0`     | `mapped_to_local_tests`      | Local image parsing and incomplete-image recovery already exist in `src/tests/image.test.ts` and `src/tests/weird-cases.test.ts`.                                                                                                                                                  |
| `packages/remend/__tests__/inline-code.test.ts`              | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/codespan.test.ts`.                                                                                                                                                                                                                             |
| `packages/remend/__tests__/italic.test.ts`                   | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/em.test.ts`.                                                                                                                                                                                                                                   |
| `packages/remend/__tests__/katex.test.ts`                    | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/math.test.ts`.                                                                                                                                                                                                                                 |
| `packages/remend/__tests__/links.test.ts`                    | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/link.test.ts`.                                                                                                                                                                                                                                 |
| `packages/remend/__tests__/lists.test.ts`                    | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogues in `src/tests/li.test.ts`, `src/tests/ol.test.ts`, and `src/tests/ul.test.ts`.                                                                                                                                                                              |
| `packages/remend/__tests__/mixed-formatting.test.ts`         | `parser`      | `P0`     | `ported_with_documented_gap` | Ported to `tests/ported/remend/mixed-formatting.test.ts`; most mixed-formatting recovery now runs directly, while current evidence documents remaining drift in strikethrough closure ordering and the local inline-citation path taking precedence over one incomplete-link case. |
| `packages/remend/__tests__/setext-heading.test.ts`           | `parser`      | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/setext-heading.test.ts`; local parser now encodes the upstream zero-width-space guard contract.                                                                                                                                                     |
| `packages/remend/__tests__/single-tilde.test.ts`             | `regressions` | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/single-tilde.test.ts`; local parser now escapes word-internal single tildes per upstream issue `#445`.                                                                                                                                              |
| `packages/remend/__tests__/streaming.test.ts`                | `parser`      | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/streaming.test.ts`; chunk-by-chunk recovery is now asserted directly against local `parseIncompleteMarkdown`.                                                                                                                                       |
| `packages/remend/__tests__/strikethrough.test.ts`            | `parser`      | `P0`     | `mapped_to_local_tests`      | Direct local analogue in `src/tests/del.test.ts`.                                                                                                                                                                                                                                  |
| `packages/remend/__tests__/underscore-bug.test.tsx`          | `regressions` | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/remend/underscore-bug.test.ts`; word-internal underscore recovery now matches the frozen upstream bug regression contract.                                                                                                                                 |
| `packages/remend/__tests__/utils.test.ts`                    | `parser`      | `P2`     | `blocked_by_missing_surface` | Upstream tests public parser utilities that this repo does not expose as a separate `remend` surface.                                                                                                                                                                              |

## Streamdown Reference Tests

### Security And Parser-Preprocessing Backlog

These files primarily feed `P2-04: Port Security-Related Reference Tests`.

| Reference file                                                         | Area           | Priority | Migration status             | Current local evidence or blocker                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | -------------- | -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/streamdown/__tests__/allowed-tags.test.tsx`                  | `security`     | `P0`     | `ported_with_documented_gap` | `tests/ported/streamdown/security/allowed-tags.svelte.test.ts` and `tests/ported/streamdown/security/literal-tag-content.svelte.test.ts` now cover the allowlist and literal-tag behavior directly, while the upstream React wrapper details remain framework-specific.       |
| `packages/streamdown/__tests__/email-addresses.test.tsx`               | `security`     | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/streamdown/security/email-addresses.svelte.test.ts`; the rendered email-address contract now runs through the local browser harness.                                                                                                                  |
| `packages/streamdown/__tests__/escape-html.test.ts`                    | `security`     | `P0`     | `ported_with_documented_gap` | Ported to `tests/ported/streamdown/security/escape-html.svelte.test.ts`; the public `renderHtml` compatibility prop now proves escaped-vs-rendered HTML behavior, while the upstream `Markdown` helper shape remains local-only drift.                                        |
| `packages/streamdown/__tests__/html-block-multiline.test.tsx`          | `security`     | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/streamdown/security/html-block-multiline.svelte.test.ts`; multiline HTML block behavior now runs directly in the local browser harness.                                                                                                               |
| `packages/streamdown/__tests__/link-modal-keyboard.test.tsx`           | `interactions` | `P0`     | `blocked_by_missing_surface` | Blocked by the missing link-safety modal flow and keyboard handling surface.                                                                                                                                                                                                  |
| `packages/streamdown/__tests__/link-safety.test.tsx`                   | `security`     | `P0`     | `blocked_by_missing_surface` | Blocked by the missing `linkSafety` modal/interceptor surface in `src/lib/Elements/Link.svelte`; the repo only exposes prefix filtering plus the compatibility prop documented in `src/README.md`.                                                                            |
| `packages/streamdown/__tests__/markdown-filtering.test.ts`             | `security`     | `P1`     | `blocked_by_missing_surface` | Blocked by the missing public `Markdown`/filtering API surface: `src/lib/index.ts` does not export an upstream-style `Markdown` helper or filtering props such as `allowedElements`, `disallowedElements`, `allowElement`, `unwrapDisallowed`, `skipHtml`, or `urlTransform`. |
| `packages/streamdown/__tests__/normalize-html-indentation.test.tsx`    | `security`     | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/streamdown/security/normalize-html-indentation.svelte.test.ts`; the utility and compatibility prop now run directly in the local browser harness.                                                                                                     |
| `packages/streamdown/__tests__/preprocess-custom-tags.test.ts`         | `security`     | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/streamdown/security/preprocess-custom-tags.test.ts`; the custom-tag preprocessing contract now runs directly against the local helper.                                                                                                                |
| `packages/streamdown/__tests__/preprocess-literal-tag-content.test.ts` | `security`     | `P0`     | `ported_to_local_harness`    | Expanded `tests/ported/streamdown/security/literal-tag-content.test.ts` to cover the frozen literal-tag preprocessing cases directly against `preprocessLiteralTagContent()`.                                                                                                 |
| `packages/streamdown/__tests__/rehype-literal-tag-content.test.ts`     | `security`     | `P0`     | `ported_with_documented_gap` | `tests/ported/streamdown/security/literal-tag-content.svelte.test.ts` now covers the local browser render path for `literalTagContent`, while the upstream rehype-specific wrapper details remain folded into the Svelte render pipeline.                                     |
| `packages/streamdown/__tests__/tel-links.test.tsx`                     | `security`     | `P0`     | `ported_to_local_harness`    | Ported to `tests/ported/streamdown/security/tel-links.svelte.test.ts`; rendered `tel:` / `mailto:` / `http:` link behavior now runs directly in the local browser harness.                                                                                                    |

### Core Rendering And Interaction Backlog

These files feed `P2-05: Port Rendering and Interaction Reference Tests` while the remaining surface and DOM gaps close.

| Reference file                                                   | Area           | Priority | Migration status             | Current local evidence or blocker                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | -------------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/streamdown/__tests__/animate.test.ts`                  | `interactions` | `P1`     | `blocked_by_missing_surface` | The upstream animation plugin/public options do not exist on the Svelte surface yet.                                                                                                                                                                                   |
| `packages/streamdown/__tests__/caret.test.tsx`                   | `interactions` | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/rendering/core-props.svelte.test.ts` and `tests/ported/streamdown/interactions/streaming-updates.svelte.test.ts` now cover the local caret prop and streaming behavior, but the upstream file is not ported verbatim.                         |
| `packages/streamdown/__tests__/cjk-friendly.test.tsx`            | `rendering`    | `P1`     | `ported_with_documented_gap` | Ported to `tests/ported/streamdown/rendering/cjk-friendly.svelte.test.ts`; the local harness now covers the supported `plugins.cjk` autolink-boundary contract directly, while the broader emphasis drift remains documented in `docs/parity-matrix.md` (`render-11`). |
| `packages/streamdown/__tests__/code-block-body.test.tsx`         | `rendering`    | `P1`     | `partial_local_coverage`     | Local code rendering exists in `src/tests/code.test.ts` and `src/lib/Elements/Code.svelte`, but the upstream component-level DOM contract is not ported.                                                                                                               |
| `packages/streamdown/__tests__/code-block-context.test.tsx`      | `rendering`    | `P2`     | `blocked_by_missing_surface` | Local code UI has no parity-compatible exported context surface.                                                                                                                                                                                                       |
| `packages/streamdown/__tests__/code-block-download.test.tsx`     | `interactions` | `P1`     | `partial_local_coverage`     | Local code copy/download controls exist, but the upstream control contract is not ported.                                                                                                                                                                              |
| `packages/streamdown/__tests__/code-block-hydration.test.tsx`    | `regressions`  | `P1`     | `partial_local_coverage`     | Local code rendering exists, but no browser hydration regression suite is present.                                                                                                                                                                                     |
| `packages/streamdown/__tests__/code-block-line-numbers.test.tsx` | `rendering`    | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/rendering/code-block-features.svelte.test.ts` and `tests/ported/streamdown/rendering/core-props.svelte.test.ts` now cover the local `lineNumbers` surface, but the upstream file is not ported directly.                                      |
| `packages/streamdown/__tests__/code-block-loading.test.tsx`      | `rendering`    | `P1`     | `partial_local_coverage`     | Local async highlighting exists, but the upstream loading-state assertions are not ported.                                                                                                                                                                             |
| `packages/streamdown/__tests__/code-block-memo.test.tsx`         | `performance`  | `P2`     | `blocked_by_missing_surface` | Upstream React memo behavior does not map cleanly to the current Svelte surface yet.                                                                                                                                                                                   |
| `packages/streamdown/__tests__/code-block-start-line.test.tsx`   | `rendering`    | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/rendering/code-block-features.svelte.test.ts` now exercises `startLine` metadata and line-number offsets, but the upstream file is not ported verbatim yet.                                                                                   |
| `packages/streamdown/__tests__/code-block.test.tsx`              | `rendering`    | `P1`     | `partial_local_coverage`     | Local code rendering and controls exist, but the upstream code-block suite is broader than current local tests.                                                                                                                                                        |
| `packages/streamdown/__tests__/components.test.tsx`              | `rendering`    | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/rendering/components.svelte.test.ts` now covers major reference-style overrides for headings, paragraphs, links, images, tables, and inline code plus snippet precedence, but the full upstream component map is still broader.               |
| `packages/streamdown/__tests__/copy-dropdown.test.tsx`           | `interactions` | `P1`     | `partial_local_coverage`     | Local table copy controls exist in `src/lib/Elements/TableDownload.svelte`, but the dropdown contract is not ported.                                                                                                                                                   |
| `packages/streamdown/__tests__/custom-renderer.test.tsx`         | `rendering`    | `P1`     | `ported_to_local_harness`    | Ported to `tests/ported/streamdown/rendering/custom-renderer.svelte.test.ts`; local browser coverage now exercises `plugins.renderers` language matching, prop forwarding, default fallback, array-language matching, and meta handling directly.                      |
| `packages/streamdown/__tests__/detect-direction.test.ts`         | `rendering`    | `P1`     | `blocked_by_missing_surface` | The local package does not expose `detectTextDirection`.                                                                                                                                                                                                               |
| `packages/streamdown/__tests__/dollar-sign.test.tsx`             | `regressions`  | `P0`     | `partial_local_coverage`     | `src/tests/math.test.ts` covers math parsing, but not the exact literal-dollar regressions from upstream.                                                                                                                                                              |
| `packages/streamdown/__tests__/download-dropdown.test.tsx`       | `interactions` | `P1`     | `partial_local_coverage`     | Local table download controls exist, but not the upstream dropdown contract.                                                                                                                                                                                           |
| `packages/streamdown/__tests__/footnote-section.test.tsx`        | `rendering`    | `P1`     | `partial_local_coverage`     | Local footnotes now render through a section/backref model with baseline coverage in `tests/ported/streamdown/rendering/image-and-footnotes.svelte.test.ts`, but the full upstream file is not ported verbatim yet.                                                    |
| `packages/streamdown/__tests__/footnotes.test.tsx`               | `rendering`    | `P1`     | `partial_local_coverage`     | Local footnote rendering and interaction coverage now exists, but the full upstream matrix is only partially represented by the current browser and parity tests.                                                                                                      |
| `packages/streamdown/__tests__/icon-context.test.tsx`            | `rendering`    | `P2`     | `blocked_by_missing_surface` | The local package does not expose the upstream icon context and icon map API.                                                                                                                                                                                          |
| `packages/streamdown/__tests__/image-cached.test.tsx`            | `rendering`    | `P1`     | `partial_local_coverage`     | Local image rendering exists in `src/tests/image.test.ts`, but cached-image lifecycle behavior is not ported.                                                                                                                                                          |
| `packages/streamdown/__tests__/image-edge-cases.test.tsx`        | `rendering`    | `P1`     | `partial_local_coverage`     | Local image parsing exists, but the upstream image edge-case matrix is missing.                                                                                                                                                                                        |
| `packages/streamdown/__tests__/image-hydration.test.tsx`         | `regressions`  | `P1`     | `partial_local_coverage`     | Local image rendering exists, but there is no hydration regression suite.                                                                                                                                                                                              |
| `packages/streamdown/__tests__/image.test.tsx`                   | `rendering`    | `P1`     | `partial_local_coverage`     | Local analogue exists in `src/tests/image.test.ts`, but the upstream DOM/UI assertions are not ported.                                                                                                                                                                 |
| `packages/streamdown/__tests__/incomplete-code-block.test.tsx`   | `parser`       | `P0`     | `partial_local_coverage`     | Local incomplete-markdown handling covers adjacent code-fence behavior, but the exported hook/utility contract is missing.                                                                                                                                             |
| `packages/streamdown/__tests__/inline-code.test.tsx`             | `rendering`    | `P1`     | `partial_local_coverage`     | `src/tests/codespan.test.ts` covers parser behavior, but not the upstream rendered inline-code component contract.                                                                                                                                                     |
| `packages/streamdown/__tests__/katex-classes.test.tsx`           | `rendering`    | `P1`     | `partial_local_coverage`     | Local math rendering exists, but the exact KaTeX class/output assertions are not ported.                                                                                                                                                                               |
| `packages/streamdown/__tests__/katex-lazy-load.test.tsx`         | `rendering`    | `P1`     | `not_started`                | No local test covers upstream KaTeX CSS lazy-loading behavior.                                                                                                                                                                                                         |
| `packages/streamdown/__tests__/latex-begin-issue.test.tsx`       | `regressions`  | `P1`     | `partial_local_coverage`     | Local math parsing exists, but the upstream `\\begin` regression is not encoded.                                                                                                                                                                                       |
| `packages/streamdown/__tests__/markdown.test.tsx`                | `rendering`    | `P1`     | `partial_local_coverage`     | Local parser/render tests cover many same constructs, but there is no upstream-style `Markdown` component contract suite.                                                                                                                                              |
| `packages/streamdown/__tests__/matrix-equation.test.tsx`         | `rendering`    | `P1`     | `partial_local_coverage`     | Local math parsing exists, but the matrix-rendering DOM contract is not ported.                                                                                                                                                                                        |
| `packages/streamdown/__tests__/mermaid-component.test.tsx`       | `rendering`    | `P1`     | `partial_local_coverage`     | Local mermaid rendering exists in `src/tests/mermaid.test.ts` and `src/lib/Elements/Mermaid.svelte`, but the component-level DOM contract is not ported.                                                                                                               |
| `packages/streamdown/__tests__/mermaid-download.test.tsx`        | `interactions` | `P1`     | `partial_local_coverage`     | Local mermaid download controls exist, but not the full upstream menu contract.                                                                                                                                                                                        |
| `packages/streamdown/__tests__/mermaid-fullscreen.test.tsx`      | `interactions` | `P1`     | `partial_local_coverage`     | Local fullscreen control exists, but the upstream fullscreen contract is not ported.                                                                                                                                                                                   |
| `packages/streamdown/__tests__/mermaid-utils.test.ts`            | `rendering`    | `P2`     | `not_started`                | No local test targets upstream mermaid export helpers such as `svgToPngBlob`.                                                                                                                                                                                          |
| `packages/streamdown/__tests__/mermaid.test.tsx`                 | `rendering`    | `P1`     | `partial_local_coverage`     | Local analogue exists in `src/tests/mermaid.test.ts`, but the upstream rendered-output suite is broader.                                                                                                                                                               |
| `packages/streamdown/__tests__/nested-details-tables.test.tsx`   | `regressions`  | `P1`     | `not_started`                | No local regression test covers nested details/table rendering.                                                                                                                                                                                                        |
| `packages/streamdown/__tests__/pan-zoom-interaction.test.tsx`    | `interactions` | `P1`     | `partial_local_coverage`     | Local mermaid pan/zoom behavior exists, but no upstream-style pointer interaction test has been ported.                                                                                                                                                                |
| `packages/streamdown/__tests__/pan-zoom.test.tsx`                | `interactions` | `P1`     | `partial_local_coverage`     | Local mermaid pan/zoom controls exist, but the upstream pan/zoom suite is not ported.                                                                                                                                                                                  |
| `packages/streamdown/__tests__/plugin-context.test.tsx`          | `rendering`    | `P1`     | `blocked_by_missing_surface` | Accepted plugin-contract drift: the public Svelte surface keeps plugin wiring on the root `plugins` prop and does not export the upstream plugin context/provider helpers.                                                                                             |
| `packages/streamdown/__tests__/prefix.test.tsx`                  | `rendering`    | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/rendering/core-props.svelte.test.ts` now covers prefixed utility classes, but the upstream file is not ported directly.                                                                                                                       |
| `packages/streamdown/__tests__/rtl-support.test.tsx`             | `rendering`    | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/rendering/core-props.svelte.test.ts` now covers `dir=\"auto\"` behavior, but the helper/export surface still differs from the upstream file.                                                                                                  |
| `packages/streamdown/__tests__/show-controls.test.tsx`           | `interactions` | `P1`     | `partial_local_coverage`     | Local `controls` support exists, but it is narrower than the upstream boolean/object contract.                                                                                                                                                                         |
| `packages/streamdown/__tests__/streamdown-coverage.test.tsx`     | `regressions`  | `P1`     | `partial_local_coverage`     | This is a mixed upstream regression file spanning animation, mode, and `allowedTags`; only parts overlap current local behavior.                                                                                                                                       |
| `packages/streamdown/__tests__/streamdown.test.tsx`              | `rendering`    | `P1`     | `partial_local_coverage`     | Local root component exists, but many upstream prop/default behaviors are still unported or missing.                                                                                                                                                                   |
| `packages/streamdown/__tests__/table-dropdowns.test.tsx`         | `interactions` | `P1`     | `partial_local_coverage`     | Local table copy/download controls exist, but not the exact upstream dropdown/menu semantics.                                                                                                                                                                          |
| `packages/streamdown/__tests__/table-fullscreen.test.tsx`        | `interactions` | `P1`     | `partial_local_coverage`     | `tests/ported/streamdown/interactivity/code-and-table-controls.svelte.test.ts` now covers table fullscreen enter/exit behavior, but the upstream file is still unported.                                                                                               |
| `packages/streamdown/__tests__/table-utils.test.ts`              | `rendering`    | `P1`     | `partial_local_coverage`     | `src/lib/index.ts` now exports `extractTableDataFromElement`, `tableDataToCSV`, `tableDataToMarkdown`, and `tableDataToTSV`, but the upstream utility test file is still missing locally.                                                                              |
| `packages/streamdown/__tests__/translations.test.tsx`            | `rendering`    | `P1`     | `partial_local_coverage`     | `defaultTranslations` now ships from `src/lib/index.ts`, and `tests/ported/streamdown/rendering/translations.svelte.test.ts` covers the local override path, but the upstream file is not ported directly.                                                             |
| `packages/streamdown/__tests__/use-deferred-render.test.tsx`     | `performance`  | `P2`     | `blocked_by_missing_surface` | The local package does not expose the upstream deferred-render hook.                                                                                                                                                                                                   |
| `packages/streamdown/__tests__/utils.test.ts`                    | `rendering`    | `P2`     | `blocked_by_missing_surface` | Blocked by missing utility exports such as upstream `defaultUrlTransform`-adjacent helpers.                                                                                                                                                                            |

### Coverage, Memo, And Regression Follow-Up

These files are valid parity evidence, but most should move after the P0 parser/security set and the first rendering/interaction ports land.

| Reference file                                                    | Area           | Priority | Migration status             | Current local evidence or blocker                                                                               |
| ----------------------------------------------------------------- | -------------- | -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `packages/streamdown/__tests__/components-memo.test.tsx`          | `performance`  | `P2`     | `blocked_by_missing_surface` | Upstream React memo comparator behavior does not map directly to the current Svelte component graph yet.        |
| `packages/streamdown/__tests__/components-rerender.test.tsx`      | `performance`  | `P2`     | `blocked_by_missing_surface` | Blocked on framework-specific memo/rerender behavior and missing upstream component boundaries.                 |
| `packages/streamdown/__tests__/coverage-final.test.tsx`           | `regressions`  | `P2`     | `partial_local_coverage`     | The referenced footnote/code paths overlap existing features, but this catch-all regression file is not ported. |
| `packages/streamdown/__tests__/final-coverage.test.tsx`           | `regressions`  | `P2`     | `partial_local_coverage`     | Local image and mermaid behavior exists, but the combined upstream regression file is still missing.            |
| `packages/streamdown/__tests__/list-animation-retrigger.test.tsx` | `regressions`  | `P1`     | `blocked_by_missing_surface` | Blocked on missing upstream animation behavior and callbacks.                                                   |
| `packages/streamdown/__tests__/memo-comparators.test.tsx`         | `performance`  | `P2`     | `blocked_by_missing_surface` | Blocked on framework-specific React memo comparator logic.                                                      |
| `packages/streamdown/__tests__/node-attribute-removed.test.tsx`   | `regressions`  | `P2`     | `not_started`                | No local regression test covers the upstream node-attribute removal fix.                                        |
| `packages/streamdown/__tests__/remaining-coverage.test.tsx`       | `regressions`  | `P2`     | `partial_local_coverage`     | The file spans several existing features, but none of its upstream assertions are ported directly yet.          |
| `packages/streamdown/__tests__/scroll-lock.test.ts`               | `interactions` | `P2`     | `not_started`                | No local test covers the upstream scroll-lock reference-counting utility.                                       |

## Official Plugin Package Reference Tests

These files should move only after the repo exposes parity-compatible plugin packages or a clearly equivalent public package surface.

| Reference file                                        | Area        | Priority | Migration status             | Current local evidence or blocker                                                                    |
| ----------------------------------------------------- | ----------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/streamdown-cjk/__tests__/index.test.ts`     | `rendering` | `P1`     | `blocked_by_missing_surface` | The repo does not ship a standalone `@streamdown/cjk`-compatible package or plugin contract yet.     |
| `packages/streamdown-code/__tests__/index.test.ts`    | `rendering` | `P1`     | `blocked_by_missing_surface` | The repo does not ship a standalone `@streamdown/code`-compatible package or plugin contract yet.    |
| `packages/streamdown-math/__tests__/index.test.ts`    | `rendering` | `P1`     | `blocked_by_missing_surface` | The repo does not ship a standalone `@streamdown/math`-compatible package or plugin contract yet.    |
| `packages/streamdown-mermaid/__tests__/index.test.ts` | `rendering` | `P1`     | `blocked_by_missing_surface` | The repo does not ship a standalone `@streamdown/mermaid`-compatible package or plugin contract yet. |

## Categorized Remaining Test Backlog

This is the canonical category and next-action index for every inventory row whose migration status is still `partial_local_coverage`, `not_started`, or `blocked_by_missing_surface`. `scripts/test-migration-status.mjs` consumes this table and fails if an unresolved file is missing here.

| Parity category               | Next action       | Reference file                                                    |
| ----------------------------- | ----------------- | ----------------------------------------------------------------- |
| `package/export boundaries`   | `accepted drift`  | `packages/remend/__tests__/custom-handlers.test.ts`               |
| `package/export boundaries`   | `accepted drift`  | `packages/remend/__tests__/utils.test.ts`                         |
| `interactions`                | `release blocker` | `packages/streamdown/__tests__/link-modal-keyboard.test.tsx`      |
| `security`                    | `release blocker` | `packages/streamdown/__tests__/link-safety.test.tsx`              |
| `security`                    | `release blocker` | `packages/streamdown/__tests__/markdown-filtering.test.ts`        |
| `interactions`                | `implement`       | `packages/streamdown/__tests__/animate.test.ts`                   |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/caret.test.tsx`                    |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/code-block-body.test.tsx`          |
| `rendering`                   | `implement`       | `packages/streamdown/__tests__/code-block-context.test.tsx`       |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/code-block-download.test.tsx`      |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/code-block-hydration.test.tsx`     |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/code-block-line-numbers.test.tsx`  |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/code-block-loading.test.tsx`       |
| `performance/framework drift` | `accepted drift`  | `packages/streamdown/__tests__/code-block-memo.test.tsx`          |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/code-block-start-line.test.tsx`    |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/code-block.test.tsx`               |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/components.test.tsx`               |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/copy-dropdown.test.tsx`            |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown/__tests__/detect-direction.test.ts`          |
| `parser`                      | `add/port test`   | `packages/streamdown/__tests__/dollar-sign.test.tsx`              |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/download-dropdown.test.tsx`        |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/footnote-section.test.tsx`         |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/footnotes.test.tsx`                |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown/__tests__/icon-context.test.tsx`             |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/image-cached.test.tsx`             |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/image-edge-cases.test.tsx`         |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/image-hydration.test.tsx`          |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/image.test.tsx`                    |
| `parser`                      | `add/port test`   | `packages/streamdown/__tests__/incomplete-code-block.test.tsx`    |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/inline-code.test.tsx`              |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/katex-classes.test.tsx`            |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/katex-lazy-load.test.tsx`          |
| `parser`                      | `add/port test`   | `packages/streamdown/__tests__/latex-begin-issue.test.tsx`        |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/markdown.test.tsx`                 |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/matrix-equation.test.tsx`          |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/mermaid-component.test.tsx`        |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/mermaid-download.test.tsx`         |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/mermaid-fullscreen.test.tsx`       |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/mermaid-utils.test.ts`             |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/mermaid.test.tsx`                  |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/nested-details-tables.test.tsx`    |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/pan-zoom-interaction.test.tsx`     |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/pan-zoom.test.tsx`                 |
| `plugins`                     | `accepted drift`  | `packages/streamdown/__tests__/plugin-context.test.tsx`           |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/prefix.test.tsx`                   |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/rtl-support.test.tsx`              |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/show-controls.test.tsx`            |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/streamdown-coverage.test.tsx`      |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/streamdown.test.tsx`               |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/table-dropdowns.test.tsx`          |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/table-fullscreen.test.tsx`         |
| `package/export boundaries`   | `add/port test`   | `packages/streamdown/__tests__/table-utils.test.ts`               |
| `package/export boundaries`   | `add/port test`   | `packages/streamdown/__tests__/translations.test.tsx`             |
| `performance/framework drift` | `accepted drift`  | `packages/streamdown/__tests__/use-deferred-render.test.tsx`      |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown/__tests__/utils.test.ts`                     |
| `performance/framework drift` | `accepted drift`  | `packages/streamdown/__tests__/components-memo.test.tsx`          |
| `performance/framework drift` | `accepted drift`  | `packages/streamdown/__tests__/components-rerender.test.tsx`      |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/coverage-final.test.tsx`           |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/final-coverage.test.tsx`           |
| `interactions`                | `implement`       | `packages/streamdown/__tests__/list-animation-retrigger.test.tsx` |
| `performance/framework drift` | `accepted drift`  | `packages/streamdown/__tests__/memo-comparators.test.tsx`         |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/node-attribute-removed.test.tsx`   |
| `rendering`                   | `add/port test`   | `packages/streamdown/__tests__/remaining-coverage.test.tsx`       |
| `interactions`                | `add/port test`   | `packages/streamdown/__tests__/scroll-lock.test.ts`               |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown-cjk/__tests__/index.test.ts`                 |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown-code/__tests__/index.test.ts`                |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown-math/__tests__/index.test.ts`                |
| `package/export boundaries`   | `accepted drift`  | `packages/streamdown-mermaid/__tests__/index.test.ts`             |

## Harness Support Files

These files are part of the upstream test harness and should be recreated when the corresponding ported suites are introduced.

| Reference file                                   | Area          | Priority | Migration status | Current local evidence or blocker                                                         |
| ------------------------------------------------ | ------------- | -------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `packages/streamdown/__tests__/setup.ts`         | `regressions` | `P1`     | `support_file`   | Recreate under the future DOM/browser harness introduced for `P2-04` and `P2-05`.         |
| `packages/streamdown-mermaid/__tests__/setup.ts` | `regressions` | `P1`     | `support_file`   | Recreate alongside the mermaid/browser harness when plugin or mermaid parity ports begin. |

## Recommended Migration Order

1. `P2-03`: Port the `remend` files marked `P0`, starting with files already `mapped_to_local_tests`.
2. `P2-04`: Port the `streamdown` security files that are not blocked by missing surface, then land the missing surface needed for the blocked set.
3. `P2-05`: Port the rendering and interaction files with existing local analogues first: code, mermaid, image, table, and root `Streamdown` behavior.
4. After the first parity harness exists, return to the `P2` memo/perf/regression files and the plugin-package test suites.

## Validation Evidence

Inventory completeness can be checked mechanically by verifying that every in-scope reference file path appears in this document:

```bash
all_reference_test_files() {
  find references/streamdown/packages/remend/__tests__ -type f \
    \( -name '*.test.ts' -o -name '*.test.tsx' -o -name 'setup.ts' \)
  find references/streamdown/packages/streamdown/__tests__ -type f \
    \( -name '*.test.ts' -o -name '*.test.tsx' -o -name 'setup.ts' \)
  find references/streamdown/packages/streamdown-* -path '*/__tests__/*' -type f \
    \( -name '*.test.ts' -o -name '*.test.tsx' -o -name 'setup.ts' \)
}

missing=0
while IFS= read -r file; do
  rel="${file#references/streamdown/}"
  if ! grep -Fq "$rel" docs/reference-tests-inventory.md; then
    echo "MISSING $rel"
    missing=1
  fi
done < <(all_reference_test_files | sort)

test "$missing" -eq 0
```
