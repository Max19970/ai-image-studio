import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { runStorageMigrations } from './migrations';
import { encryptedBlobTableName, storageDocumentsTableName, storageSchemaVersion } from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', '..', 'data');
function resolveStorageDbPath() {
  return env('IMAGE_STUDIO_DB_PATH', path.join(dataDir, 'image-studio.sqlite'));
}
function resolveStorageKeyPath() {
  return env('IMAGE_STUDIO_STORAGE_KEY_FILE', path.join(dataDir, 'storage.key'));
}
export let storageDbPath = resolveStorageDbPath();
let storageKeyPath = resolveStorageKeyPath();
export const historyBlobKey = 'generation-tasks.v1';
export const generationTaskDocumentBucket = 'generation-task.v2';
export const generationTaskAssetBucket = 'generation-task-asset.v2';
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

let storageDb: DatabaseSync | null = null;
let storageKey: Buffer | null = null;

function env(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getStorageKey(): Buffer {
  if (storageKey) return storageKey;

  const envKey = env('IMAGE_STUDIO_STORAGE_KEY').trim();
  if (envKey) {
    const decoded = Buffer.from(envKey, /^[0-9a-f]{64}$/i.test(envKey) ? 'hex' : 'base64');
    if (decoded.length !== 32) throw new Error('IMAGE_STUDIO_STORAGE_KEY must decode to exactly 32 bytes.');
    storageKey = decoded;
    return storageKey;
  }

  ensureDataDir();
  if (!fs.existsSync(storageKeyPath)) {
    const generated = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(storageKeyPath, generated, { mode: 0o600 });
  }
  const fileKey = fs.readFileSync(storageKeyPath, 'utf8').trim();
  const decoded = Buffer.from(fileKey, 'base64');
  if (decoded.length !== 32) throw new Error(`Storage key at ${storageKeyPath} is invalid.`);
  storageKey = decoded;
  return storageKey;
}

export function getStorageDb(): DatabaseSync {
  const nextStorageDbPath = resolveStorageDbPath();
  if (storageDb && storageDbPath === nextStorageDbPath) return storageDb;
  storageDb?.close();
  storageDbPath = nextStorageDbPath;
  storageKeyPath = resolveStorageKeyPath();
  ensureDataDir();
  storageDb = new DatabaseSync(storageDbPath);
  runStorageMigrations(storageDb);
  return storageDb;
}

export function closeStorageDbForTests() {
  storageDb?.close();
  storageDb = null;
  storageKey = null;
  storageDbPath = resolveStorageDbPath();
  storageKeyPath = resolveStorageKeyPath();
}

function compressJson(value: unknown): Buffer {
  return zlib.brotliCompressSync(Buffer.from(JSON.stringify(value), 'utf8'), {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6
    }
  });
}

function encryptCompressedJson(compressed: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getStorageKey(), iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, encrypted]);
}

function encryptJson(value: unknown): { blob: Buffer; compressedBytes: number; encryptedBytes: number } {
  const compressed = compressJson(value);
  const blob = encryptCompressedJson(compressed);
  return { blob, compressedBytes: compressed.length, encryptedBytes: blob.length };
}

function decryptJson<T>(blob: Buffer, fallback: T): T {
  try {
    if (!blob.length || blob[0] !== 1) return fallback;
    const iv = blob.subarray(1, 13);
    const tag = blob.subarray(13, 29);
    const encrypted = blob.subarray(29);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getStorageKey(), iv);
    decipher.setAuthTag(tag);
    const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const json = zlib.brotliDecompressSync(compressed).toString('utf8');
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('[storage] Failed to decrypt stored payload:', error);
    return fallback;
  }
}

export function saveEncryptedDocument(bucket: string, key: string, value: unknown): EncryptedWriteStats {
  const encrypted = encryptJson(value);
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
  return decryptJson(row.value, fallback);
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
  const encrypted = encryptJson(value);
  getStorageDb()
    .prepare(`INSERT OR REPLACE INTO ${encryptedBlobTableName} (key, value, updated_at, compressed_bytes, encrypted_bytes) VALUES (?, ?, ?, ?, ?)`)
    .run(key, encrypted.blob, Date.now(), encrypted.compressedBytes, encrypted.encryptedBytes);
  return { compressedBytes: encrypted.compressedBytes, encryptedBytes: encrypted.encryptedBytes };
}

export function loadEncryptedBlob<T>(key: string, fallback: T): T {
  const row = getStorageDb().prepare(`SELECT value FROM ${encryptedBlobTableName} WHERE key = ?`).get(key) as { value?: Buffer } | undefined;
  if (!row?.value) return fallback;
  return decryptJson(row.value, fallback);
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
