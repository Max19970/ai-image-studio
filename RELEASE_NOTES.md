# Release notes

## 1.3.3 — visual regression cleanup

- Fixed the detail page run-status card so it no longer sticks under the header while scrolling.
- Reworked the batch composer footer shelf so its actions are vertically centered and the background matches the rounded panel style.
- Verified with `npm run release:check` and focused desktop/mobile visual screenshots for `detail` and `batch-composer`.


## 1.3.2 — extra architecture polish

This patch closes the non-blocking architecture tails found in the final audit.

- Split `server/index.ts` into a thin bootstrap plus `server/app.ts`, `server/http/*`, and domain route registrars under `server/routes/*`.
- Split `src/domain/types.ts` into focused domain type modules and updated consumers to import from the focused modules directly.
- Split `src/interface/context/workspace.ts` into focused workspace context modules and updated consumers to import from the focused modules directly.
- Replaced storage-boundary `Record<string, any>` usages with an explicit `JsonObject = Record<string, unknown>` boundary.
- Updated architecture/storage/task checks and docs to match the split modules.
- Confirmed `npm run release:check` stays green after the polish pass.

## 1.3.1 — final audit hardening

This patch keeps the 1.3.0 debt-zero architecture intact and adds a second-pass audit fix.

- Moved shared generation status helpers into `src/domain/generationStatus.ts`, so entities/features no longer import workflow process modules for pure status logic.
- Added `npm run imports:check` and included it in `npm run verify:static` to prevent internal import cycles from returning.
- Strengthened architecture boundaries with an explicit `no-entities-to-processes` rule.
- Confirmed `npm run release:check`, strict debt budgets, storage audit, tests, and build are green after the audit.

## 1.3.0 — debt-zero architecture baseline

This release completes the post-migration debt-zero cleanup. The project is now organized around owner modules, explicit provider/parameter contracts, strict debt budgets, storage diagnostics, and release-readiness gates.

### Highlights

- Split workspace state, commands, and context assembly into domain-owned modules.
- Reduced global CSS and decomposed detail, batch composer, settings API, and gallery styles into owner modules.
- Added strict debt budget checks and made debt warnings empty for the baseline.
- Split generation task storage into repository, codecs, assets, rows, stats, diagnostics, and legacy fallback modules.
- Added storage audit, diagnostics, benchmark tooling, and backup/import design docs.
- Added gallery archive UX: search, filters, sort, progressive paging, filtered cleanup, thumbnail-first history loading, and lazy full-asset hydration.
- Hardened batch generation with reducer/progress modules and tests for streaming/final image behavior, partial failures, and cancellation.
- Hardened provider contracts with adapter-owned settings schemas, settings fields, probe classification, mocked contract tests, and error normalization tests.
- Hardened generation parameter architecture with `defineGenerationParam`, logical UI/placement/i18n ownership, provider/model-specific parameter availability profiles, and stricter registry checks.
- Added motion and UI primitive checks for expensive transitions, reduced motion, popover focus, keyboard navigation, ARIA hooks, and touch targets.
- Added `docs/RELEASE_READINESS.md` and upgraded `npm run release:check` to include strict debt and storage audit gates.

### Verification

Before release packaging:

```bash
npm run release:check
```

For visible UI/layout changes:

```bash
npm run verify:visual
```

For a full local gate when Chromium is available:

```bash
npm run verify:all
```

### Known manual QA bucket

Live provider behavior still depends on real provider credentials and should be checked manually:

- single generation;
- image edit;
- batch generation;
- retry/cancel/delete during live requests;
- provider quick check/full probe;
- encrypted history after refresh/server restart;
- real file picker flows;
- popovers/dropdowns, keyboard focus, and mobile touch/scroll behavior in a real browser.

## 1.2.1 - UX regression fixes

- Re-centered the settings workspace page after the CSS module migration.
- Restored CSS-module-safe entrance animations for Info, settings and popover panels.
- Reduced heavy transition jank by removing the app-wide grid animation and pausing decorative background motion during large workspace transitions.
- Fixed collapsed sidebar rail icon centering and added a visual screenshot scenario for the collapsed rail.

## 1.2.0 — architecture migration complete

This release completes the internal architecture transition that turned Image Studio from a hybrid refactor state into a modular local-first platform.

### Highlights

- Removed the old `src/components` catch-all layer from active architecture.
- Added enforceable layer boundary checks.
- Reduced `App.tsx` to a composition root and moved workspace state/commands/context assembly into `src/app/workspace`.
- Made Definition/Placement the only runtime UI composition path.
- Split the Settings API screen into provider/model/editor modules.
- Converted generation parameters into self-contained logical modules.
- Split OpenAI-compatible provider behavior into client/server adapter modules.
- Added explicit generation task lifecycle, retry policy, cancellation registry, and delayed parallel batch scheduler.
- Upgraded local encrypted persistence to Storage v2 with task metadata rows, full image assets, thumbnail assets, lazy asset modes, and encrypted app document buckets.
- Migrated CSS away from a large global stylesheet toward owner modules plus small global shell/mobile layers.
- Added unit tests, architecture checks, provider/params/storage/task/CSS checks, secret scanning, and visual screenshot smoke verification.

### Verification

Run before publishing or merging larger changes:

```bash
npm run verify:static
```

For visible UI/layout changes:

```bash
npm run verify:visual
```

The visual check is intentionally human-reviewed. It validates screenshot artifact generation and provides a stable screenshot set/contact sheet for manual inspection; it does not use pixel-diff comparison.

### Known manual QA bucket

Live provider behavior still depends on real provider credentials and should be checked manually:

- single generation;
- image edit;
- batch generation;
- retry/cancel/delete during live requests;
- provider quick check/full probe;
- encrypted history after refresh;
- real file picker flows;
- popovers/dropdowns and mobile touch/scroll behavior in a real browser.
