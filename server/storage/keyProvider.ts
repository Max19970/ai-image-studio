import crypto from 'node:crypto';
import fs from 'node:fs';
import { processEnvReader, type EnvReader } from '../config/env';
import { ensureStorageDataDir, type StoragePathConfig } from './config';

export interface StorageKeyProvider {
  getKey(): Buffer;
  reset(): void;
}

export function createStorageKeyProvider(paths: StoragePathConfig, envReader: EnvReader = processEnvReader): StorageKeyProvider {
  let cachedKey: Buffer | null = null;

  return {
    getKey() {
      if (cachedKey) return cachedKey;

      const envKey = envReader.get('IMAGE_STUDIO_STORAGE_KEY').trim();
      if (envKey) {
        const decoded = Buffer.from(envKey, /^[0-9a-f]{64}$/i.test(envKey) ? 'hex' : 'base64');
        if (decoded.length !== 32) throw new Error('IMAGE_STUDIO_STORAGE_KEY must decode to exactly 32 bytes.');
        cachedKey = decoded;
        return cachedKey;
      }

      ensureStorageDataDir(paths);
      if (!fs.existsSync(paths.keyPath)) {
        const generated = crypto.randomBytes(32).toString('base64');
        fs.writeFileSync(paths.keyPath, generated, { mode: 0o600 });
      }

      const fileKey = fs.readFileSync(paths.keyPath, 'utf8').trim();
      const decoded = Buffer.from(fileKey, 'base64');
      if (decoded.length !== 32) throw new Error(`Storage key at ${paths.keyPath} is invalid.`);
      cachedKey = decoded;
      return cachedKey;
    },
    reset() {
      cachedKey = null;
    }
  };
}
