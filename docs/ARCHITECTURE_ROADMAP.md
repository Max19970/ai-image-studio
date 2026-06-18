# Image Studio architecture roadmap

Status: post debt-zero roadmap, 2026-06-18.

The foundational architecture migration and debt-zero cleanup are complete. This roadmap now tracks product work and optional architecture extensions, not another baseline refactor.

## Completed foundation

- `src/components` removed from active architecture.
- Layer boundary rules documented and enforced.
- `App.tsx` reduced to application composition.
- Workspace state, commands, and contexts split into domain-owned slices.
- Definition/Placement registry is the only runtime UI composition path.
- Settings API screen split into provider/model/editor/check modules with owned CSS.
- Generation parameters moved into explicit logical plugin modules.
- Provider adapters now own server settings schemas, client settings fields, and provider/model generation parameter profiles.
- OpenAI-compatible provider split into client/server adapter modules with contract tests.
- Task lifecycle, retry, cancellation, delayed parallel batch scheduler, and batch reducer/progress logic moved into process modules.
- Storage v2 split into repository/codecs/assets/rows/stats/diagnostics modules.
- Storage diagnostics, audit, benchmark, and backup/import design docs added.
- Gallery archive UX added: search, filters, sort, progressive paging, filtered cleanup, thumbnail-first loading, and lazy full-asset hydration.
- CSS moved from global monoliths into owner modules plus small global shell/mobile/motion layers.
- Motion checks prevent layout/filter-heavy transitions from returning.
- UI primitive checks cover popover focus, keyboard navigation, icon labels, ARIA hooks, and touch targets.
- Debt budgets, strict debt-zero mode, unit tests, secret scan, storage audit, and visual screenshot smoke checks are available.

## Remaining manual QA bucket

These are not architecture debt. They require a real browser and, for provider flows, real credentials.

- [ ] single image generation;
- [ ] image edit with target/reference/mask attachments;
- [ ] batch generation;
- [ ] interval between batch send starts;
- [ ] retry behavior against real transient failures;
- [ ] cancel/delete unfinished live request;
- [ ] provider quick check and full probe;
- [ ] refresh/reload persistence with real encrypted DB;
- [ ] file picker flows for target/reference/mask;
- [ ] popovers/dropdowns in real browser interactions;
- [ ] mobile scroll/touch on a real device or browser profile.

## Product roadmap candidates

### 1. Second real provider adapter

The contract is ready; the next proof is a provider with a truly different API/parameter surface.

Candidate work:

- add a second adapter package;
- adapter-owned settings schema and UI fields;
- adapter-owned `generationParams` profile;
- provider-specific request/response fixtures;
- probe/capability behavior;
- docs for provider limitations.

### 2. Provider/model parameter presets

Provider-specific parameter availability is implemented. A next UX step could expose curated model presets.

Candidate work:

- per-model recommended parameter sets;
- warnings for unsupported combinations;
- mode-specific default profiles;
- import/export provider profiles.

### 3. Backup/export/import implementation

The design exists; the product flow can be built when needed.

Candidate work:

- export all tasks/settings without secrets;
- import replace mode;
- post-import audit;
- selected-task export;
- optional merge mode after UX decisions.

### 4. Gallery archive depth

Archive basics exist. More management tools can be added without touching storage internals.

Candidate work:

- selected-task bulk mode;
- export selected tasks;
- retention policies;
- storage-size breakdown UI;
- virtualized list if real histories exceed progressive paging.

### 5. Visual QA workflow

The current visual check is human-reviewed by design.

Candidate work:

- better contact sheet generation;
- named visual review batches;
- full-page spot checks for long settings/detail screens;
- browser/device metadata in screenshot outputs;
- pixel/perceptual diff only if it proves useful, not by default.

### 6. Live provider integration tests

Do not put real credentials into automated tests. If needed later, add an opt-in local-only live test mode.

Candidate work:

- `LIVE_PROVIDER_TESTS=1` guarded scripts;
- local-only env key requirements;
- no CI by default;
- clear generated-data cleanup.

## Maintenance rules

- New UI element: add a definition.
- New place for an existing UI element: add a placement.
- New generation parameter: add a `defineGenerationParam` module.
- New provider behavior: add/extend a provider adapter.
- New provider parameter surface: add/extend provider `generationParams` profile.
- New workflow state: prefer a process module or workspace domain hook, not a feature component.
- New styles: put them next to the owning module; do not grow global layers.
- Before release: run `npm run release:check`; for visible changes, also run and manually review `npm run verify:visual`.
