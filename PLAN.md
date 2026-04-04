# Svelte Streamdown Parity Plan

## Document Purpose

This document turns the high-level roadmap into an execution plan that can be tracked issue by issue.

Primary goals:

1. Trusted, reproducible, secure releases
2. Ported test coverage from the reference `streamdown`
3. Interface-level and browser-level parity testing against the reference implementation
4. Full functional parity with the reference `streamdown` and its supported feature set

This plan assumes the reference target is the code currently stored in `references/streamdown`.

## Execution Rules

- Do not implement parity changes without first defining the expected behavior in tests or parity fixtures.
- Do not "adapt the tests to the implementation" unless the difference is explicitly marked as intentional.
- Every parity-related PR must update the parity matrix and reference the issue ID it closes.
- Every bug fix must add or update a regression test.
- Release work is not complete unless it is enforceable in CI.

## Tracking Model

Issue statuses:

- `todo`
- `in_progress`
- `blocked`
- `done`

Recommended labels:

- `phase:0` to `phase:5`
- `area:release`
- `area:security`
- `area:tests`
- `area:parity`
- `area:parser`
- `area:rendering`
- `area:interactivity`
- `area:docs`

## Milestones

### Milestone A: Baseline and Governance

Success criteria:

- Reference version is frozen
- Parity scope is documented
- Release policy exists

### Milestone B: Trusted Release Pipeline

Success criteria:

- Clean environment builds are reproducible
- Package contents are verified
- Release gates are enforced in CI

### Milestone C: Test Infrastructure

Success criteria:

- Original tests are categorized and tracked
- Porting harness exists
- Playwright parity harness exists

### Milestone D: P0 Parity

Success criteria:

- Security semantics aligned
- Incomplete markdown behavior aligned
- Core public API aligned
- High-value browser parity fixtures pass

### Milestone E: Full Feature Parity

Success criteria:

- All reference features are either implemented or explicitly marked unsupported with rationale
- Remaining parity gaps are non-P0 only

### Milestone F: Stable Release Readiness

Success criteria:

- Full CI is green
- Docs match shipped behavior
- Regression policy is in place

## Phase 0: Baseline Freeze and Scope

### Issue P0-01: Freeze Reference Version

- Status: `done`
- Goal: Lock the exact `streamdown` version and commit that parity will target.
- Tasks:
- Record the reference commit SHA from `references/streamdown`
- Record the package versions of `streamdown`, `remend`, and official plugins
- Define whether parity targets the full monorepo or only shipped package behavior
- Deliverables:
- `docs/reference-version.md`
- Acceptance:
- The reference commit SHA is documented
- The target package versions are documented
- All later parity decisions refer to this frozen target

### Issue P0-02: Create Feature Parity Matrix

- Status: `done`
- Goal: Build the master list of features and current status.
- Tasks:
- Enumerate reference public exports
- Enumerate reference props and defaults
- Enumerate parser features
- Enumerate rendering features
- Enumerate interactivity features
- Enumerate security features
- Enumerate official plugin features
- Mark each item as `done`, `partial`, `missing`, or `different_by_design`
- Deliverables:
- `docs/parity-matrix.md`
- Acceptance:
- Every later parity issue maps to one or more entries in the matrix
- No feature work starts without a matrix entry

### Issue P0-03: Define Compatibility Contract

- Status: `done`
- Goal: Specify what "parity" means at API, parser, rendering, and interaction levels.
- Tasks:
- Define API-level compatibility rules
- Define parser-level normalized output rules
- Define rendering-level parity rules
- Define allowable framework-specific differences
- Define screenshot diff policy versus DOM diff policy
- Deliverables:
- `docs/parity-contract.md`
- Acceptance:
- Reviewers can decide whether a difference is acceptable by reading this document alone

### Issue P0-04: Write Release Policy

- Status: `done`
- Goal: Define the required steps for a trusted release.
- Tasks:
- Define release checklist
- Define required CI jobs
- Define who can cut releases
- Define rollback policy
- Define provenance and package verification expectations
- Deliverables:
- `docs/release-policy.md`
- Acceptance:
- Release requirements are explicit and testable

## Phase 1: Trusted, Reproducible, Secure Release Pipeline

### Issue P1-01: Pin Toolchain Versions

