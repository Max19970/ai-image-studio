import {
  deleteEncryptedBucket,
  generationTaskAssetBucket,
  generationTaskDocumentBucket,
  getStorageDb
} from '../encryptedStore';
import { generationTaskAssetsTableName, generationTasksTableName } from '../schema';
import { normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import { isRecord, numberOrFallback, stringOrFallback } from './generationTaskCodecs';
import type { AssetRow, JsonObject, StoredImageReference, TaskRow } from './types';

export function clearGenerationTaskTables() {
  const db = getStorageDb();
  db.prepare(`DELETE FROM ${generationTaskAssetsTableName}`).run();
  db.prepare(`DELETE FROM ${generationTasksTableName}`).run();
  deleteEncryptedBucket(generationTaskAssetBucket);
  deleteEncryptedBucket(generationTaskDocumentBucket);
}

export function insertTaskRow(task: JsonObject, imageCount: number) {
  const batchItems = isRecord(task.batch) && Array.isArray(task.batch.items) ? task.batch.items : [];
  getStorageDb()
    .prepare(`INSERT INTO ${generationTasksTableName} (id, document_key, kind, status, gallery_path, created_at, updated_at, image_count, batch_item_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      stringOrFallback(task.id, `task-${Date.now()}`),
      stringOrFallback(task.id, `task-${Date.now()}`),
      stringOrFallback(task.kind, 'single'),
      stringOrFallback(task.status, 'failed'),
      normalizeGalleryPaths(task.galleryPaths, task.galleryPath)[0] ?? normalizeGalleryPath(task.galleryPath),
      numberOrFallback(task.createdAt, Date.now()),
      numberOrFallback(task.updatedAt, Date.now()),
      imageCount,
      batchItems.length
    );
}

export function insertAssetRows(refs: StoredImageReference[]) {
  const statement = getStorageDb()
    .prepare(`INSERT INTO ${generationTaskAssetsTableName} (id, task_id, batch_item_id, document_key, image_id, image_index, kind, format, created_at, bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  refs.forEach((ref) => {
    statement.run(ref.documentKey, ref.taskId, ref.batchItemId, ref.documentKey, ref.imageId, ref.imageIndex, ref.assetKind, ref.format, ref.createdAt, ref.bytes);
  });
}

export function selectTaskRows(limit: number, offset: number): TaskRow[] {
  return getStorageDb()
    .prepare(`SELECT id, document_key, kind, status, gallery_path, created_at, updated_at, image_count, batch_item_count FROM ${generationTasksTableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as TaskRow[];
}

export function selectAssetRows(taskIds: string[]): AssetRow[] {
  if (!taskIds.length) return [];
  const placeholders = taskIds.map(() => '?').join(', ');
  return getStorageDb()
    .prepare(`SELECT id, task_id, batch_item_id, document_key, image_id, image_index, kind, format, created_at, bytes FROM ${generationTaskAssetsTableName} WHERE task_id IN (${placeholders}) ORDER BY task_id, batch_item_id, image_index ASC`)
    .all(...taskIds) as AssetRow[];
}

export function hasV2HistoryRows(): boolean {
  const row = getStorageDb().prepare(`SELECT COUNT(*) AS count FROM ${generationTasksTableName}`).get() as { count?: number } | undefined;
  return Number(row?.count ?? 0) > 0;
}
