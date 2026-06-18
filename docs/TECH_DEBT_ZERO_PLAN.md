# Image Studio — debt-zero architecture plan

Version: 2026-06-18  
Status: completed debt-zero checklist  
Scope: post-migration cleanup of the current modular codebase, not a rewrite.

---

## Status legend

- `[ ]` not started
- `[~]` in progress
- `[x]` done
- `[!]` blocked / needs a decision
- `[?]` needs manual verification

---

## Current baseline

The current project is already past the large migration phase. The goal is no longer to move away from `src/components` / one giant global stylesheet / one central `App.tsx`; that foundation is already in place.

Confirmed baseline:

- [x] `src/components` is no longer an active architecture layer.
- [x] Strict architecture boundary check passes with 0 violations.
- [x] Interface registry check passes.
- [x] Generation params registry check passes.
- [x] Provider adapter architecture check passes.
- [x] Task lifecycle architecture check passes.
- [x] Storage architecture check passes.
- [x] CSS architecture check passes.
- [x] Secret scan passes.
- [x] Unit tests pass: 42/42 after Stage 11.1.
- [x] Strict debt budget check passes.
- [x] Storage audit strict passes.
- [x] TypeScript + production build pass.

Observed debt hotspots:

- CSS ownership is still the biggest debt area.
- `src/styles/layers/mobile.css` is too large and too global.
- `src/styles/layers/app-shell-and-primitives.css` still mixes shell and primitive styles.
- `src/features/detail/ImageDetailPage.module.css` is a large local stylesheet.
- `server/storage/generationTaskStore.ts` is a dense repository/codec/asset mapper in one file.
- `src/app/workspace/useWorkspaceState.ts` centralizes many unrelated state slices.
- `src/app/commands/appCommands.ts` is a broad command aggregator.
- Batch generation is modular enough now, but future queue features would push it past a comfortable complexity level.

Top file-size signals at the start of this plan:

```txt
1452  src/styles/layers/mobile.css
1126  src/features/detail/ImageDetailPage.module.css
 991  src/styles/layers/app-shell-and-primitives.css
 613  src/features/batch-composer/MultiImageComposer.module.css
 507  src/features/settings/sections/generation-api/GenerationApiSettingsSection.module.css
 494  server/storage/generationTaskStore.ts
 455  src/features/gallery/ResultsGallery.module.css
 412  src/features/detail/detailUi.tsx
 240  src/processes/batch-runner/batchRunner.ts
 233  src/app/commands/appCommands.ts
```

---

## Global working rules

These rules apply to every stage.

- [ ] Work in small, behavior-preserving passes unless a stage explicitly changes behavior.
- [ ] Start every stage by running or confirming `npm run verify:static`.
- [ ] End every stage with `npm run verify:static`.
- [ ] For visual/layout/motion changes, also run `npm run verify:visual` and manually review screenshots.
- [ ] Update this checklist after every completed sub-step.
- [ ] Do not add new global CSS unless the style is truly application-wide.
- [ ] Do not add new state to `useWorkspaceState` without first checking if it belongs to a domain hook.
- [ ] Do not add provider-specific behavior outside provider adapters.
- [ ] Do not add storage behavior directly into server routes if it belongs in a repository module.
- [ ] Do not split code into tiny files only for cosmetic reasons; split by ownership, lifecycle, and change frequency.

Definition of perfect enough:

- The project remains understandable to a new maintainer.
- Common changes have obvious homes.
- Static architecture checks prevent regression.
- CSS changes are mostly local.
- Storage and generation processes have clear contracts.
- Visual behavior is manually verifiable and stable.
- No known high-risk debt remains undocumented.

---

# Stage 0 — Plan lock and debt register

## Why

Before changing code, freeze a shared map of what counts as debt, what does not, and how progress will be tracked. This prevents another endless refactor loop where the goal keeps moving.

## What we do

- Add this document as the living checklist.
- Keep the old migration plan as historical context.
- Add a small debt register that lists active debt items, owners, stage, and status.
- Define per-stage acceptance criteria.

## How

- Keep `docs/ARCHITECTURE_MIGRATION_PLAN.md` as completed migration history.
- Keep `docs/ARCHITECTURE_ROADMAP.md` as broad future roadmap.
- Use this file as the operational debt-zero checklist.
- Optionally add `docs/ARCHITECTURE_DEBT_REGISTER.md` if the checklist becomes too large.

## Checklist

- [x] Inspect current archive structure.
- [x] Confirm the project is already post-migration.
- [x] Identify current hotspots by file size and layer responsibility.
- [x] Draft debt-zero staged plan.
- [x] Add/commit this plan to the project repository.
- [ ] Decide whether to keep a separate debt register or use this document only.
- [x] Run `npm run verify:static` before the first code-changing stage.

## Definition of Done

- The plan exists in the project.
- Every future stage has a checklist and clear purpose.
- Current debt hotspots are explicit and not hidden in chat history.

---

# Stage 1 — Verification gates and debt metrics

## Why

The current checks are already strong, but debt-zero work needs stricter regression gates. We need to prevent the same kinds of debt from growing back while refactoring.

## What we do

- Turn current architecture checks into measurable debt budgets.
- Add file-size / CSS-size warnings for known hotspots.
- Add more targeted checks for forbidden growth.
- Keep checks practical: warnings first, hard failures only after cleanup.

