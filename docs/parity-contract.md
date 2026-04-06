# Parity Compatibility Contract

This document defines what counts as acceptable parity for `svelte-streamdown` against the frozen upstream target in [docs/reference-version.md](./reference-version.md). It is the reviewer contract for API, parser, rendering, and interaction differences.

## Frozen Target And Scope

- Upstream repository: `vercel/streamdown`
- Frozen commit: `5f6475139a87dee8af08fcf7b01475292bc064d2` (`5f64751`)
- In-scope shipped packages:
  - `streamdown`
  - `remend`
  - `@streamdown/code`
  - `@streamdown/math`
  - `@streamdown/mermaid`
  - `@streamdown/cjk`

Out of scope unless a later `PLAN.md` issue expands it:

- `references/streamdown/apps/*`
- internal implementation details that do not change shipped package behavior
- monorepo-only tooling, benchmarks, and website layout details

## Evidence Inputs

This contract is grounded in these frozen-reference inputs:

- API surface: `references/streamdown/packages/streamdown/index.tsx`
- Parser surface: `references/streamdown/packages/remend/src/index.ts`
- Reference docs:
  - `references/streamdown/apps/website/content/docs/migrate.mdx`
  - `references/streamdown/apps/website/content/docs/termination.mdx`
  - `references/streamdown/apps/website/content/docs/components.mdx`
  - `references/streamdown/apps/website/content/docs/link-safety.mdx`
- Reference tests:
  - `references/streamdown/packages/remend/__tests__/*`
  - `references/streamdown/packages/streamdown/__tests__/markdown.test.tsx`
  - `references/streamdown/packages/streamdown/__tests__/normalize-html-indentation.test.tsx`
  - `references/streamdown/packages/streamdown/__tests__/link-safety.test.tsx`
  - `references/streamdown/packages/streamdown/__tests__/footnotes.test.tsx`

Current local drift and surface were checked against:

- `src/lib/index.ts`
- `src/lib/context.svelte.ts`
- `src/lib/Streamdown.svelte`
- `src/lib/utils/parse-incomplete-markdown.ts`
- `src/tests/weird-cases.test.ts`

## Source Of Truth Order

Review parity in this order:

1. [docs/reference-version.md](./reference-version.md) for the frozen commit and package scope
2. Frozen reference source, docs, and tests in `references/streamdown`
3. [docs/parity-matrix.md](./parity-matrix.md) for tracked IDs and current status
4. This contract for reviewer decision rules

If these sources disagree, the frozen reference wins, then the matrix must be updated in the same change.

## Reviewer Decision Rule

A difference is acceptable only if it fits one of these buckets:

1. `parity-equivalent`: the local behavior matches the frozen reference, or differs only in allowed normalization described below.
2. `framework-adapted`: the local Svelte API/DOM/event model differs from React syntax, but the same capability and user-visible outcome are preserved, and the adaptation is explicitly allowed by this contract.
3. `different_by_design`: the difference is explicitly listed in the approved-drift table in this document and tracked as `different_by_design` in the parity matrix.

Everything else is blocking.

Blocking by default:

- any matrix row still marked `tracked_follow_up` or `missing`
- any public rename, removed prop, changed default, or missing package export that is not covered by an approved adaptation
- any parser, DOM, or interaction difference without frozen-reference evidence
- any screenshot-only waiver that bypasses DOM parity
- any local-only feature that changes the result of a shared parity fixture for in-scope markdown

## API Compatibility Rules

API parity is judged on shipped public surface, not internal implementation.

Review these items:

- root exports and subpath exports
- component and utility names
- prop names, accepted values, and defaults
- callback presence and callback timing
- plugin entry points and package boundaries
- documented placeholder protocols such as `streamdown:incomplete-link`

Allowed normalization:

- React component types may map to Svelte `Component` or `Snippet` types
- React `children` composition may map to Svelte snippets or slots
- React event typing may map to Svelte callback typing
- The frozen internal `Markdown` post-processing helper may map to the root `Streamdown` filtering props when the same `allowedElements` / `disallowedElements` / `allowElement` / `unwrapDisallowed` / `skipHtml` / `urlTransform` / `renderHtml` outcomes are preserved
- additive local compatibility props or aliases may coexist when the frozen prop, default, and user-visible behavior still remain available unchanged

These type-system or framework-syntax adaptations are acceptable only when all of the following are true:

- the same semantic target can still be customized
- the same user-visible behavior can still be produced
- the adaptation does not narrow the frozen reference capability
- parity tests or fixtures can still compare the same outcome

Not acceptable as API parity:

- using a different prop name as a substitute for a missing reference prop
- changing a default and calling it “close enough”
- exposing a local helper instead of the frozen reference export
- treating local subpath components as a substitute for the frozen plugin packages

