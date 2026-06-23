# Image Studio — Architecture Audit 2026-06-22

Status: audit artifact. No runtime/UI implementation changes were made in this branch.

Worktree: `C:\Users\maxsh\.devspace\worktrees\image-studio-bf146d4d`  
Branch: `audit/architecture-2026-06-22`  
Main checkout used for dependency-backed checks: `C:\Users\maxsh\Documents\Codex\image-studio`

## Scope

This audit was done after the recent feature wave: ComfyUI provider/workflow work, Hires Fix, optional workflow plugins, Telegram integration, server-owned runtime/storage changes, gallery filesystem work, and UI restructuring.

The goal was not to run only static scanners. Static checks were used as evidence, but findings below are based on actual code inspection across `src/`, `server/`, `scripts/`, `tests/`, and existing architecture docs.

## Executive verdict

The project is still structurally salvageable and has several strong guardrails: architecture boundaries, interface registry, parameter registry, provider adapter checks, storage checks, CSS/motion/UI/secrets checks, and build output are present and mostly useful.

However, the current architecture has started accumulating real debt in the areas where recent features were added fastest:

1. server-owned generation runtime became a large multi-responsibility module;
2. ComfyUI workflow/plugin architecture now has an import cycle and duplicated parameter truth between client and server;
3. old client-side generation runner paths still coexist with new server-owned runner paths;
4. app command/state wiring is turning into a wide “knows everything” composition layer;
5. debt budgets and tests are no longer green, so the release confidence story is currently weaker than the code shape suggests.

Most of this is not catastrophic, but it should be treated as a consolidation stage before adding another major provider/integration/workflow family.

## Current verification evidence

### Checks run in the audit worktree

The audit worktree intentionally had no `node_modules`, so dependency-backed `build` was not treated as valid there. Source-only scripts still ran.

- `npm run verify:static` — failed at `imports:check`.
- `npm run debt:check` — failed.
- `npm run interface:check` — passed.
- `npm run params:check` — passed.
- `npm run providers:check` — passed.
- `npm run tasks:check` — failed.
- `npm run storage:check` — passed.
- `npm run css:check` — passed.
- `npm run motion:check` — passed.
- `npm run ui:check` — passed.
- `npm run secrets:check` — passed.

Audit worktree logs:

- `dev-only/generated/tmp/architecture-audit-verify-static-20260622.log`
- `dev-only/generated/tmp/architecture-audit-build-20260622.log` — invalid as build evidence because `node_modules` are absent in the managed worktree.

### Checks run in the main checkout

The main checkout was clean and had dependencies installed, so it was used only for command evidence.

- `npm run build` — passed.
- `npm run verify:static` — failed at `imports:check` with the same 3 cycles.
- `npm test` — failed at `tests/submit-route.test.ts`, test `generation task SSE sends compact deltas after the initial snapshot`, assertion `121 !== 1`.

Main checkout logs:

- `dev-only/generated/tmp/architecture-audit-main-build-20260622.log`
- `dev-only/generated/tmp/architecture-audit-main-verify-static-20260622.log`
- `dev-only/generated/tmp/architecture-audit-main-test-20260622.log`

Important positive change since the 2026-06-20 audit: `src/data/studio.defaults.json` and `src/data/interface-themes.json` are now tracked in the clean worktree, so the previous P0 reproducibility issue around missing source data appears fixed.

---

# Findings

## P0 — Static release gate is red because import cycles returned

`npm run verify:static` stops at `imports:check`.

Reported cycles:

```txt
server/providers/comfyui/workflowExtensionTypes.ts
  -> server/providers/comfyui/workflowTemplates.ts
  -> server/providers/comfyui/workflowExtensions.ts
  -> server/providers/comfyui/workflowExtensionTypes.ts

src/app/commands/types.ts
  -> src/app/workspace/state/useGenerationExecutionState.ts
  -> src/app/workspace/types.ts
  -> src/app/commands/types.ts

src/app/workspace/state/useGenerationExecutionState.ts
  -> src/app/workspace/types.ts
  -> src/app/workspace/state/useGenerationExecutionState.ts
```