## How

- Extend or add scripts under `scripts/`:
  - `check-file-size-budget.mjs`
  - `check-css-ownership.mjs` or extend `check-css-architecture.mjs`
  - optional `check-workspace-complexity.mjs`
- Introduce budgets in stages:
  - current baseline as warning thresholds;
  - lower thresholds after the relevant cleanup stage;
  - hard fail only after the project satisfies the new target.

Suggested initial budgets:

```txt
warning: any TS/TSX file > 300 lines
warning: any module CSS file > 500 lines
warning: global CSS layers total > 2500 lines
warning: mobile.css > 1200 lines
warning: app-shell-and-primitives.css > 800 lines
```

Suggested final budgets:

```txt
hard fail: global CSS layers total > 1600 lines
hard fail: mobile.css > 500 lines
hard fail: app-shell-and-primitives.css > 500 lines
warning: feature module CSS > 450 lines
warning: app/workspace hook > 220 lines
warning: server repository file > 300 lines
```

Implemented in Stage 1:

- `scripts/check-debt-budgets.mjs` runs debt budget checks.
- `npm run debt:check` runs warning-mode budgets plus hard growth caps calibrated against the current hotspots.
- `npm run debt:check:strict` runs future target budgets and is expected to fail until later cleanup stages.
- `docs/DEBT_METRICS_BASELINE.md` records the current warning output and exact thresholds.
- `npm run verify:static` now includes `npm run debt:check`.


## Checklist

- [x] Record current static check output in `docs/DEBT_METRICS_BASELINE.md`.
- [x] Add file-size budget script in warning mode: `scripts/check-debt-budgets.mjs`.
- [x] Add CSS growth budget checks in warning/growth-cap mode.
- [x] Add commands to `package.json`: `debt:check` and `debt:check:strict`.
- [x] Add `debt:check` to `verify:static` after calibration.
- [x] Document which thresholds are warnings and which are hard failures.
- [x] Make sure `npm run verify:static` remains green.

## Definition of Done

- Debt growth is visible.
- The project can warn when a hotspot grows again.
- No cleanup stage can silently recreate a giant file.

---

# Stage 2 — CSS ownership cleanup

## Why

CSS is the largest remaining architecture debt. Global mobile and shell styles make unrelated screens influence each other and make visual regressions likely.

## What we do

- Reduce global CSS layers.
- Move responsive behavior closer to owning features.
- Separate app shell, primitives, tokens, effects, and page-specific styles.
- Keep visual behavior the same unless explicitly improving a known bug.

## How

Work in thin passes:

1. Map selectors in `mobile.css` by owning feature.
2. Move feature-specific mobile rules into the corresponding module CSS.
3. Split `app-shell-and-primitives.css` into clearer layer files:
   - `app-shell.css`
   - `theme-surfaces.css`
   - `motion.css`
   - `primitive-defaults.css`
4. Keep only true cross-app rules in global layers.
5. Run screenshot scenarios after each visible batch.

Target ownership:

```txt
workspace shell / sidebar      -> features/workspace/*.module.css or styles/layers/app-shell.css
composer mobile behavior       -> features/composer/*.module.css
batch composer mobile behavior -> features/batch-composer/*.module.css
gallery mobile behavior        -> features/gallery/*.module.css
detail mobile behavior         -> features/detail/*.module.css
settings mobile behavior       -> features/settings/**/*.module.css
primitive defaults             -> shared/ui/* or primitive CSS layer
```

## Checklist

- [x] Build selector ownership map for `mobile.css`.
- [x] Move gallery mobile rules to gallery-owned CSS or shared primitive ownership. Remaining gallery-related mobile selectors are shared empty/spinner/status primitives.
- [x] Move detail mobile rules to detail-owned CSS or shared primitive ownership. Remaining detail-related mobile selectors are shared `detail-card` / inspector primitives pending Stage 5 deeper detail split.
- [x] Confirm composer mobile behavior is already owned outside the global mobile quarantine.
- [x] Confirm batch composer mobile behavior is already owned outside the global mobile quarantine; only shell padding override remains for the open state.
- [x] Move settings mobile rules to settings-owned CSS.
- [x] Move sidebar/workspace mobile rules to workspace-owned CSS or shell layer.
- [x] Split `app-shell-and-primitives.css` into `app-shell.css` and `app-primitives.css`.
- [x] Remove obsolete selectors after the first mobile cleanup pass.
- [x] Continue removing obsolete selectors after later CSS passes. Detail/settings/gallery/batch feature-local cleanup completed through the tail-closure pass.
- [x] Lower `mobile.css` and global CSS layer warning/growth thresholds after the first cleanup.
- [x] Lower remaining feature CSS warning thresholds after detail/batch/settings cleanup. Debt warnings are now empty and batch/settings/detail CSS growth caps are calibrated by owned section files.
- [x] Run `npm run verify:static`.
- [x] Run visual screenshots and manually review gallery/settings/detail/batch/mobile. Full capture hit a Puppeteer `ConnectionClosedError` after partial capture; reran the missing mobile scenarios separately and `check-screenshot-artifacts` passed for the combined 16 screenshots.



## Stage 2 progress notes

Stage 2 completed on 2026-06-18:

