export const storageSchemaVersion = 2;

export const encryptedBlobTableName = 'encrypted_blobs';
export const storageMigrationsTableName = 'storage_migrations';
export const storageDocumentsTableName = 'storage_documents';
export const generationTasksTableName = 'generation_tasks';
export const generationTaskAssetsTableName = 'generation_task_assets';

export const storagePragmasSql = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
`;

export const createStorageMigrationsTableSql = `
  CREATE TABLE IF NOT EXISTS ${storageMigrationsTableName} (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );
`;

export const createEncryptedBlobsTableSql = `
  CREATE TABLE IF NOT EXISTS ${encryptedBlobTableName} (
    key TEXT PRIMARY KEY,
    value BLOB NOT NULL,
    updated_at INTEGER NOT NULL,
    compressed_bytes INTEGER NOT NULL,
    encrypted_bytes INTEGER NOT NULL
  );
`;

export const createStorageDocumentsTableSql = `
  CREATE TABLE IF NOT EXISTS ${storageDocumentsTableName} (
    bucket TEXT NOT NULL,
    key TEXT NOT NULL,
    value BLOB NOT NULL,
    updated_at INTEGER NOT NULL,
    compressed_bytes INTEGER NOT NULL,
    encrypted_bytes INTEGER NOT NULL,
    PRIMARY KEY (bucket, key)
  );
`;

export const createGenerationTasksTableSql = `
  CREATE TABLE IF NOT EXISTS ${generationTasksTableName} (
    id TEXT PRIMARY KEY,
    document_key TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    image_count INTEGER NOT NULL DEFAULT 0,
    batch_item_count INTEGER NOT NULL DEFAULT 0
  );
`;

export const createGenerationTaskAssetsTableSql = `
  CREATE TABLE IF NOT EXISTS ${generationTaskAssetsTableName} (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    batch_item_id TEXT,
    document_key TEXT NOT NULL,
    image_id TEXT NOT NULL,
    image_index INTEGER NOT NULL,
    kind TEXT NOT NULL,
    format TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    bytes INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES ${generationTasksTableName}(id) ON DELETE CASCADE
  );
`;

export const createGenerationTaskIndexesSql = `
  CREATE INDEX IF NOT EXISTS idx_generation_tasks_updated_at ON ${generationTasksTableName}(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_generation_task_assets_task_id ON ${generationTaskAssetsTableName}(task_id, image_index ASC);
`;
