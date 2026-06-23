# Image Studio — Stage 2 generation runtime split

Date: 2026-06-22  
Branch/worktree: `fix/architecture-audit-2026-06-22` / `C:\Users\maxsh\Documents\Codex\image-studio-architecture-audit-2026-06-22`

## Goal

Split the server-owned generation runtime without changing route-layer imports or user-visible behavior.

The previous runtime owner was:

```txt
server/processes/generationTaskRuntime.ts
```

It mixed runtime store, persistence, SSE deltas, single and batch lifecycle, provider submission, streaming parsing, cancellation, image state, gallery mutations, and test reset behavior.

## Result

`server/processes/generationTaskRuntime.ts` is now a compatibility facade:

```ts
export * from './generation-task-runtime/index';
```

Route-layer imports and tests that use the old module path can keep importing from `server/processes/generationTaskRuntime.ts`.

The runtime implementation now lives in:

```txt
server/processes/generation-task-runtime/
  runtimeStore.ts
  taskEvents.ts
  singleRun.ts
  batchRun.ts
  providerPipeline.ts
  cancellation.ts
  galleryMutations.ts
  imageState.ts
  index.ts
```

## Responsibility map

- `runtimeStore.ts`
  - runtime task singleton;
  - mutation queue;
  - persistence queue;
  - persisted history load/save;
  - client serialization for task snapshots;
  - task patch/mutate primitives.

- `taskEvents.ts`
  - SSE client set;
  - initial `tasks` event;
  - compact `tasks-delta` signatures;
  - task delta broadcast;
  - keep-alive and SSE test reset.

- `providerPipeline.ts`
  - provider adapter lookup;
  - submit-provider-mode call;
  - retry policy wiring;
  - non-streamed response parsing;
  - streamed SSE block parsing;
  - progress/image/error collection.

- `singleRun.ts`
  - single task creation;
  - single task lifecycle transitions;
  - single task image upsert/finalization;
  - binding the provider pipeline to a task.

- `batchRun.ts`
  - batch aggregate task creation;
  - per-item controller binding;
  - delayed parallel scheduler wiring;
  - batch reducer dispatch;
  - batch terminal status derivation.

- `cancellation.ts`
  - task controllers;
  - batch item controllers;
  - batch item cancellation requests;
  - public task delete/clear/cancel operations;
  - public batch item cancellation.

- `galleryMutations.ts`
  - task move;
  - folder move/remap;
  - paste move/link-copy/deep-copy;
  - folder delete filtering;
  - deep-copy image/task cloning.

- `imageState.ts`
  - ID creation helper;
  - task transition helper;
  - active status classifier;
  - runtime error normalization;
  - image sorting/upsert/final filtering;
  - persistable final image counting.

- `index.ts`
  - production facade for the split runtime;
  - public API re-exports;
  - `resetGenerationTaskRuntimeForTests()` composition;
  - `subscribeGenerationTaskEvents()` composition.

## Guardrail updates

`npm run tasks:check` was updated to validate the split runtime contract instead of assuming the provider pipeline and lifecycle strings must live inside one large `generationTaskRuntime.ts` file.

The check now verifies:

- the old runtime file remains a facade;
- all split runtime modules exist;
- provider pipeline ownership remains server-side;
- retry policy and delayed batch scheduler are still used;
- single and batch lifecycle transitions still publish sending/running/retrying/terminal states;
- SSE task delta publication remains present;
- persisted task history ownership remains present;
- gallery task mutations remain present.

## Debt hotspot result

The original runtime God module was reduced from roughly 922 lines to a 1-line facade.

Current split module sizes:

```txt
    1 server/processes/generationTaskRuntime.ts
  217 server/processes/generation-task-runtime/batchRun.ts
  117 server/processes/generation-task-runtime/cancellation.ts
  131 server/processes/generation-task-runtime/galleryMutations.ts
   50 server/processes/generation-task-runtime/imageState.ts
   33 server/processes/generation-task-runtime/index.ts
  173 server/processes/generation-task-runtime/providerPipeline.ts
   93 server/processes/generation-task-runtime/runtimeStore.ts
   58 server/processes/generation-task-runtime/singleRun.ts
  143 server/processes/generation-task-runtime/taskEvents.ts
```

No new split runtime module exceeds the 300-line warning budget.

`npm run debt:check` still fails, but not because of the split runtime. Remaining failures are pre-existing calibrated caps in unrelated hotspots such as `server/routes/generationRoutes.ts`, gallery/detail files, provider adapters, and storage sync.

## Verification

Passed:

```txt
npm run imports:check
npm run tasks:check
npm run build
npm test
npm run arch:check:strict
npm run interface:check
npm run params:check
node scripts/check-provider-adapters.mjs
node scripts/check-storage-architecture.mjs
node scripts/check-css-architecture.mjs
node ./scripts/check-motion-architecture.mjs
npm run ui:check
npm run secrets:check
```

Failed / blocked by existing debt gate:

```txt
npm run debt:check
npm run verify\:static
```

`npm run verify\:static` reaches `debt:check` and stops there. All earlier static checks in the chain passed. `npm test` and `npm run build` were run separately after that and both passed.

## Behavior-sensitive areas checked

- SSE compact delta behavior is covered by `tests/submit-route.test.ts` and passed.
- Persisted history behavior is covered by storage and generation history tests and passed.
- Single task cancellation is preserved through the public facade and controller registry.
- Batch item cancellation is preserved through `cancelServerBatchGenerationItem()` and the low-level batch item controller registry.
- Gallery folder mutations are preserved in `galleryMutations.ts` behind the same public facade exports.