- `src/styles/layers/mobile.css` reduced from 1452 lines to 138 lines.
- Split `src/styles/layers/app-shell-and-primitives.css` into `app-shell.css` and `app-primitives.css`.
- Global CSS layer total reduced from 2593 lines to 907 lines.
- Removed obsolete legacy mobile selectors for the old top mobile nav and global drawer trigger/backdrop. Sidebar mobile behavior is already owned by `StudioSidebar.module.css`.
- Moved the remaining settings-specific global mobile helper classes to `src/features/settings/mobileSettingsPrimitives.css` and imported them from `SettingsPage.tsx`.
- Recalibrated debt budgets so `mobile.css`, `app-shell.css`, `app-primitives.css`, and total global layer size cannot grow back silently.
- `npm run verify:static` passed.
- Screenshot artifacts were captured for all desktop/mobile scenarios. Full capture hit Puppeteer connection closure after partial capture, but the missing mobile scenarios were captured in a second run and artifact validation passed for the complete set.

## Definition of Done

- `mobile.css` is small and only contains truly cross-app responsive rules.
- App shell and primitive styles are not mixed in one large file.
- Visual changes are verified by screenshots.
- New CSS has clear ownership.

---

# Stage 3 — Workspace state decomposition

## Why

`useWorkspaceState` currently owns many unrelated concerns. This makes changes to one part of the app more likely to re-render or mentally affect unrelated parts.

## What we do

Split the workspace state into domain hooks without changing UI behavior.

## How

Create focused hooks:

```txt
src/app/workspace/state/useComposerWorkspaceState.ts
src/app/workspace/state/useSettingsWorkspaceState.ts
src/app/workspace/state/useNavigationWorkspaceState.ts
src/app/workspace/state/useTaskSelectionState.ts
src/app/workspace/state/useProviderProbeState.ts
src/app/workspace/state/useBatchWorkspaceState.ts
src/app/workspace/state/usePersistentWorkspaceSettings.ts
```

Then keep `useWorkspaceState` as a small composition hook.

Avoid premature store libraries. React hooks are enough unless profiling proves otherwise.

## Checklist

- [x] Group existing state fields by domain.
- [x] Extract navigation/sidebar/tab state.
- [x] Extract composer files/mode state.
- [x] Extract settings/params persistence state.
- [x] Extract task history and selection state.
- [x] Extract provider probe/quick-check state.
- [x] Extract batch composer state.
- [x] Keep public `WorkspaceState` contract stable where possible.
- [x] Confirm no feature imports app internals directly.
- [x] Run `npm run verify:static`.
- [?] Manually test tab switching, sidebar collapse, generation, batch composer, settings hydration. Screenshot scenarios passed; real interactive generation/settings hydration should still be checked in browser.


## Stage 3 progress notes

Stage 3 completed on 2026-06-18:

- Split `src/app/workspace/useWorkspaceState.ts` into focused state hooks under `src/app/workspace/state/`.
- Reduced `useWorkspaceState.ts` from 149 lines to 28 lines.
- Added domain hooks for settings/params persistence, navigation, composer files/mode, task history/selection, provider probe state, batch composer state, and generation execution busy state.
- Moved provider probe report hydration and provider-change cache refresh out of `useWorkspaceDerivedState`, making derived state closer to a pure derivation layer.
- Kept the public `WorkspaceState` contract stable so commands, contexts, slots, and feature components did not require cascade edits.
- Added growth caps for the new workspace state files in `scripts/check-debt-budgets.mjs`.
- Confirmed that feature/entity/process/shared/interface layers do not import app internals directly.
- `npm run verify:static` passed.
- `npm run verify:visual` hit the known Puppeteer `ConnectionClosedError` after partial capture; missing mobile scenarios were recaptured separately and `npm run visual:check` passed for all 16 expected artifacts.
- `npm run debt:check:strict` now fails only on `server/storage/generationTaskStore.ts`, meaning the workspace state strict target is satisfied.

## Definition of Done

- `useWorkspaceState` is composition, not a state dump.
- New state has obvious ownership.
- Adding a new tab/workflow does not require editing a giant state hook.

---

# Stage 4 — Command/context stabilization

## Why

`createAppCommands` is a broad aggregator. It is useful, but it currently accepts many dependencies and creates large command objects. This can hurt readability and increase unnecessary context churn.

## What we do

Split command creation by domain and stabilize context values.

## How

Create domain command factories:

```txt
src/app/commands/createWorkspaceCommands.ts
src/app/commands/createComposerCommands.ts
src/app/commands/createGalleryCommands.ts
src/app/commands/createBatchComposerCommands.ts
src/app/commands/createSettingsCommands.ts
src/app/commands/createDetailCommands.ts
src/app/commands/createParameterCommands.ts
```

Then compose them in `createAppCommands`.

Also review `createWorkspaceContexts.ts` and context providers:

- keep contexts split by consumer domain;
- avoid passing huge objects to consumers that need one setter;
- memoize context slices only when dependencies are stable.

## Checklist