- Status: `done`
- Goal: Make local and CI builds use the same runtime stack.
- Tasks:
- Add or update `.nvmrc` or equivalent
- Pin pnpm version in repository metadata
- Ensure CI uses exact Node and pnpm versions
- Document local setup
- Deliverables:
- Toolchain version files
- CI updates
- Acceptance:
- Local and CI report the same tool versions

### Issue P1-02: Add Clean Build Verification

- Status: `done`
- Goal: Ensure the package builds from a clean checkout without hidden local state.
- Tasks:
- Add CI job that runs from a clean install
- Run typecheck, build, and package steps without relying on unstaged files
- Fail if generated files differ after build
- Deliverables:
- CI workflow update
- Acceptance:
- A clean checkout build is deterministic and enforced in CI

### Issue P1-03: Verify Package Contents

- Status: `done`
- Goal: Guarantee that the published tarball contains only intended files.
- Tasks:
- Add `npm pack` verification script
- Validate exported subpaths exist in the tarball
- Validate types exist for each export
- Fail on accidental inclusion of test files, fixtures, scripts, or app-only files
- Deliverables:
- `scripts/verify-pack.mjs`
- CI job integration
- Acceptance:
- CI fails when package contents drift from policy

### Issue P1-04: Add Export Surface Verification

- Status: `done`
- Goal: Ensure the package `exports` map is internally consistent and installable.
- Tasks:
- Parse `package.json` exports
- Verify each referenced file exists after build
- Install packed tarball into a temp fixture project
- Smoke import root export and subpath exports
- Deliverables:
- `scripts/verify-exports.mjs`
- `tests/pack-smoke/`
- Acceptance:
- Every declared export resolves from the packed tarball

### Issue P1-05: Add Dependency and License Audit Gate

- Status: `done`
- Goal: Reduce supply-chain and licensing surprises before release.
- Tasks:
- Add dependency audit command to CI
- Add license inventory step
- Define severity threshold policy
- Document exception handling
- Deliverables:
- CI audit job
- `docs/dependency-policy.md`
- Acceptance:
- Release job fails on unapproved audit or license issues

### Issue P1-06: Add Release Provenance and Artifact Metadata

- Status: `done`
- Goal: Make published artifacts traceable to a verified CI run.
- Tasks:
- Emit build metadata
- Emit tarball hash
- If supported, emit provenance or attestation metadata
- Document how to verify published artifacts
- Deliverables:
- Artifact metadata files
- Release workflow update
- Acceptance:
- A release can be traced to a CI run and specific commit

## Phase 2: Reference Test Migration

### Issue P2-01: Inventory Reference Tests

- Status: `todo`
- Goal: Build a migration backlog from the original test suite.
- Tasks:
- Enumerate tests in reference `streamdown`
- Enumerate tests in reference `remend`
- Group by parser, security, rendering, interactions, performance, and regressions
- Mark migration priority
- Deliverables:
- `docs/reference-tests-inventory.md`
- Acceptance:
- Every reference test file is classified and assigned a migration status

### Issue P2-02: Build Test Porting Harness

- Status: `todo`
- Goal: Provide reusable helpers for ported tests.
- Tasks:
- Create parser helpers
- Create DOM normalization helpers
- Create fixture loading helpers
- Create environment split helpers for node versus browser tests
- Deliverables:
- `tests/helpers/`
- Acceptance:
- New ported tests use shared helpers instead of copy-pasted setup

### Issue P2-03: Port `remend` Behavior Tests

- Status: `todo`
- Goal: Validate incomplete markdown behavior against the reference semantics.
- Tasks:
- Port highest-value `remend` tests first
- Map reference expectations to local parser contract
- Note mismatches explicitly
- Deliverables:
- `tests/ported/remend/`
- Acceptance:
- P0 `remend` parity cases are green or explicitly blocked

### Issue P2-04: Port Security-Related Reference Tests

- Status: `todo`
- Goal: Bring over tests covering sanitization, links, images, and HTML handling.
- Tasks:
- Port allowed tags tests
- Port link safety related tests where applicable
- Port HTML block handling and escaping tests
- Port protocol and URL behavior tests
- Deliverables:
- `tests/ported/streamdown/security/`
- Acceptance:
- Security expectations are encoded as automated tests before implementation changes

### Issue P2-05: Port Rendering and Interaction Reference Tests

