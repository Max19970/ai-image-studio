# Generation task lifecycle and scheduler

Image Studio keeps generation execution in `src/processes`, while UI features only render task state.
Stage 8 introduced an explicit lifecycle layer so mono generation, batch generation, retries, cancellation, deletion and refresh recovery use the same vocabulary.

## Status model

Persisted generation tasks use this status union:

```txt
created -> queued -> sending -> running -> succeeded
                    -> retrying -> sending/running
                    -> failed
                    -> cancelled
```

`deleted` is a lifecycle event, not a persisted task status: deleting a task removes it from history after cancelling any active abort controller.

The active statuses are:

```txt
created, queued, sending, running, retrying
```

The terminal statuses are:

```txt
succeeded, failed, cancelled
```

On app refresh, active statuses are restored as `failed` with an "Interrupted by page reload" error. This prevents stale phantom-running tasks after a reload.

## Lifecycle modules

```txt
src/processes/generation-task-lifecycle/
  status.ts                 status constants, guards, active/terminal checks, UI tone mapping
  transitions.ts            task and batch item transition helpers
  cancellationRegistry.ts   taskId -> AbortController registry
  scheduler.ts              delayed parallel scheduler for batch sends
  retryPolicy.ts            shared retry policy for mono and batch generation
```

## Cancellation and deletion

`useGenerationTaskHistory` owns the task history state and delegates active abort controllers to `createTaskCancellationRegistry()`.

- `deleteTask(taskId)` cancels active work for that task before removing it from history.
- `clearTasks()` cancels all active work before clearing history.
- Batch runs use one task-level abort controller, so deleting the batch task cancels pending delayed sends and in-flight child requests.
- A non-deleted cancellation is persisted as `cancelled`; a deleted cancellation disappears from history because deletion is the user-visible final action.

## Batch scheduler

Batch generation uses `runDelayedParallelScheduler()`.

The scheduler preserves the intended send cadence:

```txt
item 0 -> delay 0 * interval -> send
item 1 -> delay 1 * interval -> send
item 2 -> delay 2 * interval -> send
```

This means the interval is between send starts, not between completed requests. Results are collected in parallel.

The scheduler already accepts `maxConcurrency` for future rate-limit/concurrency work, but the current batch path leaves it unlimited to preserve existing behavior.

## Retry policy

Mono and batch items both use the same lifecycle retry policy from:

```txt
src/processes/generation-task-lifecycle/retryPolicy.ts
```

During retry wait, the task or item moves to `retrying`. The next attempt moves it back through `sending/running`.

## Checks

Run:

```bash
npm run tasks:check
```

The check verifies that:

- lifecycle modules exist;
- `GenerationStatus` exposes the explicit statuses;
- legacy `streaming` is not a persisted task status anymore;
- single runner uses `sending/running/retrying/cancelled` transitions;
- batch runner uses the delayed parallel scheduler;
- task deletion and clearing cancel active controllers;
- storage restore normalizes interrupted active tasks.