- [x] Split command args by domain.
- [x] Extract composer commands.
- [x] Extract gallery commands.
- [x] Extract batch commands.
- [x] Extract settings/provider commands.
- [x] Extract detail commands.
- [x] Extract parameter panel commands.
- [x] Review context slice dependencies.
- [x] Reduce broad command object churn where practical.
- [x] Add growth caps for the new command/context composition files.
- [x] Run `npm run verify:static`.
- [x] Run screenshot artifact verification for all standard desktop/mobile scenarios.
- [?] Manually test all command surfaces with a real browser/provider session. Screenshot artifact checks passed; actual provider submit/probe still benefits from manual smoke testing.

## Stage 4 progress notes

Stage 4 completed on 2026-06-18:

- Split `src/app/commands/appCommands.ts` into domain command factories under `src/app/commands/`.
- Reduced `createAppCommands` from 233 lines to 24 lines; it now only composes domain command slices.
- Added `appCommandTypes.ts` so the broad workspace dependency surface is explicit and not hidden inside one factory implementation.
- Added focused factories for workspace, composer, gallery, batch composer, settings/provider, detail, and parameter modal commands.
- Split `createWorkspaceContexts.ts` into sidebar/main/dock/modal context factories under `src/app/workspace/contexts/`.
- Reduced `createWorkspaceContexts.ts` from 83 lines to 21 lines; it now only composes context slices.
- Added debt growth caps for the new command/context composition hotspots.
- `npm run verify:static` passed.
- `npm run verify:visual` hit the known Puppeteer `ConnectionClosedError` after partial capture; the missing mobile scenarios were recaptured separately and `npm run visual:check` passed for all 16 expected artifacts.
- `npm run debt:check:strict` still fails only on `server/storage/generationTaskStore.ts`, so the command/context layer is now inside strict debt-zero targets.

## Definition of Done

- Adding a command to one feature does not require understanding every feature command.
- Context values are meaningfully scoped.
- Behavior remains identical.

---

# Stage 5 — Detail page decomposition

## Why

Detail page debt is localized but large. This is a good kind of debt: it will not poison the whole app, but it will make result-page changes slower and riskier.

## What we do

Split detail UI and CSS into owned sections.

## How

Suggested structure:

```txt
src/features/detail/
  sections/
    detail-shell/
    image-stage/
    image-carousel/
    task-summary/
    generation-snapshot/
    attachment-summary/
    provider-metadata/
    detail-actions/
  model/
    selectDetailImage.ts
    detailViewModel.ts
```

The goal is not to create tiny files. The goal is to make each visual block independently changeable.

## Checklist

- [x] Map current detail page visual blocks.
- [x] Extract image stage section.
- [x] Extract carousel/selection section.
- [x] Extract task summary/status section.
- [x] Extract sent parameters/snapshot section.
- [x] Extract attachments section.
- [x] Extract actions section ownership remains registry-driven through `detail/actions`; visual action bar ownership moved to hero section CSS.
- [x] Split `ImageDetailPage.module.css` by section ownership.
- [x] Remove dead detail styles from the old monolithic stylesheet.
- [x] Recalibrate detail CSS growth caps.
- [x] Run `npm run verify:static`.
- [x] Run visual screenshots for detail desktop/mobile.


## Stage 5 progress notes

Stage 5 completed on 2026-06-18:

- `src/features/detail/ImageDetailPage.module.css` reduced from 1126 lines to 23 lines and now owns only the detail page shell.
- Replaced the old `detailUi.tsx` mini-monolith with a compatibility barrel plus focused modules:
  - `model/detailHelpers.tsx`
  - `sections/hero/DetailHeroSection.module.css`
  - `sections/hero/DetailThumb.tsx`
  - `sections/carousel/DetailResultCarousel.tsx`
  - `sections/carousel/DetailResultCarousel.module.css`
  - `sections/snapshot/DetailSnapshotSections.tsx`
  - `sections/snapshot/DetailSnapshotSections.module.css`
  - section-owned CSS for topbar and request drawer.
- Detail-related module CSS no longer appears in the generic `module CSS file over 500 lines` debt warning.
- `npm run verify:static` passed after the split.
- Captured and reviewed focused desktop/mobile detail screenshots in `artifacts/stage5-detail-visual`; artifact validation passed for both screenshots.

## Definition of Done

- Detail page CSS is no longer one giant file.
- Each section has a clear owner.
- Detail page changes become local and predictable.

---

# Stage 6 — Batch process hardening

## Why

Batch generation already has a process layer, delayed parallel scheduler, and shared retry policy. But future queue features would make the current runner too dense.

## What we do

Introduce an explicit event/reducer model around batch execution state.

## How

Keep external behavior the same, but make internal transitions explicit:

```txt
BatchEvent:
  batchStarted
  itemSendScheduled
  itemSendStarted
  itemRetryScheduled
  itemSucceeded
  itemFailed
  itemCancelled
  batchFinished

BatchState:
  status
  items
  progress
  errors
  cancellation
  timing
```

Use reducer tests to lock behavior before changing implementation deeply.

## Checklist

- [x] Document current batch state transitions in `docs/BATCH_PROCESS_TRANSITIONS.md`.
- [x] Add reducer/model tests for current behavior.
- [x] Extract batch task reducer event types.
- [x] Extract batch reducer.
- [x] Convert runner to dispatch events instead of manually mutating scattered state.
- [x] Preserve delayed-parallel interval semantics.
- [x] Preserve retry semantics.
- [x] Preserve cancellation/delete unfinished behavior.
- [x] Run `npm run verify:static`.
- [?] Manually test mono generation, batch generation, retry, cancellation, deletion with a real provider session.

