import { DatabaseSync } from 'node:sqlite';
import { ensureStorageDataDir, type StoragePathConfig } from './config';
import { runStorageMigrations } from './migrations';

export interface StorageDatabaseConnectionFactory {
  open(paths: StoragePathConfig): DatabaseSync;
}

export const sqliteStorageConnectionFactory: StorageDatabaseConnectionFactory = {
  open(paths) {
    ensureStorageDataDir(paths);
    const db = new DatabaseSync(paths.dbPath);
    runStorageMigrations(db);
    return db;
  }
};