### Why this matters

Import cycles are not just “scanner aesthetics” here. They indicate that ownership direction is becoming unclear:

- ComfyUI workflow extensions need workflow/config types, but those types currently live in `workflowTemplates.ts`, while `workflowTemplates.ts` imports the extension runtime.
- App command types import server submission state from a workspace hook, while the workspace hook imports `StateSetter` from workspace types, and workspace types import command types.

This creates fragile loading/refactor behavior and weakens the otherwise clean layer story.

### Concrete evidence

- `server/providers/comfyui/workflowExtensionTypes.ts` imports `ComfyUiResolvedGenerationConfig` and `ComfyUiWorkflow` from `workflowTemplates.ts`.
- `server/providers/comfyui/workflowTemplates.ts` imports `applyComfyUiModelConditioningExtensions` from `workflowExtensions.ts` and allocator/types from `workflowExtensionTypes.ts`.
- `src/app/commands/types.ts` imports `ServerSubmissionState` from `../workspace/state/useGenerationExecutionState`.
- `src/app/workspace/state/useGenerationExecutionState.ts` imports `StateSetter` from `../types`.
- `src/app/workspace/types.ts` imports command types and also imports `ServerSubmissionState` from the hook.

### Recommended cutover

1. Move ComfyUI workflow structural types to a neutral module, for example:
   - `server/providers/comfyui/workflowTypes.ts`
   - `server/providers/comfyui/workflowConfig.ts`
2. Keep `workflowTemplates.ts` as a consumer/builder, not the owner of extension-facing contracts.
3. Move `ServerSubmissionState` and `StateSetter` to a tiny neutral app type module, for example:
   - `src/app/workspace/workspaceStateTypes.ts`
   - or `src/app/commands/commandStateTypes.ts`
4. Re-run `npm run imports:check` and `npm run verify:static`.

### Acceptance evidence

- `npm run imports:check` reports `0 cycles found`.
- `npm run verify:static` proceeds past `imports:check`.

---

## P0/P1 — Test suite currently fails on server-owned SSE delta behavior

`npm test` in the main checkout failed at:

```txt
tests/submit-route.test.ts
  generation task SSE sends compact deltas after the initial snapshot

Expected values to be strictly equal:
121 !== 1
```

### Why this matters

This is directly connected to the server-owned runtime/history source-of-truth area. The failing test expects a compact delta for one newly created task, but the observed value suggests the runtime/test environment sees a much larger task set, likely persisted history leaking into what the test assumes is an isolated runtime.

`resetGenerationTaskRuntimeForTests()` resets in-memory runtime maps, queues, clients, and controllers, but it does not reset the persisted generation task store that `ensureRuntimeTasks()` can load from. That makes test correctness depend on ambient local storage state.

### Concrete evidence

- `server/processes/generationTaskRuntime.ts` loads persisted history inside `ensureRuntimeTasks()` via `loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'full' })`.
- `resetGenerationTaskRuntimeForTests()` clears runtime memory but not storage documents.
- The failed assertion saw `121` where the test expected `1`, which matches the pattern “120 persisted history items + 1 new task”.

### Recommended cutover

1. Make server generation runtime testable with injected repository/storage dependencies.
2. Ensure `resetGenerationTaskRuntimeForTests()` either resets the test store or uses an isolated in-memory store.
3. Avoid tests relying on real app-local persisted generation history.
4. Consider a `createGenerationTaskRuntime(deps)` factory and keep the process singleton as production wiring only.

### Acceptance evidence

- `npm test` passes from a checkout with existing local history.
- `tests/submit-route.test.ts` no longer depends on ambient local persisted state.

---

## P1 — `server/processes/generationTaskRuntime.ts` is a server-side God module

Current size: about 922 lines.

It owns all of these concerns at once:

- runtime task list singleton;
- mutation queue;
- persistence queue;
- SSE clients and delta signatures;
- single generation task creation;
- batch generation task creation;
- provider request submission;
- streamed response parsing;
- retry lifecycle publication;
- cancellation maps for tasks and batch items;
- image upsert/final filtering;
- storage serialization for client snapshots;
- gallery move/link/deep-copy/delete operations;
- folder path remapping;
- test reset.