- Status: `todo`
- Goal: Bring over code, mermaid, table, translations, and related UI behavior tests.
- Tasks:
- Port code block tests
- Port mermaid interaction tests
- Port table control tests
- Port translations tests
- Port image and footnote rendering tests
- Deliverables:
- `tests/ported/streamdown/rendering/`
- `tests/ported/streamdown/interactivity/`
- Acceptance:
- P0 rendering and interaction reference tests are runnable in this repository

### Issue P2-06: Track Test Migration Coverage

- Status: `todo`
- Goal: Make migration progress visible.
- Tasks:
- Add migration status table
- Track source file, local destination, pass status, and blockers
- Update status in CI summary if possible
- Deliverables:
- `docs/test-migration-status.md`
- Acceptance:
- Team can tell at a glance which reference tests are still missing

## Phase 3: Interface-Level and Browser-Level Parity Testing

### Issue P3-01: Create API Surface Snapshot for Reference

- Status: `todo`
- Goal: Serialize the reference package surface into machine-readable snapshots.
- Tasks:
- Extract exports
- Extract prop names and defaults where possible
- Extract plugin entry points
- Normalize framework-specific typing noise
- Deliverables:
- `fixtures/parity/reference-api-surface.json`
- Acceptance:
- Snapshot is stable and reviewable

### Issue P3-02: Create Local API Surface Snapshot

- Status: `todo`
- Goal: Serialize the local package surface using the same schema as the reference.
- Tasks:
- Extract local exports
- Extract local public props
- Extract subpath exports
- Normalize type differences
- Deliverables:
- `fixtures/parity/local-api-surface.json`
- Acceptance:
- Reference and local snapshots can be diffed automatically

### Issue P3-03: Add API Parity Contract Tests

- Status: `todo`
- Goal: Fail when the local public contract drifts from the target parity surface.
- Tasks:
- Compare reference and local snapshots
- Allow explicit exclusions only through a tracked allowlist
- Make CI fail on unapproved differences
- Deliverables:
- `tests/contracts/api-surface.spec.ts`
- Acceptance:
- Contract differences are visible in CI and require explicit approval

### Issue P3-04: Define Normalized Parser IR

- Status: `todo`
- Goal: Create a comparison format for parser-level parity that is not polluted by implementation details.
- Tasks:
- Define normalized block representation
- Define normalized inline token representation
- Define incomplete-markdown normalization rules
- Document ignored fields
- Deliverables:
- `tests/contracts/parser-ir.ts`
- Acceptance:
- Both reference and local outputs can be projected into the same IR

### Issue P3-05: Add Parser Parity Tests

- Status: `todo`
- Goal: Compare reference and local parsing behavior over shared markdown fixtures.
- Tasks:
- Build shared markdown fixture set
- Run fixtures through reference parser path
- Run fixtures through local parser path
- Compare normalized IR
- Deliverables:
- `tests/contracts/parser-parity.spec.ts`
- `fixtures/parity/markdown/`
- Acceptance:
- Parser parity failures point to exact fixture and normalized diff

### Issue P3-06: Build Dual-App Playwright Harness

- Status: `todo`
- Goal: Run the same fixture set against two live apps in a real browser.
- Tasks:
- Create a reference demo app using `streamdown`
- Create a local demo app using `svelte-streamdown`
- Feed fixtures through shared routes
- Start both apps in Playwright
- Deliverables:
- `apps/parity-reference/`
- `apps/parity-local/`
- `playwright.config.*`
- Acceptance:
- Playwright can load both apps and render the same fixture content

### Issue P3-07: Add DOM Normalization and DOM Parity Assertions

- Status: `todo`
- Goal: Compare rendered structure semantically instead of raw HTML noise.
- Tasks:
- Normalize class ordering
- Ignore random IDs and framework-only wrappers
- Preserve semantic tags, text, links, images, table structure, and control presence
- Add readable diff output
- Deliverables:
- `tests/playwright/parity/normalize-dom.ts`
- `tests/playwright/parity/assert-dom-parity.ts`
- Acceptance:
- DOM parity failures are actionable and not dominated by framework noise

### Issue P3-08: Add Visual Diff as Secondary Signal

- Status: `todo`
- Goal: Catch layout or rendering mismatches not obvious from DOM diffs.
- Tasks:
- Capture normalized screenshots
- Add stable fonts and deterministic viewport settings
- Use screenshot diff only after DOM parity is established
- Document known flake sources
- Deliverables:
- `tests/playwright/parity/visual.spec.ts`
- Acceptance:
- Visual diffs are useful and not too flaky to trust

