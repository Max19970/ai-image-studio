# Final code audit

Status: second-pass architecture audit, 2026-06-18.

This audit was run after the debt-zero release pass to check whether the project merely split large files into smaller bad modules or actually became maintainable.

## Audit scope

Reviewed:

- layer boundaries and internal import graph;
- workspace state, command, context and view-model composition;
- provider adapter and generation parameter contracts;
- generation runners, task lifecycle and batch reducer flow;
- storage repository, codecs, diagnostics and lazy asset loading;
- gallery archive/search/paging and thumbnail/full-asset hydration;
- CSS ownership, motion rules and UI primitive contracts;
- test/check coverage and release gates.

## Result

The project is in a good maintainable state. The refactor did not simply replace large monoliths with many equally tangled small files.

The current architecture has clear owner modules:

- `domain` holds shared stable concepts and pure helpers;
- `entities` own data/business concepts and registries;
- `providers` own client provider definitions;
- `processes` own workflows and side-effect orchestration;
- `features` own UI surfaces and section CSS;
- `interface` owns slots, placements, registry contracts and app-facing contexts;
- `app` wires state, commands and workspace contexts;
- `server` owns storage and provider proxy APIs.

## Findings fixed during this audit

### 1. Import cycle in generation parameter metadata

A small cycle existed:

```txt
logicalRegistry -> availability -> metadata -> logicalRegistry
```

It was not causing an observed runtime failure, but it was exactly the kind of "small goblin" that can make future edits fragile.

Fix:

- removed the `availability -> metadata` dependency;
- made label lookup use the current parameter definition directly;
- added `npm run imports:check` to prevent cycles from returning.

### 2. Entity layer importing process lifecycle helpers

`src/entities/storage/generationTasks.ts` imported pure status helpers from `src/processes/generation-task-lifecycle`.

That was a subtle layer leak: status normalization is a stable domain concept, while `processes` should own workflow orchestration.

Fix:

- moved shared status helpers to `src/domain/generationStatus.ts`;
- kept `src/processes/generation-task-lifecycle/status.ts` as a compatibility re-export;
- updated entities/features that only need pure status helpers to import from `domain`;
- added `no-entities-to-processes` to `arch:check:strict`.


## Extra polish pass

A follow-up pass closed the non-blocking architecture tails from this audit:

- split `server/index.ts` into a thin bootstrap plus `server/app.ts`, `server/http/*`, and domain route registrars under `server/routes/*`;
- split `src/domain/types.ts` into focused domain contracts (`workMode`, `imageParams`, `providerSettings`, `studioSettings`, `generationTask`, `providerProbe`, `apiTypes`) and updated consumers to import focused modules directly;
- split `src/interface/context/workspace.ts` into focused workspace context contracts (`tabs`, `gallery`, `detail`, `settings`, `sidebar`, `batchComposer`, `info`, `main`, `composerDock`) and updated consumers to import focused modules directly;
- replaced storage-boundary `Record<string, any>` with `JsonObject = Record<string, unknown>` and kept decode helpers as the explicit unknown-JSON boundary.

## Current guard rails

`npm run release:check` now includes:

```txt
arch:check:strict
imports:check
interface:check
params:check
providers:check
tasks:check
storage:check
css:check
motion:check
ui:check
debt:check
secrets:check
test
build
debt:check:strict
storage:audit:strict
```

## Remaining non-critical risks

The architecture-specific tails from the second audit were closed in the extra polish pass. The remaining risk is integration reality, not internal code structure:

1. Live provider behavior still requires manual QA with real credentials: generate/edit/batch/retry/cancel/probe/persistence reload.
2. Real browser/device interaction still deserves a final pass for keyboard focus, file picker flows, mobile scrolling/touch targets, and provider-specific latency/error behavior.

## Final verdict

The codebase is not perfect in the mathematical sense, but it is now structurally maintainable:

- no internal import cycles;
- no current strict architecture violations;
- no debt budget warnings;
- no large active logic monoliths left in the audited hotspots;
- provider/parameter/storage/task interfaces have explicit contracts and tests;
- CSS ownership is significantly improved and protected by budgets;
- release checks are strong enough to prevent the most likely regressions from silently returning.

The next meaningful improvements should be feature-driven, not broad refactoring-driven.
