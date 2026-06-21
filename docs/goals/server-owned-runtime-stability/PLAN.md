# Server-Owned Runtime Stability Implementation Plan

**Intent:** Make Image Studio's long-lived generation state stable across reloads, multiple clients, and Telegram Mini App by moving runtime ownership from browser instances to the local server.
**Current Behavior:** The project mixed server proxy/storage with browser-owned runners. Single generation is already partially server-owned in this branch, but batch/multi generation and task mutations still rely on client state.
**Expected Outcome:** Server is the source of truth for generation tasks, task lifecycle, task history mutations, and cross-client updates. Frontend submits commands and renders server events; it does not create authoritative gallery cards.
**Target-Perspective Output:** Max can start generation from desktop or Telegram, reload during active work, open a second client, delete/clear/cancel where supported, and see the same task state everywhere.
**Truth Owner:** Express server runtime plus server storage repository.
**Contract Boundary:** Frontend sends commands to `/api/generation-tasks/*`; server emits task snapshots through `/api/generation-tasks/events`.
**Cutover:** Remove or demote client-owned generation/task mutation paths after server-owned replacements exist. Keep frontend-only draft/composer state local.
**Displaced Path:** Browser-owned `generation-runner`, `batch-runner`, and direct authoritative `taskHistory.setTasks/updateTask/deleteTask/clearTasks` mutations.
**Value Density:** Prioritize flows that lose data or desync clients: active generation reload, batch/multi generation, delete/clear/cancel, and server reconnect/bootstrap.
**Acceptance Evidence:** Build/tests plus manual checks for desktop + Telegram/local second client: submit, reload active task, batch reload, delete/clear sync, completed image persistence.
**Evidence Lane:** Runtime/route tests and manual browser/TG verification notes.
**Kill Criteria:** No duplicate dominant path may remain where browser creates or mutates authoritative gallery tasks after the server endpoint exists. Client optimistic indicators must stay outside gallery cards.
**Architecture Slice:** Generation task runtime, batch runner, task history storage, task command routes, task event subscription, gallery/task commands, composer submit status.
**Plan Review Gate:** Requires PRE review before execution.

## Branch Baseline

- Branch/worktree: `feature/server-owned-runtime-stability`.
- Worktree path: `C:/Users/maxsh/.devspace/worktrees/image-studio-b67a9a8d`.
- Main checkout is clean after transfer.
- Stash backup exists as `stash@{0}: server-owned-runtime-stability-transfer` until the branch baseline is fully accepted.

Transferred baseline already includes:
- server-owned single generation runtime;
- `/api/generation-tasks/run`;
- `/api/generation-tasks/events` SSE;
- frontend single submit enqueues on server;
- composer-only submission status, no optimistic gallery card;
- server-routed large image download fixes;
- tests covering active server-owned single task visibility through SSE.

Baseline evidence in worktree:
- `npm install` passed: `dev-only/generated/tmp/npm-install-worktree-20260621-160502.log`.
- `npm run build` passed: `dev-only/generated/tmp/build-transfer-baseline-20260621-160521.log`.
- targeted tests passed 164/164: `dev-only/generated/tmp/test-transfer-baseline-20260621-160543.log`.

## Architecture Map

Source of truth:
- Authoritative task state: server runtime while the process is alive, server storage for persisted terminal/completed snapshots.
- Authoritative browser projection: SSE task snapshots.
- Local-only state: composer drafts, selected UI surfaces, transient submit status before first SSE event.

Read path:
- Active task list must come from `/api/generation-tasks/events` bootstrap and subsequent `tasks` events.
- Asset reads stay server-backed through existing storage asset routes.

Write path:
- Single submit: frontend posts server enqueue command; server updates runtime/storage and broadcasts.
- Batch submit: must move to server enqueue/orchestration.
- Delete/clear/cancel: must move to server command routes.

Contract boundary:
- Frontend never creates authoritative gallery task cards.
- Frontend may show non-gallery submission status before server ack/event.
- Server command success means command accepted, not generation completed.
- SSE bootstrap must include active runtime tasks and persisted inactive tasks in one normalized list.

Files likely to modify:
- `server/processes/generationTaskRuntime.ts`
- `server/routes/generationRoutes.ts`
- `src/infrastructure/api.ts`
- `src/app/commands/generationCommands.ts`
- `src/app/commands/createBatchComposerCommands.ts`
- `src/app/commands/createGalleryCommands.ts`
- `src/app/commands/workspaceCommands.ts`
- `src/app/hooks/useGenerationTaskHistory.ts`
- `src/processes/batch-runner/*`
- `src/processes/storage-sync/generationTaskHistory.ts`
- relevant tests.

Files/areas to avoid unless directly needed:
- broad UI restyling;
- provider adapter rewrites;
- moving unsent composer drafts or selected UI state to server.

## Staged Checklist

### [x] Stage 1/6 — Worktree transfer and baseline

Intent: move the already-working single-generation/server-events changes out of main and into an isolated branch workspace.

