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
import { hydrateTaskForPersistence } from './generationTaskHydration';
import { clearLegacyGenerationTaskHistory, loadLegacyGenerationTaskHistory } from './generationTaskLegacyFallback';
import { getGenerationTaskHistoryStats } from './generationTaskStats';
import { clearGenerationTaskTables, hasV2HistoryRows, insertAssetRows, insertTaskRow, selectAssetRows, selectTaskRows, selectTaskRowsByIds } from './generationTaskRows';
import type { GenerationTaskAssetMode, GenerationTaskHistoryLoadOptions, GenerationTaskHistoryStorageStats, JsonObject, StoredImageReference, TaskRow } from './types';

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

function loadV2TaskRows(taskRows: TaskRow[], assetMode: GenerationTaskAssetMode): unknown[] {
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
    return [restoreTaskImages(task, assetsByTask.get(row.id) ?? [], assetMode, loadGenerationTaskAssetDocument)];
  });
}

function loadV2Tasks(options: Required<GenerationTaskHistoryLoadOptions>): unknown[] {
  return loadV2TaskRows(selectTaskRows(options.limit, options.offset), options.assetMode);
}

interface PreparedGenerationTaskDocument {
  taskId: string;
  task: JsonObject;
  imageRefs: StoredImageReference[];
  fullImageCount: number;
}

function prepareGenerationTaskDocument(taskLike: unknown): PreparedGenerationTaskDocument | null {
  if (!isRecord(taskLike)) return null;
  const taskId = stringOrFallback(taskLike.id, `task-${Date.now()}`);
  const task = hydrateTaskForPersistence({
    ...taskLike,
    id: taskId,
    galleryPath: normalizeGalleryPaths(taskLike.galleryPaths, taskLike.galleryPath)[0] ?? normalizeGalleryPath(taskLike.galleryPath),
    galleryPaths: normalizeGalleryPaths(taskLike.galleryPaths, taskLike.galleryPath)
  });
  const imageRefs = collectImages(task, taskId);
  const fullImageCount = imageRefs.filter((ref) => ref.assetKind === 'full').length;
  if (isEmptyActiveStoredTask(task, fullImageCount)) return null;
  return { taskId, task, imageRefs, fullImageCount };
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

export function loadGenerationTaskHistoryDocumentsByIds(taskIds: string[], options: Pick<GenerationTaskHistoryLoadOptions, 'assetMode'> = {}): { tasks: unknown[]; stats: GenerationTaskHistoryStorageStats } {
  const ids = [...new Set(taskIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))].slice(0, 400);
  const assetMode = options.assetMode ?? 'full';
  const stats = getGenerationTaskHistoryStats();
  if (!ids.length) return { tasks: [], stats };

  if (hasV2HistoryRows()) {
    return { tasks: loadV2TaskRows(selectTaskRowsByIds(ids), assetMode), stats };
  }

  const selectedIds = new Set(ids);
  const tasks = loadLegacyGenerationTaskHistory({ assetMode, limit: 10000, offset: 0 }).filter((task) => isRecord(task) && selectedIds.has(String(task.id ?? '')));
  return { tasks, stats: { ...stats, legacyFallbackUsed: tasks.length > 0 } };
}

export function saveGenerationTaskHistoryDocuments(tasks: unknown[]) {
  const db = getStorageDb();
  const stats = { compressedBytes: 0, encryptedBytes: 0, assetCount: 0, thumbnailCount: 0 };
  const preparedTasks = tasks.flatMap((taskLike) => {
    const prepared = prepareGenerationTaskDocument(taskLike);
    return prepared ? [prepared] : [];
  });

  db.exec('BEGIN');
  try {
    clearGenerationTaskTables();

    preparedTasks.forEach(({ taskId, task, imageRefs, fullImageCount }) => {
      const taskStats = saveEncryptedDocument(generationTaskDocumentBucket, taskId, cloneWithoutImages(task));
      stats.compressedBytes += taskStats.compressedBytes;
      stats.encryptedBytes += taskStats.encryptedBytes;
      insertTaskRow(task, fullImageCount);

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
    taskCount: preparedTasks.length,
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
