# Stage 4 — Remove stale client generation paths

Date: 2026-06-23  
Branch/worktree: `fix/architecture-audit-2026-06-22`

## Production owner decision

Generation runtime ownership is server-side.

- Single generation: client captures a request snapshot and enqueues through `enqueueServerGenerationRequest()` to `/api/generation-tasks/run`.
- Batch/multi generation: client prepares per-item snapshots and enqueues through `enqueueServerBatchGenerationRequest()` to `/api/generation-tasks/batch`.
- Provider submission, streaming, retry, cancellation, lifecycle transitions, SSE deltas, and persistence are owned by `server/processes/generation-task-runtime/*`.
- Client generation code should remain snapshot/enqueue/UI glue only.

## Usage scan

Commands searched for current ownership:

```txt
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=dev-only --exclude-dir=artifacts -E "runBatchGeneration|runSingleGeneration|submitImageRequest|enqueueServerBatchGenerationRequest|enqueueServerGenerationRequest|/api/provider/submit|api/provider/submit|/api/generate|/api/edit|provider/submit|submitProvider" src server tests scripts docs package.json
```

Findings:

- `runSingleGeneration` is still used by `src/app/commands/generationCommands.ts`, but it is now an enqueue wrapper around `enqueueServerGenerationRequest`.
- `runBatchGeneration` had no production import from `src/app`, `src/features`, or `src/interface`.
- The old direct browser provider submit function was only used by `src/processes/batch-runner/batchRunner.ts`.
- Server provider submit paths remain live and intentional:
  - server route proxy: `/api/provider/submit`, `/api/generate`, `/api/edit`;
  - server runtime provider pipeline: `server/processes/generation-task-runtime/providerPipeline.ts`;
  - provider adapters: `submitProviderMode` implementations.

## Changes made

### Removed stale direct client submit API

`src/infrastructure/api.ts` no longer exports the old browser-side direct provider submit function.

The remaining exports are enqueue/control/resource APIs:

- `enqueueServerGenerationRequest`
- `enqueueServerBatchGenerationRequest`
- `deleteServerGenerationTask`
- `clearServerGenerationTasks`
- `cancelServerGenerationTask`
- `cancelServerBatchGenerationItem`
- provider probe/resource helpers

### Quarantined old client batch runner

`src/processes/batch-runner/batchRunner.ts` is intentionally kept as a tombstone module.

It no longer imports provider submission, scheduler, retry, cancellation, task reducer, or image mapping helpers. Calling `runBatchGeneration()` throws an explicit error that points to the server-owned enqueue path.

Reason for quarantine instead of physical deletion: this keeps accidental future imports loudly wrong and gives future agents a clear ownership marker.

### Narrowed client batch/single inputs

Removed obsolete `taskHistory` dependency from snapshot/enqueue generation paths:

- `src/processes/generation-runner/types.ts`
- `src/processes/batch-runner/types.ts`
- `src/app/commands/generationCommands.ts`
- `src/app/commands/createComposerCommands.ts`
- `src/app/commands/createBatchComposerCommands.ts`
- `tests/batch-mixed-providers.test.ts`

`taskHistory` remains in legacy cancellation helper types for now because that helper module is outside the production enqueue path and should be removed in a later cleanup only if no tests/checks depend on it.

### Updated guardrail

`scripts/check-task-lifecycle.mjs` now asserts:

- server runtime modules are the lifecycle owner;
- client single runner is enqueue-only;
- client batch direct runner is explicitly quarantined;
- client API does not export the stale direct provider submit function.

## Runner paths after Stage 4

Remaining intentional paths:

1. `src/processes/generation-runner/singleRunner.ts`
   - kept because production single generation still uses it as snapshot/enqueue glue;
   - it does not submit directly to providers.

2. `src/processes/batch-runner/requestBuilder.ts`
   - kept because production batch/multi generation still needs client-side per-item snapshot/payload preparation before enqueue.

3. `src/processes/batch-runner/batchTaskReducer.ts`, `batchRunProgress.ts`, `schedule.ts`, `retryPolicy.ts`, `batchTaskModel.ts`, supporting types
   - kept because server runtime and tests still reuse the reducer/scheduler/lifecycle helpers;
   - these are not browser direct provider submit paths.

4. `src/processes/batch-runner/batchRunner.ts`
   - quarantined tombstone only;
   - not production runtime;
   - must not be revived as a provider submit owner.

5. `server/processes/generation-task-runtime/*`
   - production lifecycle/runtime owner for single and batch generation.

## Non-goals

- Did not remove server `/api/provider/submit`, `/api/generate`, or `/api/edit` routes. They are backend/provider adapter paths, not stale browser runtime ownership.
- Did not remove request builders, batch reducers, or scheduler helpers that are still used by production server runtime or tests.
- Did not send live OpenAI-compatible or ComfyUI generation requests during this stage.