## Parser Compatibility Rules

Parser parity is judged on normalized output, not on internal parser implementation.

The comparison must preserve:

- block boundaries when they affect rendering or streaming behavior
- block kinds such as headings, paragraphs, blockquotes, lists, tables, code fences, HTML, footnotes, and rich-content placeholders
- inline kinds such as emphasis, strong, strikethrough, inline code, links, images, math, and footnote references
- visible text content and markdown-derived text order
- link destinations, image destinations, alt text, and titles
- table structure, list nesting, footnote/reference relationships, and incomplete-code/incomplete-table semantics
- incomplete-markdown completion behavior, including option defaults and placeholder protocols
- preprocessing that changes security or literal-tag semantics

The comparison may ignore:

- source offsets and token position metadata
- parser-internal node classes or helper-only fields
- object identity, memoization metadata, and framework-specific AST wrappers
- ordering of fields that does not change rendered meaning

Specific normalization rules:

- Incomplete links must preserve the frozen reference behavior of `streamdown:incomplete-link` or the documented `text-only` fallback when that mode is explicitly enabled.
- Incomplete images follow the frozen `remend` contract: they are removed instead of rendered with a placeholder URL.
- Single-dollar math, single-tilde escaping, setext-heading prevention, HTML tail stripping, and comparison-operator escaping follow the frozen `remend` option defaults, not local heuristics.
- Whitespace-only separator blocks emitted by the frozen `parseMarkdownIntoBlocks()` helper may be ignored when the local block splitter preserves the same renderable block order and incomplete-block behavior.
- Footnote definitions may live outside the per-block parser IR only when the approved `drift-11` rule applies and the rendered footnote refs, definitions, backrefs, and empty-footnote streaming behavior still match the frozen reference outcomes.
- Extra local syntax is tolerated only for inputs outside the frozen contract. If it changes the output of a shared frozen-reference fixture, it is a parity failure.

## Rendering Compatibility Rules

Rendering parity is judged on normalized DOM and visible semantics, not raw HTML string equality.

The normalized DOM must preserve:

- semantic HTML tags and nesting
- rendered text content after browser normalization
- `href`, `src`, `alt`, `title`, and other user-visible or security-relevant attributes
- code block structure, language markers, loading states, and line-number presence when applicable
- table section and cell structure
- footnote section or other approved alternative interaction affordances
- presence, absence, and disabled state of visible controls
- blocked-link, blocked-image, and sanitized-HTML outcomes

The normalized DOM may ignore:

- framework-only wrapper nodes that do not affect semantics
- comment nodes and hydration markers
- class ordering
- generated IDs that are intentionally unstable
- attribute ordering

CSS class names are not a parity target by themselves. They matter only when they encode user-visible state, accessibility state, or control presence.

A rendering change is blocking when it changes any of these:

- which semantic node is rendered
- whether text, code, links, images, or controls are visible
- whether sanitized or blocked content is exposed
- whether the accessible control set changes
- whether a shared fixture renders a different structure after DOM normalization

## Interaction Compatibility Rules

Interaction parity is judged on observable browser behavior, not on internal event wiring.

The following outcomes must match the frozen reference for shared fixtures:

- copy actions copy the same user-visible payload
- download actions emit the same content class and filename intent
- fullscreen actions expose the same visible state transition
- mermaid pan and zoom controls expose the same observable behavior
- blocked links and images follow the same safety flow
- citation and footnote actions land on the same approved interaction model

Allowed normalization:

- click handlers, stores, refs, and local state shape may differ
- framework-specific wrapper buttons or anchors may differ if the same accessible role, label, and user outcome are preserved

Not acceptable:

- a different clipboard payload
- a different download payload or missing download format
- exposing a direct navigation where the reference blocks or intercepts
- requiring a different user action to reach the same feature without explicit contract approval

## Approved Framework-Specific Differences

Only the differences listed here count as approved `different_by_design` drift today.

