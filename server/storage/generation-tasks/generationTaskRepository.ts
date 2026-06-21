import {
  generationTaskDocumentBucket,
  getStorageDb,
  loadEncryptedDocument,
  saveEncryptedDocument,
  storageBackend,
  storageDbPath
} from '../encryptedStore';
import { normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import { storageSchemaVersion } from '../schema';
import {
  clampLimit,
  clampOffset,
  cloneWithoutImages,
  collectImages,
  isRecord,
  restoreTaskImages,
  stringOrFallback
} from './generationTaskCodecs';
import { loadGenerationTaskAssetDocument, saveGenerationTaskAssetDocuments } from './generationTaskAssets';
import { clearLegacyGenerationTaskHistory, loadLegacyGenerationTaskHistory } from './generationTaskLegacyFallback';
import { getGenerationTaskHistoryStats } from './generationTaskStats';
import { clearGenerationTaskTables, hasV2HistoryRows, insertAssetRows, insertTaskRow, selectAssetRows, selectTaskRows } from './generationTaskRows';
import type { GenerationTaskHistoryLoadOptions, GenerationTaskHistoryStorageStats, JsonObject } from './types';

function resolveLoadOptions(options: GenerationTaskHistoryLoadOptions): Required<GenerationTaskHistoryLoadOptions> {
  return {
    limit: clampLimit(options.limit),
    offset: clampOffset(options.offset),
    assetMode: options.assetMode ?? 'full'
  };
}

function isActiveStoredStatus(status: unknown): boolean {
  return status === 'queued' || status === 'sending' || status === 'running' || status === 'retrying';
}

function isEmptyActiveStoredTask(task: JsonObject, imageCount: number): boolean {
  if (imageCount > 0) return false;
  return isActiveStoredStatus(task.status);
}

function loadV2Tasks(options: Required<GenerationTaskHistoryLoadOptions>): unknown[] {
  const taskRows = selectTaskRows(options.limit, options.offset);
  const assetsByTask = new Map<string, ReturnType<typeof selectAssetRows>>();
  selectAssetRows(taskRows.map((row) => row.id)).forEach((row) => {
    const list = assetsByTask.get(row.task_id) ?? [];
    list.push(row);
    assetsByTask.set(row.task_id, list);
  });

  return taskRows.flatMap((row) => {
    const task = loadEncryptedDocument<JsonObject | null>(generationTaskDocumentBucket, row.document_key, null);
    if (!task) return [];
    if (isEmptyActiveStoredTask(task, row.image_count)) return [];
    task.galleryPath = normalizeGalleryPath(task.galleryPath ?? row.gallery_path);
    task.galleryPaths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
    return [restoreTaskImages(task, assetsByTask.get(row.id) ?? [], options.assetMode, loadGenerationTaskAssetDocument)];
  });
}

export { loadGenerationTaskAssetDocument, getGenerationTaskHistoryStats };
export type { GenerationTaskAssetMode, GenerationTaskHistoryLoadOptions, GenerationTaskHistoryStorageStats } from './types';

export function loadGenerationTaskHistoryDocuments(options: GenerationTaskHistoryLoadOptions = {}): { tasks: unknown[]; stats: GenerationTaskHistoryStorageStats } {
  const resolved = resolveLoadOptions(options);

  if (hasV2HistoryRows()) {
    return { tasks: loadV2Tasks(resolved), stats: getGenerationTaskHistoryStats() };
  }

  const tasks = loadLegacyGenerationTaskHistory(resolved);
  return { tasks, stats: { ...getGenerationTaskHistoryStats(), legacyFallbackUsed: tasks.length > 0 } };
}

export function saveGenerationTaskHistoryDocuments(tasks: unknown[]) {
  const db = getStorageDb();
  const stats = { compressedBytes: 0, encryptedBytes: 0, assetCount: 0, thumbnailCount: 0 };

  db.exec('BEGIN');
  try {
    clearGenerationTaskTables();

    tasks.forEach((taskLike) => {
      if (!isRecord(taskLike)) return;
      const taskId = stringOrFallback(taskLike.id, `task-${Date.now()}`);
      const task = {
        ...taskLike,
        id: taskId,
        galleryPath: normalizeGalleryPaths(taskLike.galleryPaths, taskLike.galleryPath)[0] ?? normalizeGalleryPath(taskLike.galleryPath),
        galleryPaths: normalizeGalleryPaths(taskLike.galleryPaths, taskLike.galleryPath)
      };
      const imageRefs = collectImages(task, taskId);
      const fullImageRefs = imageRefs.filter((ref) => ref.assetKind === 'full');
      if (isEmptyActiveStoredTask(task, fullImageRefs.length)) return;

      const taskStats = saveEncryptedDocument(generationTaskDocumentBucket, taskId, cloneWithoutImages(task));
      stats.compressedBytes += taskStats.compressedBytes;
      stats.encryptedBytes += taskStats.encryptedBytes;
      insertTaskRow(task, fullImageRefs.length);

      const assetStats = saveGenerationTaskAssetDocuments(imageRefs);
      stats.compressedBytes += assetStats.compressedBytes;
      stats.encryptedBytes += assetStats.encryptedBytes;
      stats.assetCount += assetStats.assetCount;
      stats.thumbnailCount += assetStats.thumbnailCount;
      insertAssetRows(imageRefs);
    });

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  clearLegacyGenerationTaskHistory();
  return {
    backend: storageBackend,
    schemaVersion: storageSchemaVersion,
    dbPath: storageDbPath,
    taskCount: tasks.length,
    assetCount: stats.assetCount,
    thumbnailCount: stats.thumbnailCount,
    compressedBytes: stats.compressedBytes,
    encryptedBytes: stats.encryptedBytes
  };
}

export function clearGenerationTaskHistoryDocuments() {
  const db = getStorageDb();
  db.exec('BEGIN');
  try {
    clearGenerationTaskTables();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  clearLegacyGenerationTaskHistory();
  return getGenerationTaskHistoryStats();
}