### Why this matters

This is currently the most important architectural pressure point. Any change to generation, SSE, persistence, gallery filesystem, cancellation, or batch behavior now risks touching the same large module. It also makes tests hard to isolate, as seen in the failing SSE delta test.

### Concrete evidence

- `server/processes/generationTaskRuntime.ts` imports provider adapters, storage, response adapters, gallery filesystem helpers, batch reducer, scheduler, retry policy, and Express response types.
- Public exports from the file include generation starts, batch starts, cancel/delete/clear, gallery move/paste/delete operations, runtime reset, and SSE subscription.

### Recommended split

A low-risk split could be:

```txt
server/processes/generation-task-runtime/
  runtimeStore.ts          # runtimeTasks, mutation queue, persistence queue
  taskEvents.ts            # SSE clients, delta signatures, broadcasting
  singleRun.ts             # single task creation and pipeline binding
  batchRun.ts              # batch task creation, per-item controllers, scheduler binding
  providerPipeline.ts      # submit/read/stream/retry provider request pipeline
  cancellation.ts          # task and batch item controllers
  galleryMutations.ts      # move/paste/delete folder task operations
  imageState.ts            # upsert/final/clone image helpers
  index.ts                 # production facade preserving existing exports
```

### Acceptance evidence

- Existing route imports still use the facade.
- `npm test` and `npm run tasks:check` pass after updating the check to the new server-owned runtime contract.
- No single runtime submodule exceeds the calibrated debt budget.

---

## P1 — Debt budgets are no longer just warning; many growth caps fail

`npm run debt:check` failed.

### Over-300-line TS/TSX warning set

```txt
server/processes/generationTaskRuntime.ts: 922
server/providers/comfyui/workflowTemplates.ts: 488
server/providers/comfyui/progressStream.ts: 407
src/features/detail/sections/snapshot/DetailSnapshotSections.tsx: 353
src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx: 346
src/entities/generation-params/comfyui/state.ts: 331
server/tunnel/cloudflaredTunnel.ts: 321
src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx: 318
src/entities/provider/compatibility.ts: 310
```

### Growth-cap failures

```txt
src/features/detail/sections/snapshot/DetailSnapshotSections.tsx: 353 / limit 320
src/features/gallery/ResultsGallery.tsx: 144 / limit 90
src/features/gallery/model/galleryArchive.ts: 165 / limit 130
src/processes/storage-sync/generationTaskHistory.ts: 183 / limit 160
src/features/image-actions/elements/download-image/DownloadImageAction.tsx: 107 / limit 90
src/app/commands/createComposerCommands.ts: 96 / limit 90
server/http/cors.ts: 73 / limit 60
server/routes/generationRoutes.ts: 284 / limit 70
src/domain/generationTask.ts: 149 / limit 140
src/interface/context/workspace/gallery.ts: 97 / limit 80
server/providers/openai-compatible/requestHandlers.ts: 91 / limit 80
src/providers/openai-compatible/requestAdapter.ts: 142 / limit 140
src/providers/openai-compatible/responseAdapter.ts: 107 / limit 90
docs/PROVIDER_ADAPTER_CONTRACT.md: 152 / limit 150
```

### Why this matters

The project has intentionally installed debt budgets. They are now doing their job: highlighting where fast feature delivery pushed modules past their planned boundaries. This should be treated as real architecture evidence, not noise.

### Recommended cutover

Do not “raise the caps” first. First split the obvious ownership clusters:

1. `server/processes/generationTaskRuntime.ts`
2. `server/routes/generationRoutes.ts`
3. `server/providers/comfyui/workflowTemplates.ts`
4. `server/providers/comfyui/progressStream.ts`
5. `src/entities/generation-params/comfyui/state.ts`
6. `src/features/detail/sections/snapshot/DetailSnapshotSections.tsx`

Only after code is split should caps be recalibrated.

---

## P1 — Task lifecycle guardrail is stale relative to server-owned runtime