## Stage 6 tail cleanup notes

Stage 6 tail cleanup completed on 2026-06-18: `MultiImageComposer.module.css` was split into shell plus section-owned CSS modules. The old batch composer CSS hotspot is gone and focused desktop/mobile visual screenshots passed.

## Definition of Done

- Batch behavior is easier to reason about.
- Queue features can be added without turning `batchRunner.ts` into a monster.
- Existing interval/retry/cancel behavior is preserved.
- `batchRunner.ts` stays an orchestration layer; task mutation lives in `batchTaskReducer.ts`.

---

# Stage 7 — Storage repository split

## Why

Storage v2 is architecturally valuable, but `generationTaskStore.ts` mixes repository behavior, codecs, asset collection, row mapping, and legacy compatibility.

## What we do

Split storage into focused modules while preserving DB schema and behavior.

## How

Suggested structure:

```txt
server/storage/generation-tasks/
  generationTaskRepository.ts
  generationTaskCodecs.ts
  generationTaskAssets.ts
  generationTaskRows.ts
  generationTaskStats.ts
  generationTaskLegacyFallback.ts
  types.ts
```

Do this without changing schema first. Schema changes, if any, should be a later explicit migration stage.

Implemented in Stage 7:

- `server/storage/generationTaskStore.ts` is now a compatibility barrel.
- Storage history implementation moved into `server/storage/generation-tasks/`.
- `generationTaskRepository.ts` owns public repository orchestration.
- `generationTaskCodecs.ts` owns task cloning, image collection, and asset-mode restoration.
- `generationTaskRows.ts` owns normalized SQLite row operations.
- `generationTaskAssets.ts` owns encrypted asset document I/O.
- `generationTaskStats.ts` owns storage statistics.
- `generationTaskLegacyFallback.ts` owns v1 history blob fallback/clearing.
- `tests/storage-generation-task-codecs.test.ts` covers risky image collection and metadata restoration mapping.
- `npm run debt:check:strict` now passes; remaining warnings are future Stage 6/14 CSS hotspots, not strict failures.

## Checklist

- [x] Map functions in current `generationTaskStore.ts` by responsibility.
- [x] Extract task encode/decode helpers.
- [x] Extract image/asset collection helpers.
- [x] Extract row mappers.
- [x] Extract storage stats helpers.
- [x] Extract legacy fallback handling.
- [x] Keep public API compatibility for server routes.
- [x] Add focused tests for codecs and asset collection.
- [x] Update storage architecture check for split repository modules.
- [x] Recalibrate storage debt budgets.
- [x] Run `npm run verify:static`.
- [x] Run `npm run debt:check:strict`.
- [?] Manually test persistence reload with generated tasks.

## Definition of Done

- No single storage file owns unrelated responsibilities.
- Storage tests cover risky mapping logic.
- DB behavior remains stable.

---

# Stage 8 — Incremental persistence and storage tooling

## Why

After repository split, the next risk is scale. Saving/loading large history snapshots can become expensive when the gallery grows.

## What we do

Improve storage operations and add management tools.

## How

Potential changes:

- prefer targeted `upsertTask` / `upsertAsset` flows;
- debounce client-side persistence updates;
- expose storage diagnostics in settings;
- add orphan asset audit command;
- add backup/export and import/restore path;
- add storage-size breakdown UI.

## Checklist

- [x] Measure current save/load behavior with a large fake history.
- [x] Add storage fixture generator for many tasks/assets.
- [x] Add targeted upsert APIs if needed. Decision: not needed yet; benchmark shows snapshot saves are acceptable at the measured scale.
- [x] Add debounced history persistence if current flow writes too often. Decision: not needed yet; keep current client path until real provider/session profiling proves write pressure.
- [x] Add orphan asset audit script.
- [x] Add storage diagnostics endpoint.
- [x] Add storage stats/tooling documentation.
- [x] Add backup/export design.
- [x] Add restore/import design.
- [x] Run `npm run storage:benchmark`.
- [x] Run `npm run storage:audit`.
- [x] Run `npm run verify:static`.
- [?] Manually test refresh/reload after multiple generated tasks.

## Definition of Done

- Storage remains fast with a large local archive.
- The user can understand and manage storage usage.
- Persistence behavior is robust enough for real dataset generation.

---

# Stage 9 — Gallery scale and archive UX

## Why

Storage v2 supports metadata/thumbnails/full assets separately, but the visible gallery should also scale like an archive, not just a short session list.

## What we do

Turn the gallery into a scalable browsing surface.

## How

Potential features:

- pagination or virtualization;
- metadata-first loading;
- lazy full-image loading;
- search/filter/sort;
- archive cleanup tools;
- export selected tasks/images;
- better empty/error/loading states.

## Checklist

- [x] Audit current gallery rendering path.
- [x] Confirm whether all tasks/images render at once.
- [x] Add metadata-first/gallery-light loading if not already enough. Decision: history loads thumbnail assets by default, with full assets loaded lazily.
- [x] Add lazy full asset loading in modal/detail surfaces.
- [x] Add basic sort/filter model.
- [x] Add pagination or virtualization if scale tests require it. Decision: progressive client paging renders the first 48 cards, then `Show more`.
- [x] Add archive cleanup UX. Added filtered-results cleanup behind active filters with a confirmation prompt; per-task delete/all-clear remain available.
- [x] Run `npm run verify:static`.
- [x] Run gallery visual checks desktop/mobile.

