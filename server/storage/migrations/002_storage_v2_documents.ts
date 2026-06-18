import type { DatabaseSync } from 'node:sqlite';
import {
  createGenerationTaskAssetsTableSql,
  createGenerationTaskIndexesSql,
  createGenerationTasksTableSql,
  createStorageDocumentsTableSql
} from '../schema';

export const storageV2DocumentsMigration = {
  id: '002_storage_v2_documents',
  up(db: DatabaseSync) {
    db.exec(createStorageDocumentsTableSql);
    db.exec(createGenerationTasksTableSql);
    db.exec(createGenerationTaskAssetsTableSql);
    db.exec(createGenerationTaskIndexesSql);
  }
};
