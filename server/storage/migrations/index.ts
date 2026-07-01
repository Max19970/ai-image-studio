import type { DatabaseSync } from 'node:sqlite';
import { createStorageMigrationsTableSql, storageMigrationsTableName, storagePragmasSql } from '../schema';
import { listStorageMigrations } from './registry';

function hasMigration(db: DatabaseSync, id: string): boolean {
  const row = db.prepare(`SELECT id FROM ${storageMigrationsTableName} WHERE id = ?`).get(id) as { id?: string } | undefined;
  return row?.id === id;
}

function markMigration(db: DatabaseSync, id: string) {
  db.prepare(`INSERT INTO ${storageMigrationsTableName} (id, applied_at) VALUES (?, ?)`).run(id, Date.now());
}

export function runStorageMigrations(db: DatabaseSync) {
  db.exec(storagePragmasSql);
  db.exec(createStorageMigrationsTableSql);

  for (const migration of listStorageMigrations()) {
    if (hasMigration(db, migration.id)) continue;
    db.exec('BEGIN');
    try {
      migration.up(db);
      markMigration(db, migration.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