`npm run tasks:check` failed with:

```txt
Task lifecycle check failed: single runner does not use explicit sending/running/retrying transitions.
```

### What is actually happening

The old client-side single runner is now mostly an enqueue wrapper:

- `src/processes/generation-runner/singleRunner.ts` captures a snapshot, calls `enqueueServerGenerationRequest`, emits `queued`, and returns `taskId`.
- Actual `sending/running/retrying/succeeded/failed/cancelled` transitions happen in `server/processes/generationTaskRuntime.ts`.

So the failure has two sides:

1. the check still inspects the old client path as if it were the lifecycle owner;
2. the codebase still contains stale client-side batch runner/runtime paths that are no longer the production owner.

### Concrete evidence

- `scripts/check-task-lifecycle.mjs` reads `src/processes/generation-runner/singleRunner.ts` and expects literal `status: 'sending'`, `status: 'running'`, `status: 'retrying'`.
- `src/app/commands/generationCommands.ts` uses `runSingleGeneration()` for single generation but server-enqueues batch via `enqueueServerBatchGenerationRequest()`.
- `src/processes/batch-runner/batchRunner.ts` still contains a full client-side direct `submitImageRequest` runner, but `grep` shows no production import of `runBatchGeneration`.
- `src/infrastructure/api.ts` still exports `submitImageRequest`, and the only source usage found is the stale client batch runner.

Stage 4 update: this stale path has been cut over. `submitImageRequest` was removed from `src/infrastructure/api.ts`, `src/processes/batch-runner/batchRunner.ts` is now an explicit tombstone/quarantine module, and `scripts/check-task-lifecycle.mjs` asserts that browser-side direct provider submission does not return as a production lifecycle owner.

### Why this matters

This is a classic post-migration debt pattern: the product has moved to a new owner, but the old implementation and old architecture checks still exist. That creates confusion for future agents and can lead to fixes landing in the wrong path.

### Recommended cutover

1. Decide and document the current truth owner: server-owned runtime.
2. Remove or explicitly quarantine the old client-side batch runner if it is no longer production code.
3. Update `tasks:check` to inspect server-owned lifecycle modules.
4. Keep any remaining client code as enqueue/snapshot/UI-only code.
5. Delete `submitImageRequest` if no live production path needs direct provider submission.

### Acceptance evidence

- `npm run tasks:check` passes against the server-owned runtime contract.
- `grep -R "runBatchGeneration" src server tests` shows either no stale production path or an explicitly tested legacy module.
- There is one documented lifecycle owner.

---

## P1/P2 — ComfyUI has duplicate parameter/config truth across client and server

The ComfyUI feature set now exists in several parallel places:

- client UI state and defaults: `src/entities/generation-params/comfyui/state.ts`;
- client payload extension registry: `src/entities/generation-params/comfyui/extensions/*`;
- server payload/config normalization: `server/providers/comfyui/workflowTemplates.ts`;
- server workflow extension runtime: `server/providers/comfyui/workflowExtensions.ts`;
- server workflow extension types/allocator: `server/providers/comfyui/workflowExtensionTypes.ts`.

### Why this matters

Some duplication is unavoidable across client/server, but the current shape duplicates enough semantics that future ComfyUI options can easily drift:

- backend enum names differ between client (`bnkTiledKSampler`, `tiledDiffusion`) and server payload (`bnk_tiled_ksampler`, `tiled_diffusion`);
- clamps/defaults exist in client state and again in server workflow config normalization;
- plugin compatibility is represented in UI text and server validation;
- the workflow extension cycle proves the extension boundary is not clean yet.

### Recommended cutover

1. Introduce a neutral ComfyUI workflow option schema/manifest shared by client payload builders and server normalizers where possible.
2. Keep server-side validation authoritative, but generate or derive client defaults/labels from a provider-owned manifest.
3. Move workflow extension contracts away from `workflowTemplates.ts`.
4. Split `workflowTemplates.ts` into:
   - config normalization;
   - base graph builders;
   - sampler strategies;
   - hires-fix graph builder;
   - plugin validation.

### Acceptance evidence

