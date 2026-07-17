import { ACTIVE_GENERATION_STATUSES } from '../../../src/domain/generationStatus';
import { getStorageDb } from '../encryptedStore';
import { generationTasksTableName } from '../schema';
import type { TaskRow } from './types';

export function selectRuntimeTaskRows(completedLimit: number): TaskRow[] {
  const activeStatuses = [...ACTIVE_GENERATION_STATUSES];
  const activePlaceholders = activeStatuses.map(() => '?').join(', ');
  return getStorageDb()
    .prepare(`
      SELECT id, document_key, kind, status, gallery_path, created_at, updated_at, image_count, batch_item_count
      FROM ${generationTasksTableName}
      WHERE status IN (${activePlaceholders})
         OR id IN (
           SELECT id
           FROM ${generationTasksTableName}
           WHERE status NOT IN (${activePlaceholders})
           ORDER BY created_at DESC
           LIMIT ?
         )
      ORDER BY created_at DESC
    `)
    .all(...activeStatuses, ...activeStatuses, completedLimit) as TaskRow[];
}
