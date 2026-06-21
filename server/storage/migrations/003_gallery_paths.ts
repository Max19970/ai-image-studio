import type { DatabaseSync } from 'node:sqlite';
import { generationTasksTableName } from '../schema';

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === column);
}

export const galleryPathsMigration = {
  id: '003_gallery_paths',
  up(db: DatabaseSync) {
    if (!hasColumn(db, generationTasksTableName, 'gallery_path')) {
      db.exec(`ALTER TABLE ${generationTasksTableName} ADD COLUMN gallery_path TEXT NOT NULL DEFAULT '/'`);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_generation_tasks_gallery_path ON ${generationTasksTableName}(gallery_path, created_at DESC)`);
  }
};