- Adding a new ComfyUI workflow plugin requires one plugin manifest/definition plus one server workflow implementation, not several manual enum/default edits.
- `imports:check` passes.
- Tests cover payload mapping from UI state to server workflow config.

---

## P2 — `WorkspaceState` and `CreateAppCommandsArgs` are becoming “everything bags”

`src/app/workspace/types.ts` and `src/app/commands/appCommandTypes.ts` now expose very broad structures.

`WorkspaceState` includes:

- provider mode;
- settings;
- params;
- sidebar/navigation;
- gallery folders/pins/tags;
- attachments;
- tasks/history;
- selected task/image;
- busy/server submission;
- provider probing;
- request presets;
- batch composer state.

`CreateAppCommandsArgs` takes most of that again, plus derived values, setters, gallery functions, task history commands, probe setters, normalizer, active provider/model, warnings, payload, etc.

### Why this matters

The good news: UI features are split into placements and command groups. The risk: the command creation root has become a central dependency magnet. Any feature command can accidentally know about almost every other feature.

This weakens Single Responsibility at the app-composition layer and makes it easy for future features to bypass proper ownership boundaries.

### Recommended cutover

1. Split command factory args into narrow capability contexts:
   - `ComposerCommandDeps`
   - `BatchCommandDeps`
   - `GalleryCommandDeps`
   - `SettingsCommandDeps`
   - `DetailCommandDeps`
   - `ProviderProbeCommandDeps`
2. Make `createAppCommands` pass only the narrow subset each factory needs.
3. Move cross-feature commands into explicit use-case modules rather than giving every command factory the whole workspace.
4. Keep `WorkspaceState` as internal composition if needed, but do not export it as a de facto global app store contract.

### Acceptance evidence

- `createComposerCommands` cannot access gallery folders/tags unless a specific use case requires it.
- `createSettingsCommands` cannot access generation attachments unless explicitly required.
- App command types no longer form an import cycle with workspace hook types.

---

## P2 — Server route layer is parsing too much generation protocol inline

`server/routes/generationRoutes.ts` is 284 lines with a calibrated debt cap of 70.

It owns:

- JSON-ish form field parsing;
- provider mode id parsing;
- snapshot parsing;
- transport parsing;
- gallery path parsing;
- preview-stream header resolution;
- retry numeric fields;
- batch item file field mapping;
- route registration;
- legacy `/api/generate` and `/api/edit` compatibility routes;
- `/api/provider/submit` proxy route;
- generation task run/batch/cancel/delete/clear/SSE/live-image endpoints.

### Why this matters

Routes should be thin transport adapters. Right now they know too much about generation request internals, batch multipart naming, provider transport, and task lifecycle.

### Recommended split

```txt
server/routes/generation/
  registerGenerationRoutes.ts
  parseGenerationRequest.ts
  parseBatchGenerationRequest.ts
  taskRoutes.ts
  providerSubmitRoutes.ts
  liveImageRoutes.ts
  legacyRoutes.ts
```

### Acceptance evidence

- Main route file becomes a registrar.
- Request parsing is unit-tested separately.
- Debt budget for `server/routes/generationRoutes.ts` passes without raising the cap.

---

## P2 — Server-owned history and client fallback cache are close to split-brain territory

The current system has multiple actors touching generation history/task state:

- server runtime state and persistence: `server/processes/generationTaskRuntime.ts`;
- server task history store: `server/storage/generationTaskStore` and normalized storage modules;
- client SSE state: `src/app/hooks/useGenerationTaskHistory.ts`;
- client fallback cache: `src/processes/storage-sync/generationTaskHistory.ts` and local cache;
- client delete tombstones: `deletedTaskIdsRef` in the hook.

This may be intentional for offline/fallback UX, but the contract is not sharp enough. The failing SSE test suggests the server’s persisted history can unexpectedly influence runtime test expectations.

### Recommended cutover

1. Document one source of truth for active tasks: server runtime.
2. Document one source of truth for persisted history: server storage.
3. Treat client local cache as display fallback only, never as a mutation owner.
4. Make local tombstones a server-confirmed deletion queue or remove them once server delete is reliable.
5. Add tests for reconnect after local deletion, server deletion failure, and persisted history presence.