## Stage 9 progress notes

Stage 9 completed on 2026-06-18:

Stage 9 tail cleanup completed on 2026-06-18: filtered archive cleanup UX was added with confirmation, so the previously deferred cleanup item is closed.

- Added `src/features/gallery/model/galleryArchive.ts` with search, status/kind filters, sort modes, archive counters and progressive paging.
- Gallery now renders a bounded archive page first (`48` cards) and exposes a `Show more` control instead of always mounting the full visible history.
- Added gallery archive controls to the header: search, status filter, kind filter, sort and reset.
- Added empty-state behavior for filtered archives, separate from the true empty gallery state.
- Split gallery header CSS into `GalleryHeaderSection.module.css`, keeping `ResultsGallery.module.css` below the large-module warning threshold.
- Switched remote history loading to `assetMode=thumbnail` by default so reloads do not hydrate full image payloads into the gallery immediately.
- Added lazy full asset hydration for detail surfaces via `useHydratedDetailAssets`.
- Updated image download actions so thumbnail-loaded archive cards fetch the full stored asset before downloading.
- Guarded persistence against thumbnail overwrite: before saving a thumbnail-loaded history snapshot, storage sync loads full assets back from the encrypted store.
- Added gallery archive tests; total test count is now 30.
- Added debt growth caps for new gallery/archive/lazy-asset files.
- `npm run verify:static` passed.
- Focused gallery visual capture passed for desktop/mobile.

Deferred intentionally:

- Selected archive cleanup/export was not added yet. Per-task delete and clear-all remain available, but bulk selection/export needs its own UI pass so the gallery does not become cluttered.

## Definition of Done

- Large image history does not make the app feel heavy.
- Gallery changes are local and not tied to storage internals.
- Archive management has a clear UX path.

---

# Stage 10 — Provider adapter contract hardening

## Why

OpenAI-compatible provider code is currently clean. To prove the architecture, it should support at least one more provider shape without leaking provider-specific logic into UI or app commands.

## What we do

Formalize provider adapter contracts and add contract tests.

## How

- Define stricter adapter interfaces.
- Add fixture-based tests for request/response/probe behavior.
- Add a second adapter only after the contract is clear.
- Keep provider-specific settings/schema inside adapter modules.

## Checklist

- [x] Review current provider adapter interface.
- [x] Add contract test fixtures for OpenAI-compatible adapter.
- [x] Add error normalization contract tests.
- [x] Add probe classification tests.
- [x] Define how adapter-specific settings schemas are registered.
- [x] Add a second provider adapter candidate or documented mock adapter. Documented `mock-fixture-provider` candidate in `docs/PROVIDER_ADAPTER_CONTRACT.md`.
- [x] Confirm UI does not special-case provider internals.
- [x] Add provider contract architecture assertions to `npm run providers:check`.
- [x] Add debt growth caps for provider contract files.
- [x] Run `npm run verify:static`.
- [?] Manually test provider quick check/full probe with a real provider session.

## Definition of Done

- Provider ecosystem can grow without architecture drift.
- Adapter-specific behavior stays inside adapters.
- UI consumes stable capabilities, not raw provider quirks.

## Stage 10 progress notes

Implemented in Stage 10:

- Added adapter-owned server settings schema registration through `ProviderAdapterDefinition.settingsSchema`.
- Added adapter-owned client settings metadata through `ProviderAdapterDefinition.settingsFields`.
- Extracted probe classification into `server/providers/openai-compatible/probeClassifier.ts`.
- Added mocked provider contract tests for endpoint resolution, auth/custom headers, JSON generate, multipart edit, error normalization, probe classification, and quick-check failure normalization.
- Added `docs/PROVIDER_ADAPTER_CONTRACT.md` with server/client adapter contracts, adapter-specific settings rules, and the documented mock adapter candidate.
- Extended `scripts/check-provider-adapters.mjs` so provider contract pieces cannot disappear silently.

Verification:

- `npm run verify:static` passed.
- `npm run debt:check:strict` passed.
- Tests passed: 35/35.

Manual follow-up:

- Quick check/full probe still needs a real browser/provider-key session.

---

# Stage 11 — Generation parameters plugin polish

## Why

Generation parameters are already modular, but adding a new parameter still touches several points. This stage makes parameter addition more mechanical and safer.

## What we do

Improve the parameter module contract and reduce scattered wiring.

## How

A parameter module should ideally own:

- state key;
- default value;
- UI field definition;
- placement metadata;
- payload serializer;
- snapshot capture/restore behavior;
- validation/normalization;
- i18n keys or key namespace.

## Checklist

