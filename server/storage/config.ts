import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processEnvReader, type EnvReader } from '../config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoragePathConfig {
  dataDir: string;
  dbPath: string;
  keyPath: string;
}

export const defaultStorageDataDir = path.resolve(__dirname, '..', '..', 'data');

export function resolveStoragePathConfig(envReader: EnvReader = processEnvReader): StoragePathConfig {
  const dataDir = defaultStorageDataDir;
  return {
    dataDir,
    dbPath: envReader.get('IMAGE_STUDIO_DB_PATH', path.join(dataDir, 'image-studio.sqlite')),
    keyPath: envReader.get('IMAGE_STUDIO_STORAGE_KEY_FILE', path.join(dataDir, 'storage.key'))
  };
}

export function ensureStorageDataDir(paths: StoragePathConfig) {
  fs.mkdirSync(paths.dataDir, { recursive: true });
}
