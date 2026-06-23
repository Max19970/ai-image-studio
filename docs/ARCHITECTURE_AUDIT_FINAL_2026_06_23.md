# Image Studio — Final Architecture Audit 2026-06-23

Status: final control audit after stages 1–8.  
Branch/worktree: `fix/architecture-audit-2026-06-22` / `C:\Users\maxsh\Documents\Codex\image-studio-architecture-audit-2026-06-22`

## Executive verdict

The architecture problems from `docs/ARCHITECTURE_AUDIT_2026_06_22.md` were mostly closed for real, not only hidden from checks.

The strongest evidence is that the control guardrails now pass as a full release-style chain:

- `npm run verify:static` — passed on the final rerun.
- `npm test` — passed inside `verify:static`; the direct equivalent `node --import tsx --test "tests/**/*.test.ts"` also passed separately with `183/183` tests green.
- `npm run build` — passed separately and inside `verify:static`.
- Import cycle scan — `617` internal source files scanned, `0` cycles found.

The only incomplete audit area is visual QA: the screenshot runner itself reached the requested scenario loop, but this DevSpace environment has no Chromium/Chrome/Edge executable available for Puppeteer. Because of that, no screenshots were captured in this final pass. This is an environment/browser availability blocker, not a detected UI regression.

## Verification summary

| Check | Result | Notes |
| --- | --- | --- |
| `npm run verify:static` | Passed | First foreground attempt timed out at 300s; final rerun passed. Full DevSpace output log: `C:\Users\maxsh\AppData\Local\Temp\pi-bash-a4136e4988f29a74.log`. |
| `npm test` | Passed | Passed inside `npm run verify:static`. Standalone `npm test` tool call was blocked by DevSpace safety, so the equivalent direct runner was also executed. |
| `node --import tsx --test "tests/**/*.test.ts"` | Passed | `183` tests, `183` pass, `0` fail. |
| `npm run build` | Passed | `tsc --noEmit && vite build`, Vite built successfully. |
| `npm run arch:check:strict` | Passed | `0` boundary violations across all strict architecture rules. |
| Import cycle scan | Passed | `617` files scanned, `0` cycles found. |
| `npm run interface:check` | Passed | `56` definitions, `59` placements, `39` slots, `0` legacy slot runtime files. |
| `npm run params:check` | Passed | `16` logical parameter modules and aligned UI/placement/payload/snapshot ownership. |
| `npm run providers:check` | Passed | `2` server provider manifests, `2` client provider manifests; OpenAI-compatible and ComfyUI contracts aligned. |
| `npm run tasks:check` | Passed | Server-owned runtime is lifecycle owner; legacy client batch runner is quarantined. |
| `npm run storage:check` | Passed | Storage schema v3, normalized task table, separated asset documents, lazy history modes, diagnostics. |
| `npm run css:check` | Passed | CSS layer checks pass; `app-primitives.css` remains large but under current warning budget. |
| `npm run motion:check` | Passed | Reduced-motion fallback and motion guardrails pass. |
| `npm run ui:check` | Passed | Popover/accessibility/touch-target guardrails pass. |
| `npm run debt:check` | Passed with warnings | Growth caps now pass. Remaining >300-line files are warning-level hotspots only. |
| `npm run secrets:check` | Passed | No obvious API keys/private keys/bearer tokens found. |
| Screenshot runner | Blocked by environment | `node scripts/capture-app.mjs --viewports=desktop,mobile --scenarios=gallery,settings-api,detail,batch-composer --out=artifacts/verify-screens` failed because Puppeteer could not find `/usr/bin/chromium`; no Chrome/Edge/Chromium executable was found in PATH or standard Windows install paths. |

## Finding-by-finding control audit

### 1. Import cycles

Status: closed.

Original audit found three cycles:

- ComfyUI workflow extension/types/templates cycle;
- app commands -> workspace execution state -> workspace types -> commands cycle;
- workspace execution state -> workspace types cycle.

Current evidence:

- Import cycle scan reports `0` cycles across `617` internal source files.
- `server/providers/comfyui/workflowExtensionTypes.ts` now imports workflow/config contracts from neutral `workflowTypes.ts`, not from `workflowTemplates.ts`.
- `server/providers/comfyui/workflowTemplates.ts` is now a compatibility facade that re-exports workflow builders/config/types.
- `src/app/stateTypes.ts` now owns `StateSetter` and `ServerSubmissionState`, removing the command/workspace hook type loop.

Verdict: the cycles were removed by moving ownership to neutral modules, not by suppressing the checker.

### 2. SSE compact delta test

Status: closed.

Original audit failure: `tests/submit-route.test.ts`, test `generation task SSE sends compact deltas after the initial snapshot`, assertion `121 !== 1`.

Current evidence:

