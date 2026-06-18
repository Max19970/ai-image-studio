# Storage v2

Stage 9 moves Image Studio from one encrypted history blob toward a normalized local archive.

The storage backend is local-first, compressed, encrypted, and SQLite-based:

```text
server/storage/
  schema.ts
  encryptedStore.ts
  appDocumentStore.ts
  generationTaskStore.ts
  migrations/
    001_encrypted_blobs.ts
    002_storage_v2_documents.ts
    index.ts
```

## Schema

`storageSchemaVersion` is `2`.

The old `encrypted_blobs` table remains for compatibility, but v2 storage now uses encrypted document buckets plus queryable metadata tables:

```text
storage_documents
  bucket
  key
  value
  updated_at
  compressed_bytes
  encrypted_bytes

generation_tasks
  id
  document_key
  kind
  status
  created_at
  updated_at
  image_count
  batch_item_count

generation_task_assets
  id
  task_id
  batch_item_id
  document_key
  image_id
  image_index
  kind              # full | thumbnail
  format
  created_at
  bytes
```

`storage_documents` stores encrypted payloads. `generation_tasks` stores queryable task metadata. `generation_task_assets` stores queryable asset metadata for both full images and thumbnails.

## Document buckets

Current encrypted document buckets:

```text
generation-task.v2          # task document without images
generation-task-asset.v2    # full image and thumbnail image documents
studio-settings.v2          # current StudioSettings document
image-params.v2             # current ImageParams document
provider-probe-cache.v2     # provider capability/probe cache map
```

## History write path

`PUT /api/storage/generation-tasks` calls `saveGenerationTaskHistoryDocuments`.

The save path:

1. clears current v2 generation task rows and asset rows;
2. splits every task into a task document and image asset documents;
3. stores task documents in bucket `generation-task.v2`;
4. stores full images and thumbnails in bucket `generation-task-asset.v2`;
5. writes metadata rows to `generation_tasks` and `generation_task_assets`;
6. keeps the old `generation-tasks.v1` blob empty so cleared v2 history cannot be resurrected by legacy fallback.

Images are no longer stored inside the encrypted task document. Top-level task images and batch item images are restored from asset documents on load.

## Thumbnails

Before history persistence, `src/processes/storage-sync/generationTaskHistory.ts` creates optimized browser-side thumbnails with `createOptimizedThumbnail`.

Why browser-side:

- no native image processing dependency is needed on the server;
- the app already has canvas-based thumbnail generation for UI previews;
- encrypted storage receives both full assets and lightweight preview assets.

A generated image may now carry:

```ts
thumbnailSrc?: string;
storageAssetKey?: string;
storageThumbnailKey?: string;
storageAssetLoaded?: boolean;
```

Gallery/detail thumbnails prefer `thumbnailSrc` when available and fall back to `src`.

## Lazy history contract

`GET /api/storage/generation-tasks` accepts:

```text
limit=120
offset=0
assetMode=full | thumbnail | metadata
```

Modes:

- `full` restores full images and attaches `thumbnailSrc` when present;
- `thumbnail` restores preview images and includes `storageAssetKey` for later full asset loading;
- `metadata` restores image metadata only, without loading encrypted image payloads.

Full assets can be fetched independently:

```text
GET /api/storage/generation-task-asset?key=<storageAssetKey>
```

The default browser history load still uses `assetMode=full` to preserve the current UI contract. The API contract is ready for a future gallery pagination/virtualization pass without changing the storage foundation again.

## Settings, params and provider probe cache

The server exposes encrypted document endpoints for app-level documents:

```text
GET / PUT /api/storage/studio-settings
GET / PUT /api/storage/image-params
GET / PUT / DELETE /api/storage/provider-probe-cache
```

Client sync keeps localStorage as an emergency fallback, but now hydrates from encrypted storage when available:

```text
src/processes/storage-sync/studioSettings.ts
src/processes/storage-sync/imageParams.ts
src/processes/storage-sync/providerProbeCache.ts
```

This means settings, params and probe cache no longer have to live only in browser localStorage.

## Compatibility

The generation history endpoint still returns the existing browser shape:

```json
{
  "tasks": [],
  "storage": {
    "backend": "sqlite-aes-gcm-brotli-v2",
    "schemaVersion": 2,
    "taskCount": 0,
    "assetCount": 0,
    "thumbnailCount": 0
  }
}
```

The browser still normalizes history through `src/entities/storage`. UI/task lifecycle code does not need to know whether data came from v1 blob fallback or v2 normalized rows.

## Remaining future archive work

Storage v2 now has the right structure, but these are still future product-level features rather than stage-9 blockers:

- visible gallery pagination/virtualization UI;
- export/import archive endpoints;
- search/filter indexes;
- asset deduplication by hash;
- orphan cleanup beyond the current full replace/delete flow.

## Checks

Storage architecture is checked by:

```bash
npm run storage:check
```

The check verifies schema v2, normalized generation task tables, separated encrypted full assets, thumbnail assets, lazy asset modes, app document buckets, and route wiring.