- [x] Document exact steps for adding a new parameter in `docs/GENERATION_PARAM_PLUGIN_CONTRACT.md`.
- [x] Review the 16 current parameter modules for duplication.
- [x] Identify wiring that can be derived from module metadata.
- [x] Add `defineGenerationParam` helper without hiding parameter behavior.
- [x] Add explicit logical→UI `fieldDefinitionId` ownership metadata.
- [x] Add explicit logical→placement `placementIds` ownership metadata.
- [x] Add explicit i18n namespace metadata.
- [x] Extend `npm run params:check` to enforce plugin ownership invariants.
- [x] Add tests for one fake parameter module through the helper.
- [x] Confirm raw JSON override behavior remains last-write-wins.
- [x] Add provider-owned generation parameter profiles.
- [x] Add provider/model-specific parameter availability rules.
- [x] Apply provider profile filtering to parameter modal rendering.
- [x] Apply provider profile filtering to OpenAI-compatible payload serialization.
- [x] Apply provider profile filtering to request snapshot capture when provider/mode are known.
- [x] Add contract tests for profile include/exclude/model override behavior.
- [x] Run `npm run verify:static`.

## Stage 11 notes

Dynamic form generation was intentionally not added. The useful boundary here is explicit ownership and automated contract checks, not hiding custom UI behind a generic schema renderer.

Stage 11.1 added provider-specific parameter availability. Provider adapters now own a `generationParams` profile that can expose all logical params, a custom subset, mode-specific subsets, model-specific exclusions, or a rare code-level availability function. This is applied to UI rendering, OpenAI-compatible payload serialization, and request snapshot capture.

## Definition of Done

- Adding a parameter is predictable and checklist-driven.
- The registry protects against missing serializer/snapshot/placement pieces.
- Provider adapters can expose completely different parameter surfaces without touching shared parameter UI by hand.
- Provider/model-specific params are filtered through a single availability contract, not scattered conditionals.
- No hidden parameter behavior lives in UI components.

---

# Stage 12 — UI primitives, accessibility, and popover behavior

## Why

The project has reusable primitives, but UI correctness also depends on focus behavior, keyboard navigation, popover placement, responsive controls, and accessibility.

## What we do

Harden reusable UI behavior without turning the app into a generic component-library project.

## How

Focus on primitives that caused or can cause real bugs:

- `FloatingPopover`
- `PopoverSelect`
- `AttachmentImageStrip`
- navigation buttons
- modal/dialog surfaces
- field info popovers

## Checklist

- [x] Audit popover positioning and resize behavior.
- [x] Add keyboard navigation for select/popover controls where missing.
- [x] Add escape/outside-click behavior regression check.
- [x] Check focus return after closing popovers with Escape/selection.
- [x] Check aria labels for icon-only buttons.
- [x] Check mobile/touch target sizes.
- [x] Add `npm run ui:check` and include it in `npm run verify:static`.
- [x] Document UI primitive/accessibility expectations in `docs/UI_ACCESSIBILITY_AUDIT.md`.
- [x] Run `npm run verify:static`.
- [x] Run visual checks for settings, parameters, detail, gallery.
- [?] Manually test keyboard navigation and focus behavior in a real browser session.

## Definition of Done

- Reusable UI primitives behave predictably.
- Accessibility basics are not accidental.
- Popover/dropdown bugs are less likely to regress.

---

# Stage 13 — Motion and performance pass

## Why

The user already observed slowdown during large animations and transitions. Even with clean architecture, motion can make the app feel heavy.

## What we do

Audit expensive animations, layout thrashing, context rerenders, and image rendering costs.

## How

- Prefer transform/opacity animations.
- Avoid animating layout-heavy properties where possible.
- Use `prefers-reduced-motion` paths.
- Profile sidebar collapse, page switches, info tab animation, batch composer transitions.
- Check whether context churn causes excessive rerenders.

## Checklist

- [x] Identify current major animations/transitions.
- [x] Audit sidebar collapse/expand motion path.
- [x] Audit tab switch to Info and Settings.
- [x] Audit batch composer open/close.
- [x] Audit gallery carousel/image transitions.
- [x] Replace layout-heavy animation where practical.
- [x] Add centralized motion tokens and reduced-motion fallbacks.
- [x] Add `npm run motion:check` to prevent layout/filter-heavy transitions from returning.
- [x] Confirm Info tab entrance animation remains intact in screenshot pass.
- [x] Run `npm run verify:static`.
- [x] Run focused visual screenshot check for gallery/sidebar/settings/detail/batch/info.
- [?] Manual Chrome Performance recording still recommended on a real browser/device.

## Definition of Done

- Heavy transitions feel smooth.
- Motion is centralized enough to reason about.
- Accessibility motion preferences are respected.

---

# Stage 14 — Settings/API UX and configuration model cleanup

## Why

Settings/API configuration is feature-rich and already split, but it is one of the most change-prone areas. It needs to remain easy to extend without becoming a dense settings monolith.

## What we do

Make settings sections more self-contained and ensure provider/model editing is predictable.

## How

- Review settings draft model.
- Review section/module boundaries.
- Keep settings tabs and sections registry-driven.
- Reduce CSS size in generation API section.
- Make validation and save/apply behavior explicit.

## Checklist

- [x] Audit settings section boundaries.
- [x] Split large generation API CSS by section if useful.
- [x] Extract provider editor sub-sections where they have independent lifecycle.
- [x] Review draft/save/cancel behavior.
- [x] Add tests for settings normalization if gaps exist.
- [x] Confirm visual theme previews are independent from current theme.
- [x] Run `npm run verify:static`.
- [x] Run settings visual checks desktop/mobile.
- [?] Manually test save/cancel, provider probe, keyboard selection and real API editing in a browser.

## Definition of Done

