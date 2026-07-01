import {
  deleteEncryptedDocument,
  getEncryptedDocumentStats,
  loadEncryptedDocument,
  saveEncryptedDocument,
  storageBackend,
  storageDbPath
} from './encryptedStore';
import { storageSchemaVersion } from './schema';
import { appDocumentBuckets, currentDocumentKey } from './appDocumentDescriptors';
export { appDocumentBuckets, currentDocumentKey, listAppDocumentRouteDescriptors } from './appDocumentDescriptors';

export const studioSettingsBucket = appDocumentBuckets.studioSettings.bucket;
export const imageParamsBucket = appDocumentBuckets.imageParams.bucket;
export const providerProbeCacheBucket = appDocumentBuckets.providerProbeCache.bucket;
export const requestPresetsBucket = appDocumentBuckets.requestPresets.bucket;
export const integrationSettingsBucket = appDocumentBuckets.integrationSettings.bucket;

export interface AppDocumentStorageStats {
  backend: string;
  schemaVersion: number;
  dbPath: string;
  bucket: string;
  key: string;
  updatedAt: number | null;
  compressedBytes: number;
  encryptedBytes: number;
}

export function loadAppDocument<T>(bucket: string, key: string, fallback: T): { value: T; storage: AppDocumentStorageStats } {
  return {
    value: loadEncryptedDocument<T>(bucket, key, fallback),
    storage: getAppDocumentStats(bucket, key)
  };
}

export function saveAppDocument(bucket: string, key: string, value: unknown): AppDocumentStorageStats {
  saveEncryptedDocument(bucket, key, value);
  return getAppDocumentStats(bucket, key);
}

export function deleteAppDocument(bucket: string, key: string): AppDocumentStorageStats {
  deleteEncryptedDocument(bucket, key);
  return getAppDocumentStats(bucket, key);
}

export function getAppDocumentStats(bucket: string, key: string): AppDocumentStorageStats {
  const stats = getEncryptedDocumentStats(bucket, key);
  return {
    backend: storageBackend,
    schemaVersion: storageSchemaVersion,
    dbPath: storageDbPath,
    bucket,
    key,
    updatedAt: stats.updatedAt,
    compressedBytes: stats.compressedBytes,
    encryptedBytes: stats.encryptedBytes
  };
}