### Acceptance evidence

- A client reconnect cannot resurrect locally deleted tasks unless the server still owns them and the UI intentionally explains it.
- Tests pass with non-empty persisted history.

---

## P2/P3 — Provider extensibility is better than before, but still centrally registered

The provider adapter architecture is generally healthy:

- `server/providers/registry.ts` composes OpenAI-compatible and ComfyUI server adapters.
- `src/entities/provider/registry.ts` composes client provider definitions.
- `providers:check` passes.
- Adapter files themselves are small.

Still, adding a third major provider currently requires central edits in at least:

- server provider registry;
- client provider registry;
- provider-adapter check script expectations;
- probably generation surface registry if the provider has non-OpenAI parameters.

### Recommended cutover before provider #3

1. Use provider manifests as the registration unit.
2. Let checks iterate registered manifests rather than hardcoded provider module lists.
3. Keep the central registry as a composition root only.

### Acceptance evidence

- Adding a mock provider requires adding provider files/manifest and one registry entry, not editing scattered switch/check logic.
- Provider checks discover all registered adapters.

---

## P3 — Legacy mode compatibility remains widespread

Provider mode cutover is mostly in place, but `legacyWorkMode`, legacy provider submit path fallback, and legacy mode restoration still appear across several areas:

- `src/domain/providerMode.ts`
- `src/entities/provider/modeResolution.ts`
- `src/entities/provider/compatibility.ts`
- composer/batch prompt/actions UI checks using `providerMode.legacyWorkMode !== 'edit'`
- request restore uses snapshot `mode` as legacy fallback.

### Why this matters

This is acceptable during migration, but it should not become permanent architecture. The long-term source of truth should be provider mode + attachment policy + submit transport, not `WorkMode` plus provider mode plus fallback mapping.

### Recommended cutover

1. Mark `WorkMode` as compatibility-only in docs/types.
2. Introduce provider-mode helpers for UI labels/actions instead of direct `legacyWorkMode` checks in components.
3. Stop adding new logic that branches on legacy `WorkMode`.
4. Eventually migrate old snapshots/presets to provider-mode-aware data.

---

## P3 — Global CSS layers are controlled but still large

`css:check` passes and the project has a better CSS architecture than before. Still, `src/styles/layers/app-primitives.css` is 456 lines, while several component CSS modules are also large:

- `src/features/workspace/StudioInfoPage.module.css`: 424 lines;
- `src/features/composer/ComposerLayout.module.css`: 377 lines;
- `src/entities/generation-params/ParamControls.module.css`: 342 lines;
- `src/features/detail/sections/snapshot/DetailSnapshotSections.module.css`: 325 lines;
- `src/features/gallery/sections/filesystem/GalleryExplorerBar.module.css`: 327 lines.

### Why this matters

This is not the highest risk because CSS checks pass, but large CSS files are where subtle mobile/sticky/animation regressions often accumulate.

### Recommended cutover

- Split only when touching these areas next.
- Prefer extracting repeated layout primitives into shared components/tokens rather than adding more global selectors.
- Keep visual QA mandatory for these files.

---

# Strong areas to preserve

## Architecture boundary check is meaningful

`npm run arch:check:strict` passed with zero violations for:

- no import from legacy components;
- no legacy components to features;
- no shared upward imports;
- no domain upward imports;
- no entities to features/app;
- no entities to processes;
- no processes to app/features.

This is good. Do not weaken it to hide failures elsewhere.

## Interface registry is healthy

`npm run interface:check` passed:

```txt
56 definitions
59 placements
39 slots
6 reusable definitions used by multiple placements
0 legacy slot runtime files
```

The Definition/Placement architecture is still alive and useful.

## Parameter registry is healthy

`npm run params:check` passed:

```txt
16 logical parameter modules
16 field definitions
16 field placements
15 OpenAI-compatible payload serializers
15 snapshot participants
5 normalization participants
16 logical→UI links
16 logical→placement owner links
```