- Settings additions have obvious homes.
- Provider/model config remains understandable.
- Theme/language/settings UI does not regress visually.

---

# Stage 15 — Final cleanup, docs, and release readiness

## Why

After all structural debt is removed, documentation and checks need to represent the new reality. Otherwise future changes will be guided by outdated docs.

## What we do

- Update architecture docs.
- Remove obsolete docs or mark them as historical.
- Lock new debt thresholds.
- Run full verification.
- Prepare release checklist.

## How

- Update `docs/ARCHITECTURE.md` with final architecture map.
- Update `docs/ARCHITECTURE_ROADMAP.md` with remaining product work only.
- Keep completed migration plan archived.
- Add final debt-zero summary.
- Run static and visual verification.

## Checklist

- [x] Update architecture docs.
- [x] Mark old migration plan as completed history.
- [x] Update roadmap to remove completed cleanup items.
- [x] Lock final file-size/CSS debt budgets.
- [x] Add release-readiness document.
- [x] Upgrade `npm run release:check` to include strict debt and strict storage audit.
- [x] Run `npm run release:check`.
- [x] Run visual capture/check for the standard 16 desktop/mobile screenshots.
- [x] Manually review generated screenshots.
- [?] Run live provider QA checklist if real keys are available.
- [x] Prepare final release notes.

## Definition of Done

- The project has no known undocumented architecture debt.
- Checks prevent major regression.
- Docs match code.
- Strict debt warnings are empty.
- Release gates are documented and runnable.
- The next work can be product/features, not another foundational refactor.

## Stage 15 completion notes

Completed in Stage 15:

- Rewrote `docs/ARCHITECTURE.md` for the final debt-zero architecture map.
- Rewrote `docs/ARCHITECTURE_ROADMAP.md` as a post debt-zero product/extension roadmap.
- Rewrote `docs/ARCHITECTURE_TESTING.md` to document current verification gates and test coverage.
- Added `docs/RELEASE_READINESS.md` with release gates, manual QA checklist, public repository checklist, and known non-blockers.
- Marked `docs/ARCHITECTURE_MIGRATION_PLAN.md` as historical completed migration context.
- Updated `docs/DEBT_METRICS_BASELINE.md` with final debt-zero metrics.
- Updated `README.md` and `RELEASE_NOTES.md` for the 1.3.0 debt-zero baseline.
- Updated `release:check` to run `verify:static`, `debt:check:strict`, and `storage:audit:strict`.
- Added `release:visual` and `release:full` convenience scripts.

Verification:

- `npm run release:check` passed.
- Standard visual capture/check passed for 16 desktop/mobile screenshots. In the container, the full visual command can still hit transient Chromium/Puppeteer frame-detach behavior, so the final pass was completed with the same standard scenario set in resumed chunks and validated with `npm run visual:check`.
- Final archive was packaged without `node_modules`, `data`, `dist`, or `artifacts`.

---

## Live QA checklist after debt-zero work

These checks require a real browser and, for provider flows, real API credentials.

- [ ] Single image generation.
- [ ] Image edit with target attachment.
- [ ] Image edit with reference attachments.
- [ ] Image edit with mask attachment if supported.
- [ ] Batch generation.
- [ ] Batch interval between send starts.
- [ ] Retry after transient failure.
- [ ] Cancel unfinished mono request.
- [ ] Delete unfinished mono request.
- [ ] Cancel unfinished batch item.
- [ ] Delete unfinished batch task.
- [ ] Provider quick check.
- [ ] Provider full probe.
- [ ] Persistence after refresh.
- [ ] Persistence after server restart.
- [ ] Gallery thumbnail loading.
- [ ] Full image loading in detail view.
- [ ] Full image loading in preview modal.
- [ ] Settings save/cancel behavior.
- [ ] Theme switch visual preview.
- [ ] Language switch.
- [ ] Sidebar collapsed state.
- [ ] Mobile scroll.
- [ ] Mobile composer.
- [ ] Mobile settings.
- [ ] Mobile detail view.
- [ ] Popover/dropdown placement near viewport edges.
- [ ] Keyboard escape/focus behavior in modals/popovers.

---

## Suggested stage order

Recommended sequence:

1. Stage 0 — Plan lock and debt register.
2. Stage 1 — Verification gates and debt metrics.
3. Stage 2 — CSS ownership cleanup.
4. Stage 3 — Workspace state decomposition.
5. Stage 4 — Command/context stabilization.
6. Stage 5 — Detail page decomposition.
7. Stage 7 — Storage repository split.
8. Stage 6 — Batch process hardening.
9. Stage 13 — Motion and performance pass.
10. Stage 12 — UI primitives/accessibility/popovers.
11. Stage 14 — Settings/API UX cleanup.
12. Stage 8 — Incremental persistence and storage tooling.
13. Stage 9 — Gallery scale/archive UX.
14. Stage 10 — Provider adapter hardening.
15. Stage 11 — Generation parameters plugin polish.
16. Stage 15 — Final docs/release readiness.

Reasoning:

- First prevent new debt from growing.
- Then fix CSS, because it causes the widest visual regressions.
- Then split app state/commands, because it reduces rerender and change complexity.
- Then clean local feature monoliths.
- Then improve process/storage internals.
- Then finish with UX hardening, docs, and release gates.
