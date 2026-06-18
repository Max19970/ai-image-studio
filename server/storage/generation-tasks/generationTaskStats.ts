import {
  generationTaskAssetBucket,
  generationTaskDocumentBucket,
  getStorageDb,
  storageBackend,
  storageDbPath
} from '../encryptedStore';
import { generationTaskAssetsTableName, generationTasksTableName, storageSchemaVersion } from '../schema';
import type { GenerationTaskHistoryStorageStats } from './types';

export function getGenerationTaskHistoryStats(): GenerationTaskHistoryStorageStats {
  const row = getStorageDb().prepare(`
    SELECT
      COUNT(DISTINCT task.id) AS task_count,
      COUNT(asset.id) AS asset_count,
      SUM(CASE WHEN asset.kind = 'thumbnail' THEN 1 ELSE 0 END) AS thumbnail_count,
      MAX(task.updated_at) AS updated_at
    FROM ${generationTasksTableName} task
    LEFT JOIN ${generationTaskAssetsTableName} asset ON asset.task_id = task.id
  `).get() as { task_count?: number; asset_count?: number; thumbnail_count?: number; updated_at?: number } | undefined;

  const sizeRow = getStorageDb().prepare(`
    SELECT
      COALESCE(SUM(compressed_bytes), 0) AS compressed_bytes,
      COALESCE(SUM(encrypted_bytes), 0) AS encrypted_bytes
    FROM storage_documents
    WHERE bucket IN (?, ?)
  `).get(generationTaskDocumentBucket, generationTaskAssetBucket) as { compressed_bytes?: number; encrypted_bytes?: number } | undefined;

  return {
    backend: storageBackend,
    schemaVersion: storageSchemaVersion,
    dbPath: storageDbPath,
    updatedAt: row?.updated_at ?? null,
    taskCount: Number(row?.task_count ?? 0),
    assetCount: Number(row?.asset_count ?? 0),
    thumbnailCount: Number(row?.thumbnail_count ?? 0),
    compressedBytes: Number(sizeRow?.compressed_bytes ?? 0),
    encryptedBytes: Number(sizeRow?.encrypted_bytes ?? 0)
  };
}