### Issue P3-09: Add Interaction Parity Fixtures

- Status: `todo`
- Goal: Compare user-visible interaction behavior across both implementations.
- Tasks:
- Add fixtures and actions for:
- code copy
- code download
- table copy
- table download
- mermaid download
- mermaid pan and zoom
- mermaid fullscreen
- blocked links and images
- citation navigation
- Deliverables:
- `tests/playwright/parity/interactions.spec.ts`
- Acceptance:
- Key interactions are validated against the reference behavior in a browser

## Phase 4: Feature Parity Implementation

### Issue P4-01: Align Security Rendering Model

- Status: `todo`
- Goal: Replace ad hoc security behavior with a coherent model equivalent to the reference contract.
- Tasks:
- Define local equivalent of sanitize and harden semantics
- Align link and image policy behavior
- Align HTML rendering behavior
- Add tests before implementation changes
- Dependencies:
- P2-04
- P3-05
- Acceptance:
- Security-related parity fixtures pass

### Issue P4-02: Align Incomplete Markdown Semantics

- Status: `todo`
- Goal: Bring incomplete markdown behavior into parity with reference `remend`.
- Tasks:
- Compare failing `remend` fixtures
- Refactor local parser or integrate equivalent semantics
- Remove behavior that only exists as local regex patches if it conflicts with reference expectations
- Dependencies:
- P2-03
- P3-05
- Acceptance:
- P0 `remend` parity fixtures pass

### Issue P4-03: Implement Missing Core Props

- Status: `todo`
- Goal: Fill the major public API gaps.
- Tasks:
- Add missing props or explicit compatibility shims for:
- `mode`
- `isAnimating`
- `animated`
- `caret`
- `dir`
- `lineNumbers`
- `linkSafety`
- `allowedTags`
- `literalTagContent`
- `prefix`
- `onAnimationStart`
- `onAnimationEnd`
- Dependencies:
- P3-03
- Acceptance:
- API parity tests for P0 props pass

### Issue P4-04: Implement Reference Plugin Contract

- Status: `todo`
- Goal: Support the reference plugin model or a parity-compatible equivalent.
- Tasks:
- Define local plugin interfaces
- Add support for code, math, mermaid, and CJK plugin behavior
- Add migration notes if exact framework parity needs adaptation
- Dependencies:
- P0-02
- P3-03
- Acceptance:
- Plugin-related parity matrix items move to `done` or `partial` with explicit rationale

### Issue P4-05: Add CJK Feature Support

- Status: `todo`
- Goal: Match the reference CJK support behavior.
- Tasks:
- Port fixture coverage from reference CJK docs and tests
- Implement punctuation-sensitive emphasis behavior
- Implement autolink boundary handling for CJK punctuation
- Dependencies:
- P4-04
- Acceptance:
- CJK fixtures behave like the reference target

### Issue P4-06: Expand Component Override Surface

- Status: `todo`
- Goal: Support the component override capabilities expected from the reference API.
- Tasks:
- Define override support for headings, paragraphs, links, images, tables, and inline code
- Preserve existing Svelte snippet API where possible
- Add compatibility rules between snippets and component overrides
- Dependencies:
- P3-03
- Acceptance:
- Major reference component override use cases are covered by automated tests

### Issue P4-07: Align Code Block Features

- Status: `todo`
- Goal: Match the reference code block feature set.
- Tasks:
- Add line numbers
- Add per-block line-number controls if required
- Align download and copy behavior
- Align loading behavior during streaming
- Dependencies:
- P2-05
- P3-09
- Acceptance:
- Code block parity fixtures pass

### Issue P4-08: Align Mermaid Features

- Status: `todo`
- Goal: Match the reference mermaid rendering and interaction behavior.
- Tasks:
- Add missing controls and options
- Add error component support or parity-compatible equivalent
- Align fullscreen and pan/zoom behavior
- Align download behavior
- Dependencies:
- P2-05
- P3-09
- Acceptance:
- Mermaid parity fixtures pass

### Issue P4-09: Align Table Features

- Status: `todo`
- Goal: Match the reference table controls and rendering semantics.
- Tasks:
- Add missing fullscreen behavior if required
- Align copy and download semantics
- Align wrapper structure for parity tests
- Dependencies:
- P2-05
- P3-09
- Acceptance:
- Table parity fixtures pass