| Matrix ID  | Approved difference                                                                                                                  | Review rule                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drift-01` | Additive Svelte-only root exports such as `useStreamdown`, `theme`, `mergeTheme`, `lex`, `parseBlocks`, and language helpers         | Allowed only as additive local API. They do not satisfy missing frozen-reference exports and must stay documented as local-only drift.                                                                                                               |
| `drift-02` | Additive Svelte subpath exports `./code`, `./mermaid`, and `./math`                                                                  | Allowed only as convenience exports. They do not count as parity for the frozen plugin packages `@streamdown/*`.                                                                                                                                     |
| `drift-03` | Extra local syntaxes such as inline citations, alignment tags, description lists, MDX block tags, and complex rowspan/colspan tables | Allowed only when they do not change the result of shared frozen-reference fixtures. They are outside the parity target and must not be used as evidence of parity.                                                                                  |
| `drift-04` | Additive root-level plugin factories and default instances instead of separate `@streamdown/*` packages                              | Allowed only as a parity-compatible adaptation while the frozen standalone package boundaries remain absent. This drift does not satisfy package-boundary parity by itself.                                                                          |
| `drift-05` | No standalone `remend` package or `remend?: RemendOptions` prop on the public Svelte surface                                         | Allowed only as an explicit package-boundary adaptation. The local parser helpers may stay inside `svelte-streamdown`, but the missing standalone parser package must remain documented as accepted drift.                                           |
| `drift-06` | No `./styles.css` package export                                                                                                     | Allowed only as a packaging adaptation. Styling must continue to come from the shipped component output and theme APIs rather than a frozen stylesheet subpath.                                                                                      |
| `drift-07` | Root helper/UI exports stay Svelte-first instead of matching the frozen React root export family                                     | Allowed only as approved package-boundary drift. Missing upstream helper/UI exports such as icon-context, animate plugin, code/table UI components, and URL helpers must remain documented rather than implied to be implemented.                    |
| `drift-08` | Markdown extensibility uses Svelte `extensions` plus HTML/security props instead of `remarkPlugins` / `rehypePlugins` pass-through   | Allowed only as an explicit plugin-contract adaptation. The local plugin surface must keep documenting that no unified plugin-array pass-through is exported.                                                                                        |
| `drift-09` | No exported upstream plugin context/provider helpers; plugin wiring stays on the root `plugins` prop                                 | Allowed only as explicit plugin-contract drift. Missing plugin-context helpers and providers must remain documented as accepted drift rather than being implied to be pending implementation.                                                        |
| `drift-10` | React-specific memo/comparator and deferred-render internals stay unported; Svelte parity is judged on observable DOM behavior       | Allowed only for reference suites whose assertions depend on `React.memo`, custom comparator call patterns, rerender counts, or deferred-render hook timing. Equivalent DOM or interaction outcomes still require coverage elsewhere.                |
| `drift-11` | Footnote definitions stay in Svelte footnote state instead of appearing as frozen-reference parser IR nodes                          | Allowed only when the rendered refs, definitions, backrefs, and streaming empty-footnote suppression remain parity-equivalent. This drift does not waive visible footnote or interaction regressions; it only documents the parser-shape difference. |

No other drift is implicitly approved.

## DOM Diff Versus Screenshot Diff Policy

Browser parity uses two signals with different authority:

1. DOM parity is primary.
2. Screenshot parity is secondary.

DOM parity decides whether a change is structurally acceptable. Screenshot parity exists to catch visible regressions that normalized DOM cannot see.

Rules:

- Do not use screenshot diff to waive a DOM mismatch.
- Run screenshot diff only after DOM parity is established for the same fixture class.
- Treat screenshot failures as blocking only when they show a real visible difference such as layout breakage, overflow, clipping, missing controls, incorrect icon state, spacing regression, or wrong visual fallback.
- Treat screenshot failures as non-blocking harness noise when they are explained by rasterization, font antialiasing, subpixel differences, or animation timing, and the DOM plus interaction results already match.
- Screenshot harnesses must use deterministic fonts, viewport, theme, and animation settings before visual failures can be trusted.

In short:

- API and parser parity answer “did we expose and interpret the same contract?”
- DOM parity answers “did we render the same semantics?”
- screenshot parity answers “does the user still see a meaningful visual difference after DOM parity is already clean?”

## Approved Screenshot Waivers

- `waiver-01`: `tests/playwright/parity/visual.spec.ts` fixtures `05-unordered-list.md`, `07-heading-and-emphasis.md`, and `08-blockquote-plain.md` may use elevated screenshot-diff budgets in the nightly GitHub-hosted runner.
- Rationale: the fixture content is typography-only, normalized DOM parity already matches, interaction parity is not involved, and the uploaded GitHub-hosted diffs show stable text antialiasing/subpixel drift rather than missing content, clipping, overflow, or wrong controls.
- Boundaries: this waiver does not bypass DOM parity, does not apply to any other fixture, and does not waive screenshot dimension mismatches or larger visual regressions beyond the fixture-specific budgets captured in `tests/playwright/parity/visual.spec.ts`.

## Evidence Mapping For Follow-On Suites

This contract is the approval rubric for these later `PLAN.md` items:

- `P3-03` API surface contract tests
- `P3-04` normalized parser IR
- `P3-05` parser parity tests
- `P3-07` DOM normalization and DOM parity assertions
- `P3-08` visual diff as secondary signal
- `P3-09` interaction parity fixtures

If a new test or fixture needs a waiver, add the waiver here and in [docs/parity-matrix.md](./parity-matrix.md) in the same pull request. Otherwise the test failure is a real parity failure.