The parameter plugin direction is worth preserving, especially before more provider-specific options are added.

## Provider/storage/CSS/motion/UI/secrets checks passed

The following checks passed:

- `npm run providers:check`
- `npm run storage:check`
- `npm run css:check`
- `npm run motion:check`
- `npm run ui:check`
- `npm run secrets:check`

This means the project is not in broad collapse. The red areas are concentrated and fixable.

## Build passes in the dependency-backed main checkout

`npm run build` passed in the main checkout.

This means the audit findings are mostly architecture/test/guardrail issues rather than TypeScript compilation failures.

---

# Recommended consolidation plan

## Stage 1 — Restore green guardrails

- [ ] Break the 3 import cycles.
- [ ] Decide whether `tasks:check` should inspect server-owned runtime; update it accordingly.
- [ ] Fix `npm test` failure around SSE compact delta and persisted history leakage.
- [ ] Re-run `npm run verify:static`.

## Stage 2 — Split server-owned generation runtime

- [ ] Extract runtime state/persistence.
- [ ] Extract SSE event broadcasting/delta signatures.
- [ ] Extract provider request pipeline.
- [ ] Extract single runner binding.
- [ ] Extract batch runner binding/cancellation.
- [ ] Extract gallery task mutations.
- [ ] Add focused tests for each extracted unit.

## Stage 3 — Normalize ComfyUI workflow/plugin ownership

- [ ] Move workflow/config types out of `workflowTemplates.ts`.
- [ ] Split config normalization from workflow graph building.
- [ ] Split sampler strategy selection from base graph creation.
- [ ] Derive or centralize ComfyUI plugin defaults/schema where possible.
- [ ] Add tests for UI state → payload → server workflow config mapping.

## Stage 4 — Remove stale client generation paths

- [x] Confirm production no longer uses direct client `runBatchGeneration`.
- [x] Delete or quarantine old client batch runner.
- [x] Delete `submitImageRequest` if it only supports stale paths.
- [x] Keep client generation processes as snapshot/enqueue/event UX only.

Stage 4 evidence is captured in `docs/STAGE_4_REMOVE_STALE_CLIENT_GENERATION_PATHS_2026_06_23.md`.

## Stage 5 — Narrow app command/state contexts

- [ ] Split `CreateAppCommandsArgs` into feature-specific dependency objects.
- [ ] Move cross-feature use cases into explicit command modules.
- [ ] Break app command/workspace type cycles.
- [ ] Add an architecture check preventing command type imports from workspace hook implementation files.

## Stage 6 — Pay down debt-budget hotspots

- [ ] Split `server/routes/generationRoutes.ts`.
- [ ] Split `DetailSnapshotSections.tsx` into renderer sections.
- [ ] Split `ComfyUiSurfaceFields.tsx` and `ComfyUiParamState` into workflow option groups.
- [ ] Split `progressStream.ts` into websocket/progress/preview/history concerns.
- [ ] Re-run `npm run debt:check` before touching caps.

---

# Suggested priority order

1. **P0 imports/test gate:** import cycles + failing SSE test.
2. **P1 lifecycle ownership:** align `tasks:check` and remove stale client runner ambiguity.
3. **P1 server runtime split:** reduce the central risk module.
4. **P1/P2 ComfyUI split:** prevent workflow/plugin drift before more Comfy options are added.
5. **P2 command/state narrowing:** stop the app layer from becoming a global bag.
6. **P2/P3 provider manifest cleanup:** prepare for provider #3.
7. **P3 CSS/file-size polish:** handle opportunistically during UI work.

---

# Non-goals / not verified

- No visual QA was run because this audit did not change UI behavior.
- No live OpenAI-compatible provider request was sent.
- No live ComfyUI request was sent.
- No Telegram runtime/manual mini-app flow was tested.
- No code fixes were implemented in this branch; only this report was added.

---

# Final note

The most important theme is not “the code is bad”; it is “the recent architecture migration succeeded enough that old paths, old checks, and fast-added server/ComfyUI modules now need a consolidation pass.”

Do the consolidation before the next large feature wave, and the project should remain easy to extend.