Maintainability: reduces risk by restoring clean main and isolating stability work.

Evidence:
- main checkout clean;
- worktree contains transferred changes;
- build passed;
- targeted tests passed 164/164.

### [x] Stage 2/6 — Audit and contract plan

Intent: map browser-owned process/state paths that should become server-owned and define the contract before additional coding.

Tasks:
- create GOAL/PLAN;
- audit generation, batch, task mutation, storage sync, provider checks, and asset/download paths;
- record owner/cutover decisions.

Evidence:
- this PLAN names truth owner, boundary, displaced paths, evidence, and kill criteria;
- audit findings recorded below.

### [x] Stage 3/6 — Harden server runtime contract

Intent: turn the current single-generation runtime into a reusable runtime contract for batch and task actions.

Tasks:
- review runtime/storage merge behavior;
- keep active runtime tasks authoritative during SSE bootstrap;
- add command-oriented helpers for enqueue/broadcast/mutate/cancel where needed;
- preserve existing single submit behavior.

Evidence:
- single route/runtime tests continue to pass;
- add/adjust SSE bootstrap tests if needed.

### [x] Stage 4/6 — Move batch/multi generation to server ownership

Intent: batch/multi generation survives reload and appears in every client the same way as single generation.

Tasks:
- add server batch enqueue command or extend the run command with batch input;
- move item scheduling, intervals, retry, progress, streamed images, and terminal aggregate status to server runtime;
- convert frontend batch submit to command-only status;
- remove/demote browser-owned batch task creation from production path.

Evidence:
- test: batch enqueue returns accepted task;
- test: new SSE subscriber sees active batch/items while upstream is pending;
- manual: submit multi request, reload, active batch is restored.

### [x] Stage 5/6 — Move task mutations to server commands

Intent: delete/clear/cancel synchronize across clients and update storage/server runtime consistently.

Tasks:
- add command routes for delete, clear, and cancel if cancel is supported;
- convert gallery/workspace commands to call server actions;
- keep selected-task cleanup as local UI only;
- broadcast mutation results.

Evidence:
- tests for delete/clear/cancel route effects;
- manual: mutate in one client, second client updates through SSE.

### [x] Stage 6/6 — Stability evidence, cleanup, final report

Intent: prove the new source-of-truth contract from the user's perspective and remove duplicate dominant paths.

Tasks:
- remove/deprecate production browser-owned owners where safe;
- run checks;
- capture manual verification notes.

Evidence:
- `npm test` passed 166/166: `dev-only/generated/tmp/test-final-stability-20260621-163600.log`.
- `npm run build` passed: `dev-only/generated/tmp/final-build.log`.
- Production-owner scan found no `runBatchGeneration(` calls from `src/app`, `src/features`, or `src/interface`.
- Production-owner scan found no direct `taskHistory.setTasks/updateTask/deleteTask/clearTasks` calls from `src/app` or `src/features`.
- Manual checks still required: single reload, batch reload, second-client sync, delete/clear sync, completed image persistence, Telegram/local route sanity.

## Bugfix Follow-up Evidence

Manual QA found and this pass fixed:
- server batch interval crash after first item by replacing browser-only `window` timers with `globalThis` timers;
- missing batch streamed progress/partial updates by dispatching `item-progress` and `item-streamed` during server stream consumption;
- mobile/TG delete no-op risk by using POST delete/clear command endpoints from the frontend.

Evidence:
- targeted tests passed 167/167: `dev-only/generated/tmp/test-batch-fix.log`;
- build passed: `dev-only/generated/tmp/build-batch-fix.log`;
- added a two-item interval batch regression test and updated delete test to POST command route.

Second follow-up:
- CORS origins are now also derived from `IMAGE_STUDIO_ALLOWED_HOSTS`, so configured public hosts are accepted as request origins.
- Live partial preview replacement now ignores changing partial indexes per task/item and keeps only the latest partial preview for each item, reducing active server heap/SSE payload growth.
- Follow-up tests passed 167/167: `dev-only/generated/tmp/test-cors-memory-fix.log`.
- Follow-up build passed: `dev-only/generated/tmp/build-cors-memory-fix.log`.

## Audit Findings

Must become server-owned:
1. Batch/multi generation: `src/processes/batch-runner/batchRunner.ts` currently creates tasks, schedules items, calls providers, and mutates task history in the browser.
2. Task delete/clear: `workspaceCommands.ts` and gallery commands currently remove tasks locally only.
3. Active task cancellation: browser abort registry no longer owns server tasks and must not be the only cancellation path.
4. Task history persistence: browser-side task saves must not race or override server truth. Batch must move server-side before this is fully safe.

Can remain client-local:
1. Composer drafts and unsent attachments.
2. Selected task/image, tab, popovers, expanded composer, modal state.
3. Hires Fix composer restore: it prepares a local draft from a stored image but does not run generation itself.

Optional / scoped out for now:
1. Provider probe/quick check is server-proxied but cache is client-local; not a high-risk runtime sync issue yet.
2. Settings persistence is user/session config, not active runtime.