### Issue P4-10: Align Footnotes, Citations, and Rich Content Widgets

- Status: `todo`
- Goal: Close gaps in rich-content rendering behavior.
- Tasks:
- Finish footnote rendering path
- Align inline citation rendering modes and interactions
- Add missing widget tests
- Dependencies:
- P2-05
- Acceptance:
- Footnote and citation parity fixtures pass

### Issue P4-11: Align HTML and Custom Tag Handling

- Status: `todo`
- Goal: Match reference behavior for raw HTML and custom tag content.
- Tasks:
- Implement `allowedTags`
- Implement `literalTagContent`
- Align multiline HTML block handling
- Align HTML indentation normalization if supported
- Dependencies:
- P2-04
- Acceptance:
- HTML and custom tag parity fixtures pass

### Issue P4-12: Align Streaming Update Behavior

- Status: `todo`
- Goal: Match reference behavior for block segmentation, animation, and incomplete block handling while streaming.
- Tasks:
- Compare block update semantics
- Align incomplete code fence handling
- Align animation start and end semantics
- Add regression fixtures for streaming updates
- Dependencies:
- P3-05
- P3-09
- Acceptance:
- Streaming-related parity tests pass

## Phase 5: Stabilization, Docs, and Release Readiness

### Issue P5-01: Remove README and API Drift

- Status: `done`
- Goal: Make docs describe only shipped behavior.
- Tasks:
- Compare README props against actual public types
- Remove unsupported claims
- Add missing documented features only after they ship
- Dependencies:
- P4-03
- Acceptance:
- No documented prop or feature is missing from the package

### Issue P5-02: Add Coverage Reporting

- Status: `done`
- Goal: Make test blind spots measurable.
- Tasks:
- Add coverage provider
- Add coverage scripts
- Track separate coverage for parser, components, and parity suites
- Define minimum thresholds
- Deliverables:
- test config updates
- CI coverage reporting
- Acceptance:
- Coverage metrics are visible in CI

### Issue P5-03: Add Nightly Full Parity Job

- Status: `done`
- Goal: Run the expensive suites on a regular schedule.
- Tasks:
- Add nightly workflow for:
- full ported tests
- full Playwright parity
- pack smoke tests
- dependency audit
- Publish summary artifacts
- Acceptance:
- Nightly failures provide enough data to debug without reproducing locally first

### Issue P5-04: Add Regression Intake Workflow

- Status: `done`
- Goal: Ensure new bugs become durable test assets.
- Tasks:
- Add bug template requiring repro markdown
- Add fixture naming convention
- Require every bug fix PR to add a fixture or test
- Deliverables:
- issue templates
- contribution docs
- Acceptance:
- Regression handling process is standardized

### Issue P5-05: Final Release Readiness Audit

- Status: `done`
- Goal: Decide whether the package is ready for a parity-backed release.
- Tasks:
- Review all P0 and P1 issues
- Review unresolved matrix gaps
- Review release pipeline and test results
- Decide go or no-go
- Deliverables:
- `docs/release-readiness-report.md`
- Acceptance:
- Release decision is based on documented evidence, not intuition

## Phase 6: Release Re-Audit Closeout

This phase tracks the execution split created after the `2026-04-04` release re-audit confirmed that refreshed evidence landed, but several trusted-release and parity-backed-release blockers remained open. The closeout sequence is now complete, and the statuses below reflect the final `ASE-43` synchronization pass on `2026-04-04`.

### Issue P6-01: Close Remaining Parity Gaps

- Status: `done`
- Goal: Keep the remaining parity closeout work grouped under a single umbrella so parser, security, rendering, interaction, and migration follow-ups can be sequenced explicitly instead of being rediscovered during each audit pass.
- Deliverables:
- platform execution tickets and dependency links for all still-open parity-backed release blockers
- Acceptance:
- every remaining parity-backed release blocker is assigned to a concrete execution ticket with clear handoff ordering

### Issue P6-03: Close Remaining Alignment And Release Blockers

