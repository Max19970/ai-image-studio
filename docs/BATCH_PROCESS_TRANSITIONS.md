# Batch process transitions

This document locks the current batch execution model before future queue features such as pause/resume, per-item retry controls, priority, or persisted batch progress.

## External lifecycle

1. A batch task is created with root status `queued` and every item status `queued`.
2. The runner emits `queued` and `item-queued` events.
3. When execution starts, the root task moves to `running`.
4. The delayed-parallel scheduler starts item sends at `intervalMs * itemIndex`, so the interval is measured between send starts, not between completed requests.
5. Before a request is sent, the item moves to `sending`.
6. When the request body is submitted, the item moves to `running`.
7. If streaming partial images arrive, they are attached both to the root task image list and to the matching batch item.
8. If a retry is scheduled, the item moves to `retrying`; the root task remains `running`.
9. A successful non-streamed item appends final images to the root task and replaces the item image list with the final images.
10. A successful streamed item does not duplicate final images already received through streaming.
11. Failed and cancelled items store an item-local error and contribute to the root aggregate error text.
12. The root terminal status is resolved after all scheduled item runners finish.

## Terminal resolution

- If at least one image exists, the root task finishes as `succeeded`, even if some items failed. The aggregate error is preserved on the task.
- If no images exist and all items were cancelled, the root task finishes as `cancelled`.
- If no images exist and at least one item failed, the root task finishes as `failed`.
- If no aggregate error exists, the root task finishes as `succeeded`.

## Internal model

The runner now delegates task mutation to `batchTaskReducer.ts` and non-React execution bookkeeping to `batchRunProgress.ts`.

Reducer events:

```txt
batch-started
item-sending
item-running
item-streamed
item-retrying
item-succeeded
item-failed
item-cancelled
active-items-cancelled
batch-finished
```

`batchRunner.ts` should stay an orchestration layer: scheduling, calling the API, mapping returned images, and emitting public runner events. It should not grow new task-shape mutation logic inline.
