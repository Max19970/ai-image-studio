import type { DatabaseSync } from 'node:sqlite';
import { processEnvReader } from '../config/env';
import { resolveStoragePathConfig, type StoragePathConfig } from './config';
import { createEncryptedJsonCodec, type EncryptedJsonCodec } from './jsonCodec';
import { createStorageKeyProvider, type StorageKeyProvider } from './keyProvider';
import { encryptedBlobTableName, storageDocumentsTableName, storageSchemaVersion } from './schema';
import { sqliteStorageConnectionFactory, type StorageDatabaseConnectionFactory } from './sqliteConnection';

let storagePaths = resolveStoragePathConfig();
export let storageDbPath = storagePaths.dbPath;
export const historyBlobKey = 'generation-tasks.v1';
export const generationTaskDocumentBucket = 'generation-task.v2';
export const generationTaskAssetBucket = 'generation-task-asset.v2';
export const generationGalleryFolderBucket = 'gallery-folder.v1';
export const generationGalleryFavoriteBucket = 'gallery-favorite.v1';
export const generationGalleryPinBucket = 'gallery-pin.v1';
export const generationGalleryTagBucket = 'gallery-tag.v1';
export const storageBackend = 'sqlite-aes-gcm-brotli-v2';

export interface EncryptedWriteStats {
  compressedBytes: number;
  encryptedBytes: number;
}

export interface EncryptedDocumentStats extends EncryptedWriteStats {
  backend: string;
  schemaVersion: number;
  dbPath: string;
  updatedAt: number | null;
}

interface StorageRuntimeContext {
  paths: StoragePathConfig;
  db: DatabaseSync | null;
  keyProvider: StorageKeyProvider;
  codec: EncryptedJsonCodec;
  connectionFactory: StorageDatabaseConnectionFactory;
}

function createStorageRuntimeContext(paths: StoragePathConfig): StorageRuntimeContext {
  const keyProvider = createStorageKeyProvider(paths, processEnvReader);
  return {
    paths,
    db: null,
    keyProvider,
    codec: createEncryptedJsonCodec(keyProvider),
    connectionFactory: sqliteStorageConnectionFactory
  };
}

let storageContext = createStorageRuntimeContext(storagePaths);

function resolveCurrentStoragePaths(): StoragePathConfig {
  return resolveStoragePathConfig(processEnvReader);
}

function replaceStorageContext(paths: StoragePathConfig) {
  storageContext.db?.close();
  storagePaths = paths;
  storageDbPath = paths.dbPath;
  storageContext = createStorageRuntimeContext(paths);
}

export function getStorageDb(): DatabaseSync {
  const nextPaths = resolveCurrentStoragePaths();
  if (storageContext.db && storageContext.paths.dbPath === nextPaths.dbPath && storageContext.paths.keyPath === nextPaths.keyPath) {
    return storageContext.db;
  }
  if (storageContext.paths.dbPath !== nextPaths.dbPath || storageContext.paths.keyPath !== nextPaths.keyPath) {
    replaceStorageContext(nextPaths);
  }
  storageContext.db = storageContext.connectionFactory.open(storageContext.paths);
  storageDbPath = storageContext.paths.dbPath;
  return storageContext.db;
}

export function closeStorageDbForTests() {
  storageContext.db?.close();
  storageContext.db = null;
  storageContext.keyProvider.reset();
  replaceStorageContext(resolveCurrentStoragePaths());
}

export function saveEncryptedDocument(bucket: string, key: string, value: unknown): EncryptedWriteStats {
  const encrypted = storageContext.codec.encode(value);
  getStorageDb()
    .prepare(`INSERT OR REPLACE INTO ${storageDocumentsTableName} (bucket, key, value, updated_at, compressed_bytes, encrypted_bytes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(bucket, key, encrypted.blob, Date.now(), encrypted.compressedBytes, encrypted.encryptedBytes);
  return { compressedBytes: encrypted.compressedBytes, encryptedBytes: encrypted.encryptedBytes };
}

export function loadEncryptedDocument<T>(bucket: string, key: string, fallback: T): T {
  const row = getStorageDb()
    .prepare(`SELECT value FROM ${storageDocumentsTableName} WHERE bucket = ? AND key = ?`)
    .get(bucket, key) as { value?: Buffer } | undefined;
  if (!row?.value) return fallback;
  return storageContext.codec.decode(row.value, fallback);
}

export function deleteEncryptedDocument(bucket: string, key: string) {
  getStorageDb()
    .prepare(`DELETE FROM ${storageDocumentsTableName} WHERE bucket = ? AND key = ?`)
    .run(bucket, key);
}

export function deleteEncryptedBucket(bucket: string) {
  getStorageDb()
    .prepare(`DELETE FROM ${storageDocumentsTableName} WHERE bucket = ?`)
    .run(bucket);
}

export function getEncryptedDocumentStats(bucket: string, key: string): EncryptedDocumentStats {
  const row = getStorageDb()
    .prepare(`SELECT updated_at, compressed_bytes, encrypted_bytes FROM ${storageDocumentsTableName} WHERE bucket = ? AND key = ?`)
    .get(bucket, key) as { updated_at?: number; compressed_bytes?: number; encrypted_bytes?: number } | undefined;
  return {
    backend: storageBackend,
    schemaVersion: storageSchemaVersion,
    dbPath: storageDbPath,
    updatedAt: row?.updated_at ?? null,
    compressedBytes: row?.compressed_bytes ?? 0,
    encryptedBytes: row?.encrypted_bytes ?? 0
  };
}

export function saveEncryptedBlob(key: string, value: unknown) {
  const encrypted = storageContext.codec.encode(value);
  getStorageDb()
    .prepare(`INSERT OR REPLACE INTO ${encryptedBlobTableName} (key, value, updated_at, compressed_bytes, encrypted_bytes) VALUES (?, ?, ?, ?, ?)`)
    .run(key, encrypted.blob, Date.now(), encrypted.compressedBytes, encrypted.encryptedBytes);
  return { compressedBytes: encrypted.compressedBytes, encryptedBytes: encrypted.encryptedBytes };
}

export function loadEncryptedBlob<T>(key: string, fallback: T): T {
  const row = getStorageDb().prepare(`SELECT value FROM ${encryptedBlobTableName} WHERE key = ?`).get(key) as { value?: Buffer } | undefined;
  if (!row?.value) return fallback;
  return storageContext.codec.decode(row.value, fallback);
}

export function getEncryptedBlobStats(key: string): EncryptedDocumentStats {
  const row = getStorageDb().prepare(`SELECT updated_at, compressed_bytes, encrypted_bytes FROM ${encryptedBlobTableName} WHERE key = ?`).get(key) as { updated_at?: number; compressed_bytes?: number; encrypted_bytes?: number } | undefined;
  return {
    backend: storageBackend,
    schemaVersion: storageSchemaVersion,
    dbPath: storageDbPath,
    updatedAt: row?.updated_at ?? null,
    compressedBytes: row?.compressed_bytes ?? 0,
    encryptedBytes: row?.encrypted_bytes ?? 0
  };
}