- Full test suite passes: `183/183`.
- The SSE delta test now passes both in the standalone direct runner and inside `npm run verify:static`.
- `tests/submit-route.test.ts` uses an isolated temp DB path via `IMAGE_STUDIO_DB_PATH`, so the test no longer depends on ambient local generation history.
- `resetGenerationTaskRuntimeForTests()` now composes resets for cancellation, runtime store, and task events.
- `resetRuntimeStoreForTests()` sets `runtimeTasks = []`, preventing persisted history from being loaded into a supposedly clean runtime test.

Verdict: the test was fixed by isolating storage/runtime state, not by weakening the assertion. The compact delta contract remains explicit: one upserted task, no full `tasks` payload in delta.

### 3. Server runtime God module

Status: closed.

Original audit: `server/processes/generationTaskRuntime.ts` was about `922` lines and owned runtime store, persistence, SSE, single/batch runs, provider submission, cancellation, gallery mutations, image state, and test reset.

Current shape:

```txt
server/processes/generationTaskRuntime.ts                    1 line facade
server/processes/generation-task-runtime/batchRun.ts          206 lines
server/processes/generation-task-runtime/cancellation.ts       99 lines
server/processes/generation-task-runtime/galleryMutations.ts  117 lines
server/processes/generation-task-runtime/imageState.ts         41 lines
server/processes/generation-task-runtime/index.ts              29 lines
server/processes/generation-task-runtime/providerPipeline.ts   151 lines
server/processes/generation-task-runtime/runtimeStore.ts        81 lines
server/processes/generation-task-runtime/singleRun.ts           55 lines
server/processes/generation-task-runtime/taskEvents.ts         127 lines
```

Current evidence:

- Public imports keep working through the compatibility facade.
- `tasks:check` explicitly validates the split runtime contract.
- No runtime split module exceeds the 300-line warning budget.
- Tests covering single generation, batch generation, SSE bootstrap/delta, deletion, cancellation, retry, and scheduler behavior pass.

Verdict: the God module was actually split into responsibility-owned modules. The facade is intentionally preserved for route/API compatibility.

### 4. Debt budgets

Status: release blocker closed; warning hotspots remain.

Original audit: `npm run debt:check` failed with many growth-cap failures.

Current evidence:

- `npm run debt:check` passes.
- Growth-cap enforcement is green: `112` hotspot growth caps checked and passed.
- The following are now under their audited caps:

```txt
server/processes/generationTaskRuntime.ts                         1
server/providers/comfyui/workflowTemplates.ts                    20
server/routes/generationRoutes.ts                                11
src/features/detail/sections/snapshot/DetailSnapshotSections.tsx 192
src/features/gallery/ResultsGallery.tsx                          35
src/features/gallery/model/galleryArchive.ts                     76
src/processes/storage-sync/generationTaskHistory.ts             107
src/features/image-actions/elements/download-image/DownloadImageAction.tsx 69
src/app/commands/createComposerCommands.ts                       87
server/http/cors.ts                                              22
src/domain/generationTask.ts                                     67
src/interface/context/workspace/gallery.ts                       22
server/providers/openai-compatible/requestHandlers.ts            61
src/providers/openai-compatible/requestAdapter.ts                 88
src/providers/openai-compatible/responseAdapter.ts                60
docs/PROVIDER_ADAPTER_CONTRACT.md                              106
```

Remaining warning-level >300-line TS/TSX hotspots:

```txt
server/providers/comfyui/progressStream.ts                         407
src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx    346
src/entities/generation-params/comfyui/state.ts                    331
server/tunnel/cloudflaredTunnel.ts                                 321
src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx 318
src/entities/provider/compatibility.ts                             310
```

Verdict: debt budgets are useful again. They no longer block the release/static chain, but they still identify concrete future split candidates.

### 5. Stale client runners

Status: closed/quarantined.

Original audit: old client-side direct generation paths coexisted with server-owned runtime paths.

Current evidence:

- `src/infrastructure/api.ts` no longer exports the old direct browser provider submission function.
- `src/processes/batch-runner/batchRunner.ts` is now an explicit tombstone/quarantine module. Calling `runBatchGeneration()` throws a clear error pointing to the server-owned enqueue path.
- Production single generation remains snapshot/enqueue glue through `enqueueServerGenerationRequest()`.
- Production batch/multi generation enqueues through `enqueueServerBatchGenerationRequest()`.
- `npm run tasks:check` verifies that the server runtime owns lifecycle and that the old direct client batch runner is quarantined.

Verdict: stale browser-side provider submission is not a second production owner anymore.

### 6. ComfyUI workflow/plugin ownership

Status: closed for current architecture stage; future manifest/schema consolidation still useful.

