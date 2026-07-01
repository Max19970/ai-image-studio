import crypto from 'node:crypto';
import zlib from 'node:zlib';
import type { StorageKeyProvider } from './keyProvider';

export interface EncodedJsonDocument {
  blob: Buffer;
  compressedBytes: number;
  encryptedBytes: number;
}

export interface EncryptedJsonCodec {
  encode(value: unknown): EncodedJsonDocument;
  decode<T>(blob: Buffer, fallback: T): T;
}

export function createEncryptedJsonCodec(keyProvider: StorageKeyProvider): EncryptedJsonCodec {
  return {
    encode(value) {
      const compressed = compressJson(value);
      const blob = encryptCompressedJson(compressed, keyProvider.getKey());
      return { blob, compressedBytes: compressed.length, encryptedBytes: blob.length };
    },
    decode<T>(blob: Buffer, fallback: T) {
      try {
        if (!blob.length || blob[0] !== 1) return fallback;
        const json = decryptCompressedJson(blob, keyProvider.getKey());
        return JSON.parse(json) as T;
      } catch (error) {
        console.warn('[storage] Failed to decrypt stored payload:', error);
        return fallback;
      }
    }
  };
}

function compressJson(value: unknown): Buffer {
  return zlib.brotliCompressSync(Buffer.from(JSON.stringify(value), 'utf8'), {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6
    }
  });
}

function encryptCompressedJson(compressed: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, encrypted]);
}

function decryptCompressedJson(blob: Buffer, key: Buffer): string {
  const iv = blob.subarray(1, 13);
  const tag = blob.subarray(13, 29);
  const encrypted = blob.subarray(29);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return zlib.brotliDecompressSync(compressed).toString('utf8');
}
