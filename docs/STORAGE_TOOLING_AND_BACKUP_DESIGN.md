# Storage tooling and backup design

Stage: 8 — Incremental persistence and storage tooling.

## Current persistence shape

Generation history is stored as normalized SQLite rows plus encrypted Brotli-compressed JSON documents:

- `generation_tasks` stores task metadata and ordering fields.
- `generation_task_assets` stores image asset metadata and references.
- `storage_documents` stores encrypted task documents and image documents.
- full images and thumbnails are separate encrypted asset documents.
- app settings, image params and provider probe cache use their own document buckets.

The current client still saves a normalized history snapshot. That write path is acceptable for the current archive size because images are split into asset documents and history can be loaded in `metadata`, `thumbnail`, or `full` mode. Targeted `upsertTask` can be added later if the benchmark shows snapshot saves becoming a real bottleneck.

## New commands

```bash
npm run storage:benchmark
npm run storage:benchmark -- --tasks=240 --images=2 --batch-items=1 --batch-images=1 --image-bytes=4096
npm run storage:audit
npm run storage:audit:strict
```

By default `storage:benchmark` uses a temporary SQLite database and a deterministic test encryption key. Pass `--use-current-db` only when intentionally measuring the real local archive.

## Baseline measurement

Command:

```bash
npm run storage:benchmark -- --tasks=80 --images=2 --batch-items=1 --batch-images=1 --image-bytes=2048
```

Observed in the ChatGPT container:

```json
{
  "fixture": {
    "taskCount": 80,
    "imagesPerTask": 2,
    "batchItemsPerTask": 1,
    "batchImagesPerItem": 1,
    "imageBytes": 2048
  },
  "timings": {
    "saveMs": 166.8,
    "loadMetadataMs": 21.8,
    "loadThumbnailMs": 38.1,
    "loadFullFirst50Ms": 50.4
  },
  "storage": {
    "taskRows": 80,
    "assetRows": 480,
    "fullAssetRows": 240,
    "thumbnailAssetRows": 240,
    "compressedBytes": 111034,
    "encryptedBytes": 127274,
    "declaredImageBytes": 553680
  },
  "audit": {
    "ok": true,
    "issues": []
  }
}
```

Interpretation: the current snapshot save path is not an immediate blocker at this scale. Metadata/thumbnail loading is cheap enough to keep the gallery scalable in the next stage. Full loading should remain limited to detail/modal contexts.

## Diagnostics endpoint

The server exposes:

```txt
GET /api/storage/generation-tasks/diagnostics
GET /api/storage/generation-tasks/audit
```

Diagnostics include:

- task row count;
- asset row count;
- full vs thumbnail asset rows;
- declared image byte total;
- encrypted/compressed storage sizes;
- per-bucket document counts;
- task status/kind breakdown;
- integrity summary.

Audit reports integrity issues:

- asset rows without task rows;
- task rows without task documents;
- task documents without task rows;
- asset rows without asset documents;
- asset documents without asset rows.

`npm run storage:audit:strict` exits with a non-zero status when the audit is not clean.

## Backup/export design

A safe export should be a versioned JSON envelope, not a raw SQLite copy.

Suggested shape:

```ts
interface ImageStudioStorageExportV1 {
  format: 'image-studio-storage-export';
  version: 1;
  exportedAt: number;
  appVersion: string;
  generationTasks: unknown[];
  studioSettings?: unknown;
  imageParams?: unknown;
  providerProbeCache?: unknown;
}
```

Rules:

- export should use `assetMode: 'full'` so images are portable;
- provider API keys should be excluded by default;
- import should validate the envelope before writing;
- import should offer replace mode first; merge mode can come later;
- imported tasks should be normalized through the same repository save path.

## Restore/import design

Initial restore mode should be conservative:

1. Read export envelope.
2. Validate `format` and `version`.
3. Normalize generation tasks.
4. Save through `saveGenerationTaskHistoryDocuments`.
5. Optionally restore settings/params only when explicitly requested.
6. Run storage audit after import.

Merge mode is intentionally deferred because task-id collisions, provider settings and duplicate images need a UX decision.

## When to add targeted upsert

Add targeted `upsertGenerationTaskDocument` only if one of these becomes true:

- saving 120–240 regular tasks feels slow in real use;
- dataset automation causes frequent large snapshot writes;
- save time grows linearly enough to be visible after every generated item;
- Chrome Performance recording shows persistence blocking user interaction.

When that happens, the repository should add task-level write APIs while keeping the current snapshot `PUT /api/storage/generation-tasks` endpoint as a compatibility path.