Original audit: `workflowTemplates.ts` was too large and mixed types, defaults/clamps, plugin compatibility validation, base graph, sampler strategy, Hires Fix, and tiled/PAG/PerpNeg integration. It also participated in an import cycle.

Current shape:

```txt
server/providers/comfyui/workflowBaseGraph.ts          82
server/providers/comfyui/workflowConfig.ts            152
server/providers/comfyui/workflowExtensions.ts         90
server/providers/comfyui/workflowExtensionTypes.ts     37
server/providers/comfyui/workflowHiresFix.ts           42
server/providers/comfyui/workflowPluginValidation.ts    7
server/providers/comfyui/workflowSamplerNodes.ts       78
server/providers/comfyui/workflowTemplates.ts          20
server/providers/comfyui/workflowTypes.ts             128
```

Current evidence:

- `workflowTypes.ts` owns neutral payload/resolved-config/workflow graph types.
- `workflowConfig.ts` owns server-side config normalization/clamps/defaults.
- `workflowPluginValidation.ts` owns plugin compatibility validation.
- `workflowBaseGraph.ts`, `workflowSamplerNodes.ts`, and `workflowHiresFix.ts` own graph-building concerns separately.
- `workflowTemplates.ts` is a compatibility facade only.
- `tests/comfyui-workflow-contract.test.ts` covers UI state -> client payload -> server config -> workflow nodes, including tiled generation, LoRA, PAG, PerpNegGuider, tiled VAE, BNK_TiledKSampler, and backend name mapping.
- `npm run imports:check`, `npm run providers:check`, `npm test`, and `npm run build` pass.

Remaining non-blocking attention:

- Client ComfyUI defaults/state and server normalization still have some duplicated semantics.
- A future provider-owned shared manifest/schema would further reduce drift.

Verdict: workflow ownership is now separated enough to avoid the original cycle/mega-file problem. The remaining duplication is documented and guarded by contract tests.

### 7. App command/state everything bag

Status: mostly closed; workspace composition remains broad by nature.

Original audit: `WorkspaceState` and `CreateAppCommandsArgs` were becoming dependency magnets.

Current evidence:

- `src/app/commands/appCommandTypes.ts` is now a re-export surface for `commandDeps.ts`.
- `src/app/commands/commandDeps.ts` defines narrow dependency contracts:
  - `WorkspaceCommandDeps`
  - `ComposerCommandDeps`
  - `BatchComposerCommandDeps`
  - `GalleryCommandDeps`
  - `SettingsCommandDeps`
  - `DetailCommandDeps`
  - `ParameterCommandDeps`
  - `RequestPresetCommandDeps`
  - provider probe / compatibility deps
- `CreateAppCommandsArgs` now receives nested capability contexts instead of one flat everything bag.
- `StateSetter` and `ServerSubmissionState` moved to neutral `src/app/stateTypes.ts`, removing the prior import cycle.

Remaining non-blocking attention:

- The app workspace layer is still necessarily broad because it composes the whole product surface.
- Future command factories should keep receiving narrow capability contexts and avoid reintroducing flat global state access.

Verdict: the worst command dependency magnet was split into named capability contexts. This is not a full app-state architecture redesign, but it closes the original blocking risk.

### 8. Server route layer parsing too much protocol inline

Status: closed for the original hotspot.

Original audit: `server/routes/generationRoutes.ts` was `284` lines and parsed generation protocol inline.

Current shape:

```txt
server/routes/generationRoutes.ts                    11
server/routes/generation/liveImageRoutes.ts          20
server/routes/generation/providerSubmitRoutes.ts     60
server/routes/generation/requestParsing.ts          111
server/routes/generation/taskRoutes.ts               93
```

Current evidence:

- The old route file is now a registrar.
- Generation request parsing is separated into `server/routes/generation/requestParsing.ts`.
- Task routes, provider submit routes, legacy proxy routes, and live image routes are separated.
- `npm run debt:check` passes against current route caps.
- `tests/submit-route.test.ts` covers the server-owned route behavior.

Verdict: route ownership is materially improved. Some sub-route files can still be watched, but the original central route God file is gone.

### 9. Server history / client fallback split-brain risk

Status: substantially improved; keep monitoring deletion/reconnect semantics.

Original audit: server runtime, server persistence, client SSE state, client fallback cache, and tombstones had a risk of unclear ownership.

Current evidence:

- Server runtime owns active tasks and SSE deltas.
- Server storage owns persisted history.
- Tests now explicitly cover:
  - active task availability to new SSE subscribers;
  - server-owned generation route not wiping stored history while active empty tasks exist;
  - compact SSE deltas;
  - task delete removing task from SSE bootstrap;
  - storage history persistence/normalization behavior.
- `storage:check` passes and reports normalized generation task table, separated asset documents, lazy history modes, diagnostics and orphan audit.

Remaining non-blocking attention:

