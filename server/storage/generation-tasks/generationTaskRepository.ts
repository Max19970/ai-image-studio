import {
  generationTaskDocumentBucket,
  getStorageDb,
  loadEncryptedDocument,
  saveEncryptedDocument
} from '../encryptedStore';
import { normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import { normalizeMaxStoredGenerationTasks, retainGenerationTasksByCompletedLimit } from '../../../src/domain/generationHistorySettings';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import {
  clampLimit,
  clampOffset,
  cloneWithoutImages,
  isRecord,
  restoreTaskImages
} from './generationTaskCodecs';
import { loadGenerationTaskAssetDocument, saveGenerationTaskAssetDocuments } from './generationTaskAssets';
import { createGenerationTaskPersistencePlan } from './generationTaskPersistencePlan';
import { clearLegacyGenerationTaskHistory, loadLegacyGenerationTaskHistory } from './generationTaskLegacyFallback';
import { getGenerationTaskHistoryStats } from './generationTaskStats';
import {
  clearGenerationTaskTables,
  deleteGenerationTaskRows,
  hasV2HistoryRows,
  insertAssetRows,
  insertTaskRow,
  selectAllTaskRows,
  selectAssetRows,
  selectTaskRows,
  selectRuntimeTaskRows,
  selectTaskRowsByIds
} from './generationTaskRows';
import type { GenerationTaskAssetMode, GenerationTaskHistoryLoadOptions, GenerationTaskHistoryStorageStats, JsonObject, TaskRow } from './types';

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

function loadV2TaskRows(
  taskRows: TaskRow[],
  assetMode: GenerationTaskAssetMode,
  options: { includeEmptyActive?: boolean } = {}
): unknown[] {
  const assetsByTask = new Map<string, ReturnType<typeof selectAssetRows>>();
  selectAssetRows(taskRows.map((row) => row.id)).forEach((row) => {
    const list = assetsByTask.get(row.task_id) ?? [];
    list.push(row);
    assetsByTask.set(row.task_id, list);
  });

  return taskRows.flatMap((row) => {
    const task = loadEncryptedDocument<JsonObject | null>(generationTaskDocumentBucket, row.document_key, null);
    if (!task) return [];
    if (!options.includeEmptyActive && isEmptyActiveStoredTask(task, row.image_count)) return [];
    task.galleryPath = normalizeGalleryPath(task.galleryPath ?? row.gallery_path);
    task.galleryPaths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
    return [restoreTaskImages(task, assetsByTask.get(row.id) ?? [], assetMode, loadGenerationTaskAssetDocument)];
  });
}

function loadV2Tasks(options: Required<GenerationTaskHistoryLoadOptions>): unknown[] {
  return loadV2TaskRows(selectTaskRows(options.limit, options.offset), options.assetMode);
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

export function loadGenerationTaskRuntimeHistoryDocuments(
  completedLimit: unknown,
  assetMode: GenerationTaskAssetMode = 'metadata'
): { tasks: unknown[]; stats: GenerationTaskHistoryStorageStats } {
  const limit = normalizeMaxStoredGenerationTasks(completedLimit);
  const stats = getGenerationTaskHistoryStats();
  if (hasV2HistoryRows()) {
    const tasks = loadV2TaskRows(selectRuntimeTaskRows(limit), assetMode, { includeEmptyActive: true });
    return {
      tasks: retainGenerationTasksByCompletedLimit(
        normalizeGenerationTasks(tasks, { interruptActive: false }),
        limit
      ),
      stats
    };
  }

  const legacyTasks = loadLegacyGenerationTaskHistory({ assetMode, limit: 10000, offset: 0 });
  return {
    tasks: retainGenerationTasksByCompletedLimit(
      normalizeGenerationTasks(legacyTasks, { interruptActive: false }),
      limit
    ),
    stats: { ...stats, legacyFallbackUsed: legacyTasks.length > 0 }
  };
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

export function saveGenerationTaskHistoryDocumentsInTransaction(tasks: unknown[]): void {
  const { preparedTasks, removedTaskIds, replacedTaskIds } = createGenerationTaskPersistencePlan(tasks, selectAllTaskRows());
  deleteGenerationTaskRows([...removedTaskIds, ...replacedTaskIds]);

  preparedTasks.forEach(({ taskId, task, imageRefs, fullImageCount }) => {
    saveEncryptedDocument(generationTaskDocumentBucket, taskId, cloneWithoutImages(task));
    insertTaskRow(task, fullImageCount);
    saveGenerationTaskAssetDocuments(imageRefs);
    insertAssetRows(imageRefs);
  });
}

export function finalizeGenerationTaskHistoryTransaction(): GenerationTaskHistoryStorageStats {
  clearLegacyGenerationTaskHistory();
  return getGenerationTaskHistoryStats();
}

export function saveGenerationTaskHistoryDocuments(tasks: unknown[]) {
  const db = getStorageDb();
  db.exec('BEGIN');
  try {
    saveGenerationTaskHistoryDocumentsInTransaction(tasks);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return finalizeGenerationTaskHistoryTransaction();
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