- Status: `done`
- Goal: Convert every still-open closeout misalignment from the `2026-04-04` re-audit into an explicit execution ticket, separate work that can run in parallel from work that must wait on earlier evidence, and keep `PLAN.md`, platform state, and release-readiness evidence aligned.
- Deliverables:
- execution tickets `ASE-35` through `ASE-43`
- dependency ordering that distinguishes immediately-runnable work from evidence-blocked follow-up work
- `docs/release-readiness-report.md` execution mapping aligned with the platform ticket tree
- Acceptance:
- every remaining gap family from the `2026-04-04` re-audit is mapped to a concrete execution ticket
- the dependency chain from implementation work to evidence refresh to final status synchronization is explicit
- the next closeout pass can start from this plan without hidden work

#### P6-03 Execution Map

| Execution ticket | Focus                                                                            | Final platform status | Depends on                                                 | Unblocks                     |
| ---------------- | -------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- | ---------------------------- |
| `ASE-35`         | Remaining parser and security parity blockers from `docs/parity-matrix.md`       | `done`                | `ASE-34` umbrella                                          | `ASE-37`, `ASE-39`           |
| `ASE-36`         | Remaining rendering and interaction parity blockers from `docs/parity-matrix.md` | `done`                | `ASE-34` umbrella                                          | `ASE-37`, `ASE-39`           |
| `ASE-38`         | Baseline lint gate and evidence-artifact hygiene                                 | `done`                | `ASE-34` umbrella                                          | `ASE-41`, `ASE-42`, `ASE-43` |
| `ASE-40`         | Dependency and license exception re-review for the first trusted release         | `done`                | `ASE-34` umbrella                                          | `ASE-42`, `ASE-43`           |
| `ASE-37`         | Remaining test-migration inventory and unresolved `P0` evidence                  | `done`                | `ASE-35`, `ASE-36`                                         | `ASE-41`, `ASE-43`           |
| `ASE-39`         | Baseline `pnpm test` gate on the candidate head                                  | `done`                | `ASE-35`, `ASE-36`                                         | `ASE-41`, `ASE-42`, `ASE-43` |
| `ASE-41`         | Repo-hosted nightly full-parity evidence for the reviewed head                   | `done`                | `ASE-37`, `ASE-38`, `ASE-39`                               | `ASE-42`, `ASE-43`           |
| `ASE-42`         | First repo-hosted release workflow provenance evidence                           | `done`                | `ASE-38`, `ASE-39`, `ASE-40`, `ASE-41`                     | `ASE-43`                     |
| `ASE-43`         | Final `PLAN.md`, release-audit, and platform-status synchronization              | `done`                | `ASE-37`, `ASE-38`, `ASE-39`, `ASE-40`, `ASE-41`, `ASE-42` | final closeout               |

#### P6-03 Execution Order

1. Run the independent implementation and policy tracks in parallel: `ASE-35`, `ASE-36`, `ASE-38`, and `ASE-40`.
2. Once the remaining surface work landed, close the evidence gaps that depended on it: `ASE-37` and `ASE-39`.
3. Rebuild repo-hosted nightly parity evidence on the reviewed head through `ASE-41`.
4. After nightly evidence, lint hygiene, baseline tests, and dependency decisions agreed, produce repo-hosted release provenance in `ASE-42`.
5. After the blocker tickets above closed, perform final document and platform status synchronization in `ASE-43`.

## Suggested Execution Order

### Track 1: Foundation

- P0-01
- P0-02
- P0-03
- P0-04
- P1-01
- P1-02
- P1-03
- P1-04

### Track 2: Test Infrastructure

- P2-01
- P2-02
- P3-01
- P3-02
- P3-03
- P3-04
- P3-06
- P3-07

### Track 3: High-Risk Parity

- P2-03
- P2-04
- P2-05
- P3-05
- P3-09
- P4-01
- P4-02
- P4-03

### Track 4: Full Feature Parity

- P4-04
- P4-05
- P4-06
- P4-07
- P4-08
- P4-09
- P4-10
- P4-11
- P4-12

### Track 5: Stabilization

- P5-01
- P5-02
- P5-03
- P5-04
- P5-05

## Definition of Done

The plan is complete only when all of the following are true:

- Release builds are reproducible and policy-enforced
- Reference tests have been ported or explicitly waived with documented rationale
- API parity tests are green
- Parser parity tests are green
- Browser DOM parity tests are green for the agreed fixture suite
- Critical interaction parity tests are green
- All reference-supported features are implemented or explicitly documented as unsupported before release
- Documentation matches shipped behavior