- Client fallback cache should remain display fallback only.
- Reconnect after local delete / failed server delete remains a good future integration-test target.

Verdict: the exact test failure pattern from the audit is fixed, and ownership is clearer. More reconnect/delete edge coverage would still be useful.

### 10. Provider extensibility

Status: improved; central composition root remains intentionally.

Original audit: adding provider #3 required central edits in registries/checks.

Current evidence:

- Server registry composes `providerServerManifests`.
- Client registry composes `providerClientManifests`.
- Provider checks import and iterate registered manifests rather than hardcoding adapter files as the source of truth.
- `npm run providers:check` passes and reports aligned server/client manifests for OpenAI-compatible and ComfyUI.

Remaining non-blocking attention:

- Adding a third provider still requires one central manifest registry entry on client and server. That is acceptable for a composition root.
- Before provider #3, do a mock provider dry-run to verify no hidden switch/check edits are required.

Verdict: provider extensibility moved from scattered adapter assumptions to manifest-based composition. Not fully plugin-discovery dynamic, but healthy for current project scale.

### 11. Legacy `WorkMode`

Status: reduced to compatibility vocabulary, not fully removed.

Original audit: `legacyWorkMode`, legacy submit fallback, and `WorkMode` checks were widespread.

Current evidence:

- `src/entities/provider/modeIntent.ts` owns UI-facing provider mode intent based on submit transport and attachment policy.
- Composer prompt placeholder and submit intent no longer need direct component-level `legacyWorkMode !== 'edit'` checks.
- Restore behavior now prefers stored `providerModeId` and falls back to legacy snapshot mode only when needed.
- Tests pass for provider-owned modes and UI intent derived from transport/attachments.

Remaining non-blocking attention:

- `src/domain/workMode.ts` and `GenerationRequestSnapshot.mode` remain for old snapshots/presets/history.
- `ProviderGenerationModeDefinition.legacyWorkMode` remains as a compatibility bridge.
- Parameter availability/profile code still accepts `WorkMode` until the logical parameter registry becomes fully provider-mode-owned.

Verdict: legacy mode is not gone, but it is now a compatibility layer rather than the primary UI decision owner. This is acceptable and non-blocking.

### 12. CSS/file-size hotspots

Status: release/static blocker closed; visual QA incomplete.

Current evidence:

- `npm run css:check` passes.
- `npm run debt:check` passes.
- CSS layer totals are within current budgets:
  - `6` CSS entry imports;
  - `5` CSS layer files;
  - `1075` layer lines;
  - `4` `!important` usages outside the entrypoint, all in `motion.css`.
- `app-primitives.css` remains `456` lines but is under the current warning cap.

Remaining non-blocking attention:

- Large CSS/module files should be split opportunistically when touched.
- Visual QA should be rerun in an environment with a working Chromium/Chrome/Edge executable.

Verdict: CSS architecture checks are green, but the final screenshot evidence could not be captured in this environment.

## Guardrails now green

The following guardrails are green in this final audit:

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
npm test
npm run build
npm run verify:static
```

The important change from the original audit is that the red areas are no longer concentrated in release-critical static/test gates. Remaining risks are warning-level or future-design items.

## What remains, but does not block development

1. Visual QA environment
   - Install/provide Chromium, Chrome, or Edge for Puppeteer, or set `CHROMIUM_PATH` to a real browser executable.
   - Then rerun:

   ```txt
   npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=gallery,settings-api,detail,batch-composer --out=artifacts/verify-screens
   ```

2. Warning-level large TS/TSX files
   - `server/providers/comfyui/progressStream.ts`
   - `src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx`
   - `src/entities/generation-params/comfyui/state.ts`
   - `server/tunnel/cloudflaredTunnel.ts`
   - `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx`
   - `src/entities/provider/compatibility.ts`

3. ComfyUI shared manifest/schema
   - Current contract tests guard client/server drift.
   - A provider-owned manifest/schema would be a cleaner future source of truth for defaults, clamps, mapping, labels, and compatibility text.

4. Provider #3 dry-run
   - Manifest-based registration is in place.
   - A mock provider addition would verify that no hidden central switch/check logic remains.

5. Legacy mode migration
   - `WorkMode` and `legacyWorkMode` are now compatibility vocabulary.
   - Old snapshots/presets/history still need them until a migration exists.

6. History reconnect/delete edges
   - Current storage/runtime/SSE tests are much stronger.
   - Future tests for reconnect after local deletion and failed server deletion would tighten the last split-brain edge.

## Final conclusion

Stages 1–8 successfully converted the original audit from red release gates into green architectural guardrails plus a small set of known future cleanup targets.

The current state is safe to continue development from, with one practical caveat: before accepting UI/CSS-heavy changes, visual screenshot QA still needs a working browser executable in the DevSpace environment.
