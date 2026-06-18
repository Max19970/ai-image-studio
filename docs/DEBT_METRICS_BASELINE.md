# Image Studio debt metrics

Captured: 2026-06-18.

This document started as the Stage 1 debt baseline. It now records both the original warning-heavy state and the final debt-zero state.

## Original Stage 1 baseline

At the beginning of debt-zero work, `npm run debt:check` passed only in warning/growth-cap mode and reported these hotspots:

```txt
server/storage/generationTaskStore.ts: 495 lines
src/features/detail/detailUi.tsx: 413 lines
src/features/detail/ImageDetailPage.module.css: 1127 lines
src/features/batch-composer/MultiImageComposer.module.css: 614 lines
src/features/settings/sections/generation-api/GenerationApiSettingsSection.module.css: 508 lines
src/styles/layers/*.css: 2596 total lines
src/styles/layers/mobile.css: 1453 lines
src/styles/layers/app-shell-and-primitives.css: 992 lines
```

Stage 1 introduced:

```bash
npm run debt:check
npm run debt:check:strict
```

`debt:check` prevented hotspots from growing while cleanup was in progress. `debt:check:strict` represented the future debt-zero target and was expected to fail until later stages.

## Final debt-zero state

After CSS ownership cleanup, workspace/command/context splits, detail/batch/settings CSS decomposition, storage repository split, gallery archive work, and provider/parameter contract hardening:

```txt
Debt budget warnings: none
npm run debt:check:strict: passed
```

Representative final reductions:

```txt
src/styles/layers/mobile.css: 1453 -> ~139 lines
src/styles/layers/*.css total: 2596 -> under strict target
src/features/detail/ImageDetailPage.module.css: 1127 -> 23 lines
src/features/batch-composer/MultiImageComposer.module.css: 614 -> 54 lines
src/features/settings/sections/generation-api/GenerationApiSettingsSection.module.css: 508 -> 68 lines
server/storage/generationTaskStore.ts: 494 -> 12 lines
src/app/workspace/useWorkspaceState.ts: 149 -> 28 lines
src/app/commands/appCommands.ts: 233 -> 24 lines
src/app/workspace/createWorkspaceContexts.ts: 83 -> 21 lines
```

## Current release gates

```bash
npm run debt:check
npm run debt:check:strict
npm run release:check
```

`release:check` includes strict debt enforcement and storage audit strict mode.

## Maintenance rule

If a warning returns, either reduce the file immediately or intentionally recalibrate the budget in the same change with an explanation. Do not allow warning-mode debt to become background noise again.
